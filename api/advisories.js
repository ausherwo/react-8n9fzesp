// /api/advisories.js — v3.0
// Merged: Cisco PSIRT openVuln API + EoX API + Supabase auth gate + licence quota tracking
// Vercel serverless function

const CISCO_TOKEN_URL  = "https://id.cisco.com/oauth2/default/v1/token";
const CISCO_PSIRT_BASE = "https://apix.cisco.com/security/advisories";
const CISCO_EOX_BASE   = "https://apix.cisco.com/supporttools/eox/rest/5";

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────
// PID NORMALISATION
// Converts user-friendly platform names to Cisco PIDs for EoX API queries
// e.g. "Nexus 9336C-FX2" → "N9K-C9336C-FX2"
// ─────────────────────────────────────────────
function normaliseToPID(platformName) {
  if (!platformName) return null;
  const upper = platformName.toUpperCase().trim();

  if (/^N[0-9]K-[A-Z0-9]/.test(upper) || upper.startsWith("APIC-")) {
    return upper;
  }

  if (upper.includes("APIC")) {
    return upper.replace(/^CISCO\s+/, "").trim();
  }

  let model = upper
    .replace(/^CISCO\s+/, "")
    .replace(/^NEXUS\s+/, "")
    .replace(/^CATALYST\s+/, "")
    .replace(/^MDS\s+/, "")
    .trim();

  if (/^9[2356789]\d{2}/.test(model)) return `N9K-C${model}`;
  if (/^7[0-9]\d{2}/.test(model))     return `N7K-C${model}`;
  if (/^5[456]\d{2}/.test(model))     return `N5K-C${model}`;
  if (/^3[0-9]\d{2}/.test(model))     return `N3K-C${model}`;

  if (/^9\d{3}/.test(model) && platformName.toUpperCase().includes("MDS")) {
    return `DS-C${model}`;
  }

  return null;
}

