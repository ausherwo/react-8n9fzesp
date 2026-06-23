// api/advisories.js
// Vercel serverless function — Cisco PSIRT openVuln API + fabric analysis
// v3.3 — fix ACI switch PSIRT routing: use aci endpoint directly, no version remapping

const { createClient } = require('@supabase/supabase-js');

const CISCO_TOKEN_URL  = "https://id.cisco.com/oauth2/default/v1/token";
const CISCO_PSIRT_BASE = "https://apix.cisco.com/security/advisories/v2/OSType";
const CISCO_EOX_BASE   = "https://apix.cisco.com/supporttools/eox/rest/5";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────
// DETERMINISTIC RISK SCORING
// Risk levels are calculated from real data — never set by AI
// ─────────────────────────────────────────────

function parseVersion(ver) {
  if (!ver || ver === "not provided") return null;
  const match = ver.match(/^(\d+)[\.\(](\d+)/);
  if (!match) return null;
  return { major: parseInt(match[1], 10), minor: parseInt(match[2], 10) };
}

function calculateFabricRisk(devices) {
  const tierGroups = {};
  devices.forEach(d => {
    const tier = d.tier || 3;
    if (tier >= 4) return;
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(d);
  });

  const tierVersions = {};
  Object.entries(tierGroups).forEach(([tier, devs]) => {
    const versions = [...new Set(devs.map(d => d.ver).filter(v => v && v !== "not provided"))];
    tierVersions[tier] = versions;
  });

  const spineVersions      = (tierVersions[2] || []).map(parseVersion).filter(Boolean);
  const leafVersions       = (tierVersions[3] || []).map(parseVersion).filter(Boolean);
  const controllerVersions = (tierVersions[1] || []).map(parseVersion).filter(Boolean);

  let overallFabricRisk = "LOW";

  if (spineVersions.length > 0 && leafVersions.length > 0) {
    const spineMajors = [...new Set(spineVersions.map(v => v.major))];
    const leafMajors  = [...new Set(leafVersions.map(v => v.major))];
    const majorsSplit = spineMajors.some(m => !leafMajors.includes(m));
    if (majorsSplit) overallFabricRisk = "HIGH";
  }

  Object.values(tierVersions).forEach(versions => {
    if (versions.length > 1 && overallFabricRisk === "LOW") {
      overallFabricRisk = "MEDIUM";
    }
  });

  return devices.map(d => {
    const tier = d.tier || 3;

    if (tier === 1) {
      const ctrlVersions = [...new Set(
        devices.filter(x => x.tier === 1 && x.ver && x.ver !== "not provided").map(x => x.ver)
      )];
      return { ...d, fabricRisk: ctrlVersions.length > 1 ? "MEDIUM" : "LOW" };
    }

    if (tier >= 4) return { ...d, fabricRisk: "LOW" };

    if (!d.ver || d.ver === "not provided") return { ...d, fabricRisk: "LOW" };

    const dv = parseVersion(d.ver);
    if (!dv) return { ...d, fabricRisk: "LOW" };

    const sameTier = devices.filter(x => x.tier === tier && x.ver && x.ver !== "not provided" && x !== d);
    if (sameTier.length === 0) {
      return { ...d, fabricRisk: overallFabricRisk === "HIGH" ? "HIGH" : "LOW" };
    }

    const sameTierVersions = sameTier.map(x => parseVersion(x.ver)).filter(Boolean);
    const isOutlier = sameTierVersions.some(v => v.major !== dv.major || v.minor !== dv.minor);

    if (!isOutlier) {
      return { ...d, fabricRisk: overallFabricRisk };
    } else {
      const majorMismatch = sameTierVersions.some(v => v.major !== dv.major);
      return { ...d, fabricRisk: majorMismatch ? "HIGH" : "MEDIUM" };
    }
  });
}

function calculateIntelRisk(devices, advMap) {
  return devices.map(d => {
    const tier = d.tier || 3;
    const key  = `${d.name}__${d.ver}`;
    const data = advMap[key];

    if (!data || !data.advisories || data.advisories.length === 0) {
      return { ...d, intelRisk: "LOW" };
    }

    const hasHigh   = data.advisories.some(a => a.impact === "High" || a.impact === "Critical");
    const hasMedium = data.advisories.some(a => a.impact === "Medium");

    let risk = "LOW";
    if (hasMedium) risk = "MEDIUM";
    if (hasHigh)   risk = "HIGH";

    if (tier >= 4 && risk === "HIGH") risk = "MEDIUM";

    if ((d.role === "Border Leaf" || d.role === "border-leaf") && risk === "LOW") risk = "MEDIUM";

    return { ...d, intelRisk: risk };
  });
}

function calculateOverallFabricRisk(devices) {
  const tieredDevices = devices.filter(d => (d.tier || 3) < 4 && d.ver && d.ver !== "not provided");

  if (tieredDevices.length === 0) return "LOW";

  const byTier = {};
  tieredDevices.forEach(d => {
    const t = d.tier || 3;
    if (!byTier[t]) byTier[t] = [];
    byTier[t].push(parseVersion(d.ver));
  });

  const tiers = Object.keys(byTier).map(Number).sort();
  for (let i = 0; i < tiers.length - 1; i++) {
    const tierA = byTier[tiers[i]].filter(Boolean);
    const tierB = byTier[tiers[i+1]].filter(Boolean);
    if (tierA.length && tierB.length) {
      const majorsA = [...new Set(tierA.map(v => v.major))];
      const majorsB = [...new Set(tierB.map(v => v.major))];
      if (majorsA.some(m => !majorsB.includes(m))) return "HIGH";
    }
  }

  for (const versions of Object.values(byTier)) {
    const valid = versions.filter(Boolean);
    const uniqueMajors = [...new Set(valid.map(v => v.major))];
    const uniqueMinors = [...new Set(valid.map(v => `${v.major}.${v.minor}`))];
    if (uniqueMajors.length > 1) return "HIGH";
    if (uniqueMinors.length > 1) return "MEDIUM";
  }

  return "LOW";
}

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
// PLATFORM CONFIG
// Maps platform name to PSIRT OSType endpoint and family label.
//
// Endpoint routing:
//   aci   — APIC controllers AND Nexus switches in ACI-managed fabrics
//   nxos  — Standalone Nexus switches (no APIC in fabric)
//   ftd   — Firepower Threat Defense
//   iosxe — Catalyst 9k, ASR, ISR
//   ios   — Catalyst 6k and older IOS platforms
//
// ACI switch override: isAciSwitch flag from client forces endpoint
// to "aci" regardless of platform name match — see MODE 2 handler.
// Version is always passed as-is (NX-OS format e.g. 15.2(8e)).
// No version remapping is performed anywhere in this file.
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
// ─────────────────────────────────────────────
function buildAnalysisSystemPrompt(aciFabric) {
  return `You are netwrkr.ai, an expert Cisco data centre network engineer.

ABSOLUTE RULES:
1. ONLY report bug findings for devices where a version is EXPLICITLY provided. If ver is "not provided" set bugs to [].
2. NEVER infer or guess software versions from platform names or roles.
3. Version mismatches can ONLY be reported when multiple devices of the same type show DIFFERENT explicit versions.
4. Every finding must end with [observed], [inferred], or [assumed].
5. [observed] = directly from the data. [inferred] = logical conclusion. [assumed] = no evidence, low confidence only.
6. If any device has ver="not provided", include this finding: "Software version not provided for X device(s) — bug and CVE analysis unavailable for those devices [observed]"
7. NEVER add devices that are not in the submitted inventory. The devices array must contain EXACTLY the same devices as submitted — no additions, no omissions.
8. Sort devices in the output by infrastructure tier: Controllers → Spine → Border Leaf → Leaf → Distribution/Firewall/Edge.
9. Border Leaf devices must have rec using advisory language only — never directive upgrade language.
10. P1/P2/P3 priority assessment titles must never contain the word "Critical".
11. Observed structural fabric findings always rank above intel advisory findings in priority order.
12. fabricAnalysis findings must never reference advisory counts, CVEs, or bug data — topology facts only.
13. EoL findings disabled pending enterprise SNTC credentials.
14. DO NOT set fabricRisk or intelRisk values — these will be calculated and applied by the system after your response. Set all fabricRisk and intelRisk to "LOW" as placeholders only.${aciFabric ? `
15. This is an ACI fabric (APIC detected). APIC version uses ACI release numbering. Nexus NX-OS major = APIC major + 10.
16. In an ACI fabric, APIC controllers and Nexus switches run on DIFFERENT version numbering schemes by design. APIC 6.0(3e) and NX-OS 16.0(3e) are the SAME release — this is NOT a mismatch and must NOT be reported as one. Never flag APIC version vs NX-OS version as a mismatch in an ACI fabric.` : ""}

INFRASTRUCTURE TIER GUIDE:
- Tier 1: Controllers — APIC, DNAC, NSO
- Tier 2a: Spine
- Tier 2b: Border Leaf — external routing, BGP, WAN-facing
- Tier 3: Leaf
- Tier 4: Distribution, Firewall, Catalyst, Firepower

Respond ONLY with valid JSON (no markdown):
{
  "priorityAssessment": {"items": [{"priority":"P1","title":"...","reason":"...","devices":["..."]},{"priority":"P2","title":"...","reason":"...","devices":["..."]},{"priority":"P3","title":"...","reason":"...","devices":["..."]}]},
  "fabricAnalysis": {"risk":"LOW","consistent":false,"mismatches":["Platform: version1 vs version2 — description [observed]"],"missingVersions":[],"findings":["finding [observed|inferred]"]},
  "netwrkrIntel": {"hasIntel":true,"summary":"brief summary","items":[{"platform":"","version":"","title":"","detail":"","id":"","verified":false,"sev":"MEDIUM"}]},
  "devices": [{"name":"","ver":"","role":"","tier":1,"fabricRisk":"LOW","intelRisk":"LOW","rec":""}]
}`;
}

// ─────────────────────────────────────────────
// FABRIC ANALYSIS
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
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
      system:     buildAnalysisSystemPrompt(aciFabric),
      messages:   [{ role: "user", content: userContent }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const raw    = data.content[0].text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(raw);

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

  const devicesWithFabricRisk = calculateFabricRisk(parsed.devices || devices);
  const devicesWithAllRisk    = calculateIntelRisk(devicesWithFabricRisk, advMap);

  parsed.devices = devicesWithAllRisk;
  parsed.fabricAnalysis.risk = calculateOverallFabricRisk(devices);

  return parsed;
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── MODE 1: Full fabric analysis
  if (req.body.runAnalysis === true) {

    let member = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          const { data: memberData } = await supabase
            .from("members")
            .select("id, org_id, role")
            .eq("user_id", user.id)
            .single();
          if (memberData) {
            if (memberData.role === "viewer") {
              return res.status(403).json({ error: "insufficient_role" });
            }
            const { data: licence } = await supabase
              .from("licences")
              .select("plan, status, analyses_used, analyses_limit")
              .eq("org_id", memberData.org_id)
              .single();
            if (!licence || licence.status !== "active") {
              return res.status(402).json({ error: "no_active_licence" });
            }
            if (licence.analyses_used >= licence.analyses_limit) {
              return res.status(402).json({ error: "limit_reached" });
            }
            member = memberData;
          }
        }
      } catch (e) {
        console.warn("Auth check failed (continuing as free tier):", e.message);
      }
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
      return `${platform} v${version} [${data.family || ""}]: ${data.advisories.length} advisories (${high.length} High, ${med.length} Medium). Top issues: ${data.advisories.slice(0, 3).map(a => `${a.id} — ${a.title}`).join("; ")}`;
    }).filter(Boolean).join("\n") || "No Cisco advisory data retrieved.";

    try {
      const result = await runFabricAnalysis(devices, advisorySummary, aciFabric, ctx, advisoryMap || {});

      if (member) {
        await supabase.from("analyses").insert({
          org_id:           member.org_id,
          run_by:           member.id,
          device_count:     devices.length,
          preflight_status: "clear",
          result_json:      result,
        });
        await supabase.rpc("increment_analyses_used", { p_org_id: member.org_id });
      }

      return res.status(200).json(result);

    } catch (err) {
      console.error("Analysis error:", err.message);
      return res.status(502).json({ error: "upstream_error", message: err.message });
    }
  }

  // ── MODE 2: PSIRT advisory lookup
  //
  // Endpoint routing per platform type:
  //   APIC                      → aci   (via getPlatformConfig)
  //   Nexus in ACI fabric       → aci   (isAciSwitch flag overrides nxos)
  //   Nexus standalone          → nxos  (via getPlatformConfig)
  //   Firepower / FTD           → ftd   (via getPlatformConfig)
  //   Catalyst 9k / ASR / ISR   → iosxe (via getPlatformConfig)
  //   Catalyst 6k               → ios   (via getPlatformConfig)
  //
  // Version is always passed as-is — no remapping performed.
  // Client sends NX-OS version for all Nexus switches (e.g. 15.2(8e)).

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

  // Override endpoint to aci for Nexus switches inside an ACI fabric.
  // Version is already in NX-OS format (e.g. 15.2(8e)) — no remapping needed.
  if (isAciSwitch) {
    platformConfig.endpoint = "aci";
  }

  const pid = normaliseToPID(platform);

  try {
    const token2 = await getAccessToken();

    const [rawAdvisories, eolData] = await Promise.allSettled([
      fetchAdvisories(token2, platformConfig, version),
      pid ? fetchEoX(token2, pid) : Promise.resolve(null),
    ]);

    // Map advisory fields — firstFixed extracted from platforms[].firstFixes[] 
    // which is populated on the aci OSType endpoint (unlike the product endpoint).
    const advisories = (rawAdvisories.status === "fulfilled" ? rawAdvisories.value : []).map(a => ({
      id:         a.advisoryId || a.identifier || "",
      title:      a.advisoryTitle || a.title || "",
      impact:     a.sir || a.impact || "Unknown",
      published:  a.firstPublished || "",
      url:        a.publicationUrl || a.url || "",
      firstFixed: a.platforms?.[0]?.firstFixes?.[0]?.name || "",
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
      family:       platformConfig.family,
      verified:     true,
      warnings:     warnings.length > 0 ? warnings : undefined,
    });

  } catch (err) {
    console.error("advisories.js error:", err.message);
    return res.status(200).json({ advisories: [], eol: null, verified: false, message: err.message });
  }
};