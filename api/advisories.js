// api/advisories.js
// Vercel serverless function — Cisco PSIRT openVuln API + fabric analysis
// v3.0 — consolidated analysis prompt, system/user split, P2 priority fix

const { createClient } = require('@supabase/supabase-js');

const CISCO_TOKEN_URL  = "https://id.cisco.com/oauth2/default/v1/token";
const CISCO_PSIRT_BASE = "https://apix.cisco.com/security/advisories";
const CISCO_EOX_BASE   = "https://apix.cisco.com/supporttools/eox/rest/5";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────
// PID NORMALISATION
// ─────────────────────────────────────────────
function normaliseToPID(platformName) {
  if (!platformName) return null;
  const upper = platformName.toUpperCase().trim();
  if (/^N[0-9]K-[A-Z0-9]/.test(upper) || upper.startsWith("APIC-")) return upper;
  if (upper.includes("APIC")) return upper.replace(/^CISCO\s+/, "").trim();

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
  if (/^9\d{3}/.test(model) && platformName.toUpperCase().includes("MDS")) return `DS-C${model}`;

  return null;
}

// ─────────────────────────────────────────────
// ACI / NX-OS VERSION MAPPING
// ─────────────────────────────────────────────
function mapApicVersionToNxos(apicVersion) {
  if (!apicVersion) return null;
  const match = apicVersion.match(/^(\d+)([\.\(].+)$/);
  if (!match) return null;
  const major = parseInt(match[1], 10);
  const rest  = match[2];
  return `${major + 10}${rest}`;
}

// ─────────────────────────────────────────────
// PLATFORM CONFIG
// ─────────────────────────────────────────────
function getPlatformConfig(platformName) {
  if (!platformName) return null;
  const upper = platformName.toUpperCase();
  if (upper.includes("APIC"))                                                          return { family: "ACI",    endpoint: "aci"   };
  if (upper.includes("NEXUS 9") || upper.includes("NEXUS 7") ||
      upper.includes("NEXUS 5") || upper.includes("NEXUS 3") || upper.includes("MDS")) return { family: "NX-OS",  endpoint: "nxos"  };
  if (upper.includes("CATALYST 9") || upper.includes("ASR") || upper.includes("ISR")) return { family: "IOS XE", endpoint: "iosxe" };
  if (upper.includes("CATALYST 6"))                                                    return { family: "IOS",    endpoint: "ios"   };
  if (upper.includes("FIREPOWER") || upper.includes("FTD"))                            return { family: "FTD",    endpoint: "ftd"   };
  return null;
}

// ─────────────────────────────────────────────
// OAUTH TOKEN
// ─────────────────────────────────────────────
async function getAccessToken() {
  const clientId     = process.env.CISCO_CLIENT_ID;
  const clientSecret = process.env.CISCO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("CISCO_CLIENT_ID and CISCO_CLIENT_SECRET are required");

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
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
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
// EOX FETCH
// ─────────────────────────────────────────────
async function fetchEoX(token, pid) {
  const url = `${CISCO_EOX_BASE}/EOXByProductID/1/${encodeURIComponent(pid)}?responseencoding=json`;
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
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
    endOfSaleDate:            record.EndOfSaleDate?.value || null,
    endOfSwMaintenanceDate:   record.EndOfSWMaintenanceReleases?.value || null,
    endOfSecuritySupportDate: record.EndOfSecurityVulSupportDate?.value || null,
    endOfSupportDate:         record.LastDateOfSupport?.value || null,
    migrationProduct:         record.EOXMigrationDetails?.MigrationProductName || null,
    migrationProductPID:      record.EOXMigrationDetails?.MigrationProductId || null,
    bulletinURL:              record.LinkToProductBulletinURL || null,
  };
}

// ─────────────────────────────────────────────
// ANALYSIS SYSTEM PROMPT
// Single source of truth for all fabric analysis logic.
// Updated: P2 priority fix — observed structural findings always outrank advisory findings.
// ─────────────────────────────────────────────
function buildAnalysisSystemPrompt(aciFabric) {
  return `You are netwrkr.ai, an expert Cisco data centre network engineer.

ABSOLUTE RULES:
1. ONLY report bug findings for devices where a version is EXPLICITLY provided. If ver is "not provided" set bugs to [].
2. NEVER infer or guess software versions from platform names or roles.
3. Version mismatches can ONLY be reported when multiple devices of the same type show DIFFERENT explicit versions.
4. Every finding must end with [observed], [inferred], or [assumed].
5. [observed] = directly from the data. [inferred] = logical conclusion. [assumed] = no evidence, low confidence only.
6. CRITICAL or HIGH severity requires explicit version evidence. No version = maximum MEDIUM risk.
7. If any device has ver="not provided", include this finding: "Software version not provided for X device(s) — bug and CVE analysis unavailable for those devices [observed]"
8. NEVER add devices that are not in the submitted inventory. The devices array must contain EXACTLY the same devices as the submitted inventory — no additions, no omissions.
9. Sort devices in the output by infrastructure tier in this strict order: Controllers (APIC, DNAC, NSO) → Spine → Border Leaf → Leaf → Distribution/Firewall/Edge.
10. Identify Border Leaf from: device name or role containing "BORDER-LEAF", "BORDER_LEAF", "Border Leaf", "border-leaf", or "BL-". Assign tier:2 to Border Leaf.
11. Border Leaf devices must have intelRisk "HIGH" minimum.
12. Tier 4 devices (Distribution, Firewall, Catalyst, Firepower) must never exceed intelRisk "MEDIUM".
13. APIC controllers always appear first in the devices array, before Spines.
14. Controllers (APIC, DNAC, NSO) must have fabricRisk "LOW" unless there is a version mismatch between the controllers themselves.
15. Border Leaf device recommendations must never use directive upgrade language. Use advisory language such as "Review upgrade target against current fabric baseline".
16. P1/P2/P3 priority assessment titles must never contain the word "Critical".
17. Observed structural fabric findings (version mismatches, topology inconsistencies detected directly from inventory data) always rank above intel advisory findings in priority order, regardless of advisory severity. A verified HIGH advisory on a controller is P2 only if no observed structural fabric risk exists in the inventory. If both are present, the structural risk is P1 and the advisory remediation is P3.
18. fabricAnalysis findings must never reference advisory counts, CVEs, or bug data — topology facts from the submitted inventory only.
19. EoL findings disabled pending enterprise SNTC credentials.${aciFabric ? `
20. This is an ACI fabric (APIC detected). APIC version uses ACI release numbering. Nexus switches in this fabric run NX-OS with major version = APIC major version + 10 (e.g. APIC 6.1(5e) → NX-OS 16.1(5e)). Note this version relationship in fabric analysis findings.` : ""}

INFRASTRUCTURE TIER GUIDE:
- Tier 1: Controllers — APIC, DNAC, NSO. Shapes upgrade path for entire fabric. Always appears first.
- Tier 2a: Spine — core fabric stability
- Tier 2b: Border Leaf — external routing, BGP, WAN-facing (HIGH intel minimum)
- Tier 3: Leaf — forwarding fabric
- Tier 4: Distribution, Firewall, Catalyst, Firepower (cap intel at MEDIUM)

Respond ONLY with valid JSON (no markdown):
{
  "priorityAssessment": {"items": [{"priority":"P1","title":"...","reason":"...","devices":["..."]},{"priority":"P2","title":"...","reason":"...","devices":["..."]},{"priority":"P3","title":"...","reason":"...","devices":["..."]}]},
  "fabricAnalysis": {"risk":"LOW|MEDIUM|HIGH","consistent":false,"mismatches":["Platform: version1 vs version2 — description [observed]"],"missingVersions":[],"findings":["finding [observed|inferred]"]},
  "netwrkrIntel": {"hasIntel":true,"summary":"brief summary","items":[{"platform":"","version":"","title":"","detail":"","id":"","verified":false,"sev":"MEDIUM"}]},
  "devices": [{"name":"","ver":"","role":"","tier":1,"fabricRisk":"LOW","intelRisk":"LOW","rec":""}]
}`;
}

// ─────────────────────────────────────────────
// FABRIC ANALYSIS — called when devices + advisorySummary are provided
// ─────────────────────────────────────────────
async function runFabricAnalysis(devices, advisorySummary, aciFabric, ctx, advMap) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key not configured");

  const inventoryCsv = "Platform, Version, Role\n" +
    devices.map(d => `${d.name}, ${d.ver || "not provided"}, ${d.role || "unknown"}`).join("\n");

  const userContent = `Validated device inventory (engineer-confirmed):
${inventoryCsv}

FABRIC TYPE: ${aciFabric ? "ACI (APIC-managed fabric detected)" : "Standalone NX-OS or unknown"}
Additional context: ${ctx || "None provided"}

VERIFIED CISCO SECURITY ADVISORIES (live Cisco PSIRT API data):
${advisorySummary}

// HARDWARE END OF LIFE DATA: disabled pending enterprise SNTC credentials`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system:     buildAnalysisSystemPrompt(aciFabric),
      messages:   [{ role: "user", content: userContent }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const raw    = data.content[0].text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(raw);

  // Cross-check verified flags against real advisory IDs from PSIRT API
  const realIds = new Set(
    Object.values(advMap)
      .flatMap(d => (d.advisories || []).map(a => a.id))
      .filter(Boolean)
  );

  if (parsed.netwrkrIntel?.items) {
    parsed.netwrkrIntel.items = parsed.netwrkrIntel.items.map(item => ({
      ...item,
      verified: realIds.has(item.id) ? true : item.verified,
    }));
  }

  return parsed;
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// Handles two modes:
//   1. PSIRT lookup only  — { platform, version, isAciSwitch } — PUBLIC, no auth
//   2. Full analysis      — { devices, ctx, runAnalysis: true } — requires auth
// ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── MODE 1: Full fabric analysis — requires auth
  // Client sends { runAnalysis: true, devices, ctx, advisoryMap }
  if (req.body.runAnalysis === true) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "unauthorised" });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "unauthorised" });

    const { data: member } = await supabase
      .from("members")
      .select("id, org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) return res.status(401).json({ error: "unauthorised" });

    if (member.role === "viewer") {
      return res.status(403).json({ error: "insufficient_role" });
    }

    const { data: licence } = await supabase
      .from("licences")
      .select("plan, status, analyses_used, analyses_limit")
      .eq("org_id", member.org_id)
      .single();

    if (!licence || licence.status !== "active") {
      return res.status(402).json({ error: "no_active_licence" });
    }
    if (licence.analyses_used >= licence.analyses_limit) {
      return res.status(402).json({ error: "limit_reached" });
    }

    const { devices, ctx, advisoryMap } = req.body;
    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ error: "invalid_request", message: "devices array is required" });
    }

    const aciFabric = devices.some(d => d.name && d.name.toUpperCase().includes("APIC"));

    const advisorySummary = Object.entries(advisoryMap || {}).map(([key, data]) => {
      const [platform, version] = key.split("__");
      if (!data.advisories?.length) return null;
      const high = data.advisories.filter(a => a.impact === "High");
      const med  = data.advisories.filter(a => a.impact === "Medium");
      return `${platform} v${version} [${data.family || ""}]: ${data.advisories.length} advisories (${high.length} High, ${med.length} Medium). Top issues: ${data.advisories.slice(0, 3).map(a => `${a.id} — ${a.title}`).join("; ")}${data.queryVersion !== version ? ` [ACI NX-OS version queried: ${data.queryVersion}]` : ""}`;
    }).filter(Boolean).join("\n") || "No Cisco advisory data retrieved.";

    try {
      const result = await runFabricAnalysis(devices, advisorySummary, aciFabric, ctx, advisoryMap || {});

      // Write audit record
      await supabase.from("analyses").insert({
        org_id:           member.org_id,
        run_by:           member.id,
        device_count:     devices.length,
        preflight_status: "clear",
        result_json:      result,
      });

      // Increment usage counter
      await supabase.rpc("increment_analyses_used", { p_org_id: member.org_id });

      return res.status(200).json(result);

    } catch (err) {
      console.error("Analysis error:", err.message);
      return res.status(502).json({ error: "upstream_error", message: err.message });
    }
  }

  // ── MODE 2: PSIRT advisory lookup (existing behaviour)
  // Client sends { platform, version, isAciSwitch }
  const { platform, version, isAciSwitch } = req.body;

  if (!platform || !version) {
    return res.status(400).json({ error: "platform and version are required" });
  }

  const platformConfig = getPlatformConfig(platform);
  if (!platformConfig) {
    return res.status(200).json({
      advisories: [], eol: null, verified: false,
      message: `No platform mapping for: ${platform}`,
    });
  }

  let queryVersion = version;
  if (isAciSwitch && platformConfig.family === "NX-OS") {
    const remapped = mapApicVersionToNxos(version);
    if (remapped) queryVersion = remapped;
  }

  const pid = normaliseToPID(platform);

  try {
    const token2 = await getAccessToken();

    const [rawAdvisories, eolData] = await Promise.allSettled([
      fetchAdvisories(token2, platformConfig, queryVersion),
      pid ? fetchEoX(token2, pid) : Promise.resolve(null),
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
    if (!pid)                                warnings.push(`Could not determine PID for "${platform}" — EoL check skipped.`);
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
    console.error("advisories.js error:", err.message);
    return res.status(200).json({ advisories: [], eol: null, verified: false, message: err.message });
  }
}