// ─────────────────────────────────────────────
// ACI / NX-OS VERSION MAPPING
// APIC versions use ACI release numbering (e.g. 6.1(5e))
// ACI-managed switches run NX-OS with major version + 10 (e.g. 16.1(5e))
// ─────────────────────────────────────────────
function mapApicVersionToNxos(apicVersion) {
    if (!apicVersion) return null;
  
    // Match versions like 6.1(5e), 16.1(5e), 5.2(8e), 15.2(8e)
    const match = apicVersion.match(/^(\d+)([\.\(].+)$/);
    if (!match) return null;
  
    const major = parseInt(match[1], 10);
    const rest  = match[2];
  
    // Validate major version is in a sensible range
    // ACI releases: 4.x, 5.x, 6.x, 7.x (controller versions)
    // NX-OS ACI:   14.x, 15.x, 16.x, 17.x (switch versions = ACI major + 10)
    // NX-OS standalone: 7.x, 8.x, 9.x, 10.x (not ACI-managed)
  
    if (major >= 10 && major <= 19) {
      // Already a valid NX-OS ACI version (14.x–19.x) — return as-is
      // This handles the case where the switch version was explicitly provided
      return apicVersion;
    }
  
    if (major >= 4 && major <= 9) {
      // Valid ACI controller version — add 10 to get NX-OS version
      return `${major + 10}${rest}`;
    }
  
    // Outside expected range — log and return null so the caller
    // can skip the PSIRT query rather than sending a garbage version
    console.warn(`mapApicVersionToNxos: unexpected major version ${major} in "${apicVersion}" — skipping remap`);
    return null;
  }

// ─────────────────────────────────────────────
// PLATFORM CONFIG
// Maps platform name to { family, endpoint } for PSIRT API routing
// ─────────────────────────────────────────────
function getPlatformConfig(platformName, version = "", isAciSwitch = false) {
    if (!platformName) return null;
    const upper = platformName.toUpperCase();
  
    // ── APIC — always ACI endpoint
    if (upper.includes("APIC")) {
      return { family: "ACI", endpoint: "aci" };
    }
  
    // ── Nexus 9000 series only — version-based ACI vs NX-OS detection
    const isNexus9k = (
      upper.includes("NEXUS 9") ||
      upper.includes("N9K-") ||
      upper.includes("N9K ") ||
      /^N9[0-9]{2,}/.test(upper)
    );
  
    if (isNexus9k) {
      const majorVersion = parseInt((version || "").match(/^(\d+)/)?.[1] || "0", 10);
  
      // ACI versioning: controller 4.x–9.x maps to switch 14.x–19.x
      // If version is in ACI switch range (14–19) or ACI controller range (4–9)
      // AND isAciSwitch flag is set → use aci endpoint
      const isAciVersion = (majorVersion >= 4 && majorVersion <= 9)   // ACI controller version
                        || (majorVersion >= 14 && majorVersion <= 19); // ACI NX-OS switch version
  
      if (isAciSwitch && isAciVersion) {
        return { family: "ACI", endpoint: "aci" };
      }
  
      // Standalone NX-OS — 7.x, 8.x, 9.x, 10.x without ACI flag
      // or any version where isAciSwitch is false
      return { family: "NX-OS", endpoint: "nxos" };
    }
  
    // ── Non-9k Nexus — always standalone NX-OS
    if (
      upper.includes("NEXUS 7") || upper.includes("N7K") ||
      upper.includes("NEXUS 5") || upper.includes("N5K") ||
      upper.includes("NEXUS 3") || upper.includes("N3K") ||
      upper.includes("MDS")
    ) {
      return { family: "NX-OS", endpoint: "nxos" };
    }
  
    // ── IOS XE
    if (upper.includes("CATALYST 9") || upper.includes("ASR") || upper.includes("ISR")) {
      return { family: "IOS XE", endpoint: "iosxe" };
    }
  
    // ── Classic IOS
    if (upper.includes("CATALYST 6")) {
      return { family: "IOS", endpoint: "ios" };
    }
  
    // ── Firepower / FTD
    if (upper.includes("FIREPOWER") || upper.includes("FTD")) {
      return { family: "FTD", endpoint: "ftd" };
    }
  
    return null;
  }

// ─────────────────────────────────────────────
// OAUTH TOKEN — Cisco API
// ─────────────────────────────────────────────
async function getAccessToken() {
  const clientId     = process.env.CISCO_CLIENT_ID;
  const clientSecret = process.env.CISCO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("CISCO_CLIENT_ID and CISCO_CLIENT_SECRET environment variables are required");
  }

  const body = new URLSearchParams();
  body.append("grant_type",    "client_credentials");
  body.append("client_id",     clientId);
  body.append("client_secret", clientSecret);

  const response = await fetch(CISCO_TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token request failed: ${response.status} ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ─────────────────────────────────────────────
// PSIRT ADVISORY FETCH
// ─────────────────────────────────────────────
async function fetchAdvisories(token, platformConfig, version) {
  const url = `${CISCO_PSIRT_BASE}/${platformConfig.endpoint}?version=${encodeURIComponent(version)}`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept":        "application/json",
    },
  });

  if (response.status === 404) return [];
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PSIRT API error: ${response.status} ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.advisories || [];
}

// ─────────────────────────────────────────────
// EOX (END OF LIFE) FETCH
// ─────────────────────────────────────────────
async function fetchEoX(token, pid) {
  const url = `${CISCO_EOX_BASE}/EOXByProductID/5/${encodeURIComponent(pid)}?responseencoding=json`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept":        "application/json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EoX API error: ${response.status} ${text.slice(0, 200)}`);
  }

  const data   = await response.json();
  const record = data?.EOXRecord?.[0];
  if (!record) return null;

  return {
    endOfSaleDate:            record.EndOfSaleDate?.value                    || null,
    endOfSwMaintenanceDate:   record.EndOfSWMaintenanceReleases?.value       || null,
    endOfSecuritySupportDate: record.EndOfSecurityVulSupportDate?.value      || null,
    endOfSupportDate:         record.LastDateOfSupport?.value                || null,
    migrationProduct:         record.EOXMigrationDetails?.MigrationProductName || null,
    migrationProductPID:      record.EOXMigrationDetails?.MigrationProductId   || null,
    bulletinURL:              record.LinkToProductBulletinURL                || null,
  };
}

// ─────────────────────────────────────────────
// ANTHROPIC ANALYSIS
// Runs the fabric risk assessment against the full device list
// ─────────────────────────────────────────────
async function runFabricAnalysis(devices, preflightStatus) {
  const anthropic = new Anthropic({
    apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
  });

  const deviceList = devices.map(d =>
    `- ${d.name} | ${d.platform} | ${d.version} | ${d.role}`
  ).join('\n');

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role:    'user',
      content: `You are a Cisco data centre network expert. Analyse this device inventory and return a JSON risk assessment.

DEVICE INVENTORY:
${deviceList}

PRE-FLIGHT STATUS: ${preflightStatus}

Return ONLY valid JSON matching this exact structure — no markdown, no explanation:

{
  "priorityAssessment": {
    "items": [
      {"priority": "P1", "title": "...", "reason": "...", "devices": ["..."]}
    ]
  },
  "fabricAnalysis": {
    "risk": "LOW|MEDIUM|HIGH",
    "consistent": false,
    "mismatches": [],
    "missingVersions": [],
    "findings": []
  },
  "netwrkrIntel": {
    "hasIntel": true,
    "summary": "...",
    "items": [{"platform":"","version":"","title":"","detail":"","id":"","verified":false,"sev":"MEDIUM"}]
  },
  "devices": [{"name":"","ver":"","role":"","tier":1,"fabricRisk":"LOW","intelRisk":"LOW","rec":""}]
}

RULES:
- priorityAssessment always has exactly 3 items: P1, P2, P3
- fabricAnalysis contains ONLY facts from the submitted inventory — no AI knowledge
- All fabricAnalysis findings labelled [observed] or [inferred]
- fabricRisk is LOW unless version mismatches exist
- netwrkrIntel is AI training knowledge — always unverified, max severity HIGH never CRITICAL
- Every device must appear in devices array sorted by tier (Controllers→Spine→Border Leaf→Leaf→Distribution/Firewall)
- Tier 4 devices (Distribution, Firewall): cap intelRisk at MEDIUM
- Border leaf with external peering: intelRisk minimum HIGH
- Recommendation wording must be cautious: use "Priority review recommended" not "Upgrade immediately"
- Controllers always first in devices array`
    }]
  });

  const raw = message.content[0].text;
  return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "method_not_allowed" });

  // ─────────────────────────────────────────────
  // 1. VERIFY JWT
  // ─────────────────────────────────────────────
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'unauthorised' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'unauthorised' });

  const { data: member } = await supabase
    .from('members')
    .select('id, org_id, role, mfa_grace_started_at')
    .eq('user_id', user.id)
    .single();

  if (!member) return res.status(401).json({ error: 'unauthorised' });

  // ─────────────────────────────────────────────
  // 2. ROLE CHECK
  // ─────────────────────────────────────────────
  if (member.role === 'viewer') {
    return res.status(403).json({ error: 'insufficient_role' });
  }

  // ─────────────────────────────────────────────
  // 3. LICENCE CHECK
  // ─────────────────────────────────────────────
  const { data: licence } = await supabase
    .from('licences')
    .select('plan, status, analyses_used, analyses_limit, current_period_end')
    .eq('org_id', member.org_id)
    .single();

  if (!licence || licence.status !== 'active') {
    return res.status(402).json({ error: 'no_active_licence', status: licence?.status });
  }

  if (licence.analyses_used >= licence.analyses_limit) {
    return res.status(402).json({
      error:             'limit_reached',
      used:              licence.analyses_used,
      limit:             licence.analyses_limit,
      plan:              licence.plan,
      upgradeAvailable:  licence.plan === 'free',
    });
  }

  // ─────────────────────────────────────────────
  // 4. MFA CHECK (Pro / Enterprise)
  // ─────────────────────────────────────────────
  if (licence.plan === 'pro' || licence.plan === 'enterprise') {
    const { count: passkeyCount } = await supabase
      .from('passkey_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id);

    if (passkeyCount === 0) {
      const gracePeriodMs = 30 * 24 * 60 * 60 * 1000;
      const graceStart    = member.mfa_grace_started_at ? new Date(member.mfa_grace_started_at) : null;
      const graceElapsed  = graceStart ? (Date.now() - graceStart.getTime()) > gracePeriodMs : false;

      if (graceElapsed) return res.status(403).json({ error: 'mfa_required' });
      res.setHeader('X-MFA-Grace-Warning', 'true');
    }
  }

  // ─────────────────────────────────────────────
  // 5. VALIDATE REQUEST BODY
  // Two modes:
  //   A) Full fabric analysis — { devices[], preflightStatus }
  //   B) Single device PSIRT lookup — { platform, version, isAciSwitch }
  // ─────────────────────────────────────────────
  const {
    // Mode A — fabric analysis
    devices,
    preflightStatus,
    sourceFileId = null,
    // Mode B — single device PSIRT/EoX lookup
    platform,
    version,
    isAciSwitch = false,
  } = req.body;

  // ─────────────────────────────────────────────
  // MODE B — Single device PSIRT + EoX lookup
  // Used for per-device intel enrichment after fabric analysis
  // ─────────────────────────────────────────────
  if (platform && version && !devices) {
    //const platformConfig = getPlatformConfig(platform);
    const platformConfig = getPlatformConfig(platform, version, isAciSwitch);

    if (!platformConfig) {
      return res.status(200).json({
        advisories: [],
        eol:        null,
        verified:   false,
        message:    `No platform mapping for: ${platform}`,
      });
    }

    let queryVersion = version;
    if (isAciSwitch && platformConfig.family === "NX-OS") {
      const remapped = mapApicVersionToNxos(version);
      if (remapped) queryVersion = remapped;
    }

    const pid = normaliseToPID(platform);

    try {
      const ciscoToken = await getAccessToken();

      const [rawAdvisories, eolData] = await Promise.allSettled([
        fetchAdvisories(ciscoToken, platformConfig, queryVersion),
        pid ? fetchEoX(ciscoToken, pid) : Promise.resolve(null),
      ]);

      const advisories = (rawAdvisories.status === "fulfilled" ? rawAdvisories.value : []).map(a => ({
        id:         a.advisoryId || a.identifier || "",
        title:      a.advisoryTitle || a.title || "",
        impact:     a.sir || a.impact || "Unknown",
        published:  a.firstPublished || "",
        url:        a.publicationUrl || a.url || "",
        firstFixed: Array.isArray(a.firstFixed) ? a.firstFixed[0] : (a.firstFixed || ""),
        cvssScore:  a.cvssBaseScore || "",
        cveId:      Array.isArray(a.cves) ? a.cves[0] : (a.cves || ""),
      }));

      const eol      = eolData.status === "fulfilled" ? eolData.value : null;
      const warnings = [];

      if (!pid)                              warnings.push(`Could not determine PID for "${platform}" — EoL check skipped.`);
      if (rawAdvisories.status === "rejected") warnings.push(`Advisory lookup failed: ${rawAdvisories.reason?.message}`);
      if (eolData.status === "rejected")       warnings.push(`EoL lookup failed: ${eolData.reason?.message}`);

      return res.status(200).json({
        advisories,
        eol,
        pid:          pid || null,
        platform,
        version,
        queryVersion,
        family:       platformConfig.family,
        verified:     true,
        warnings:     warnings.length > 0 ? warnings : undefined,
      });

    } catch (err) {
      console.error("PSIRT lookup error:", err.message);
      return res.status(200).json({
        advisories: [],
        eol:        null,
        verified:   false,
        message:    err.message,
      });
    }
  }

  // ─────────────────────────────────────────────
  // MODE A — Full fabric analysis
  // ─────────────────────────────────────────────
  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    return res.status(400).json({ error: 'invalid_request', detail: 'devices array required' });
  }

  const validPreflight = ['clear', 'warning', 'blocked'];
  if (!validPreflight.includes(preflightStatus)) {
    return res.status(400).json({ error: 'invalid_request', detail: 'invalid preflightStatus' });
  }

  if (preflightStatus === 'blocked') {
    return res.status(422).json({ error: 'preflight_blocked' });
  }

  // Run Anthropic fabric analysis
  let analysisResult;
  try {
    analysisResult = await runFabricAnalysis(devices, preflightStatus);
  } catch (err) {
    console.error('Anthropic API error:', err);
    return res.status(502).json({ error: 'upstream_error' });
  }

  // Write audit record + increment counter
  try {
    const { data: analysis } = await supabase
      .from('analyses')
      .insert({
        org_id:           member.org_id,
        run_by:           member.id,
        device_count:     devices.length,
        preflight_status: preflightStatus,
        result_json:      analysisResult,
        source_file_id:   sourceFileId,
      })
      .select('id')
      .single();

    await supabase.rpc('increment_analyses_used', { p_org_id: member.org_id });

    return res.status(200).json({
      ...analysisResult,
      _meta: {
        analysisId: analysis?.id || null,
        used:       licence.analyses_used + 1,
        limit:      licence.analyses_limit,
        plan:       licence.plan,
        remaining:  licence.analyses_limit - (licence.analyses_used + 1),
      },
    });

  } catch (err) {
    console.error('Post-analysis write error:', err);
    // Return the result even if the audit write fails — don't lose the engineer's work
    return res.status(200).json({
      ...analysisResult,
      _meta: { error: 'audit_write_failed' },
    });
  }
}