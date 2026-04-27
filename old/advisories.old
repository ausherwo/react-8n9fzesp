// api/advisories.js
// Vercel serverless function — Cisco PSIRT openVuln API + EoX API with OAuth
// v2.0 — ACI/APIC version handling, NX-OS PID normalisation, EoL/EoS integration

const CISCO_TOKEN_URL = "https://id.cisco.com/oauth2/default/v1/token";
const CISCO_PSIRT_BASE = "https://apix.cisco.com/security/advisories";
const CISCO_EOX_BASE = "https://apix.cisco.com/supporttools/eox/rest/5";

// ─────────────────────────────────────────────
// PID NORMALISATION
// Converts user-friendly platform names to Cisco PIDs for EoX API queries
// e.g. "Nexus 9336C-FX2" → "N9K-C9336C-FX2"
//      "9336C-FX2"        → "N9K-C9336C-FX2"
// ─────────────────────────────────────────────
function normaliseToPID(platformName) {
  if (!platformName) return null;
  const upper = platformName.toUpperCase().trim();

  // Already a well-formed PID — return as-is
  if (/^N[0-9]K-[A-Z0-9]/.test(upper) || upper.startsWith("APIC-")) {
    return upper;
  }

  // APIC PIDs e.g. "APIC-SERVER-M3" — leave as-is after stripping "Cisco "
  if (upper.includes("APIC")) {
    return upper.replace(/^CISCO\s+/, "").trim();
  }

  // Strip common prefixes to isolate the model number
  let model = upper
    .replace(/^CISCO\s+/, "")
    .replace(/^NEXUS\s+/, "")
    .replace(/^CATALYST\s+/, "")
    .replace(/^MDS\s+/, "")
    .trim();

  // Nexus 9000 series
  if (/^9[2356789]\d{2}/.test(model)) return `N9K-C${model}`;

  // Nexus 7000 series
  if (/^7[0-9]\d{2}/.test(model)) return `N7K-C${model}`;

  // Nexus 5000 series
  if (/^5[456]\d{2}/.test(model)) return `N5K-C${model}`;

  // Nexus 3000 series
  if (/^3[0-9]\d{2}/.test(model)) return `N3K-C${model}`;

  // MDS 9000 series
  if (/^9\d{3}/.test(model) && platformName.toUpperCase().includes("MDS")) {
    return `DS-C${model}`;
  }

  return null; // Could not normalise — caller should surface this to the user
}

// ─────────────────────────────────────────────
// ACI / NX-OS VERSION MAPPING
// APIC versions use ACI release numbering (e.g. 6.1(5e))
// ACI-managed switches run NX-OS with major version + 10 (e.g. 16.1(5e))
// This function converts an APIC version to the corresponding switch NX-OS version
// ─────────────────────────────────────────────
function mapApicVersionToNxos(apicVersion) {
  if (!apicVersion) return null;
  // Match "6.1(5e)" or "6.1.5e" style versions
  const match = apicVersion.match(/^(\d+)([\.\(].+)$/);
  if (!match) return null;
  const major = parseInt(match[1], 10);
  const rest = match[2];
  return `${major + 10}${rest}`;
}

// ─────────────────────────────────────────────
// PLATFORM CONFIG
// Maps platform name to { family, endpoint } for PSIRT API routing
// ─────────────────────────────────────────────
function getPlatformConfig(platformName) {
  if (!platformName) return null;
  const upper = platformName.toUpperCase();

  // APIC — ACI software versioning, dedicated ACI advisory endpoint
  if (upper.includes("APIC")) {
    return { family: "ACI", endpoint: "aci" };
  }

  // NX-OS platforms — Nexus switches and MDS
  if (
    upper.includes("NEXUS 9") ||
    upper.includes("NEXUS 7") ||
    upper.includes("NEXUS 5") ||
    upper.includes("NEXUS 3") ||
    upper.includes("MDS")
  ) {
    return { family: "NX-OS", endpoint: "nxos" };
  }

  // IOS-XE platforms — Catalyst 9k, ASR, ISR
  if (
    upper.includes("CATALYST 9") ||
    upper.includes("ASR") ||
    upper.includes("ISR")
  ) {
    return { family: "IOS XE", endpoint: "iosxe" };
  }

  // Classic IOS — Catalyst 6k and older
  if (upper.includes("CATALYST 6")) {
    return { family: "IOS", endpoint: "ios" };
  }

  // Firepower / FTD
  if (upper.includes("FIREPOWER") || upper.includes("FTD")) {
    return { family: "FTD", endpoint: "ftd" };
  }

  return null;
}

// ─────────────────────────────────────────────
// OAUTH TOKEN
// ─────────────────────────────────────────────
async function getAccessToken() {
  const clientId = process.env.CISCO_CLIENT_ID;
  const clientSecret = process.env.CISCO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("CISCO_CLIENT_ID and CISCO_CLIENT_SECRET environment variables are required");
  }

  const body = new URLSearchParams();
  body.append("grant_type", "client_credentials");
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);

  const response = await fetch(CISCO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
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
// Queries the correct endpoint by platform family and software version
// For ACI-managed switches: version should already be the NX-OS version (major+10)
// For APIC: version is the ACI release version as-is
// ─────────────────────────────────────────────
async function fetchAdvisories(token, platformConfig, version) {
  const url = `${CISCO_PSIRT_BASE}/${platformConfig.endpoint}?version=${encodeURIComponent(version)}`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
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
// Queries Cisco EoX API by normalised PID
// Returns structured EoL/EoS dates
// ─────────────────────────────────────────────
async function fetchEoX(token, pid) {
  const url = `${CISCO_EOX_BASE}/EOXByProductID/5/${encodeURIComponent(pid)}?responseencoding=json`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EoX API error: ${response.status} ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const record = data?.EOXRecord?.[0];
  if (!record) return null;

  return {
    endOfSaleDate:              record.EndOfSaleDate?.value || null,
    endOfSwMaintenanceDate:     record.EndOfSWMaintenanceReleases?.value || null,
    endOfSecuritySupportDate:   record.EndOfSecurityVulSupportDate?.value || null,
    endOfSupportDate:           record.LastDateOfSupport?.value || null,
    migrationProduct:           record.EOXMigrationDetails?.MigrationProductName || null,
    migrationProductPID:        record.EOXMigrationDetails?.MigrationProductId || null,
    bulletinURL:                record.LinkToProductBulletinURL || null,
  };
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { platform, version, isAciSwitch } = req.body;
  // isAciSwitch: boolean — set true by the app when the device is a Nexus switch
  // in an ACI fabric (i.e. inventory contains an APIC). Triggers version remapping.

  if (!platform || !version) {
    return res.status(400).json({ error: "platform and version are required" });
  }

  const platformConfig = getPlatformConfig(platform);
  if (!platformConfig) {
    return res.status(200).json({
      advisories: [],
      eol: null,
      verified: false,
      message: `No platform mapping for: ${platform}`
    });
  }

  // Determine the version to query for advisories
  // ACI-managed switches: remap APIC-style version to NX-OS version
  let queryVersion = version;
  if (isAciSwitch && platformConfig.family === "NX-OS") {
    const remapped = mapApicVersionToNxos(version);
    if (remapped) {
      queryVersion = remapped;
    }
  }

  // Normalise PID for EoX lookup
  const pid = normaliseToPID(platform);

  try {
    const token = await getAccessToken();

    // Run PSIRT and EoX queries in parallel for performance
    const [rawAdvisories, eolData] = await Promise.allSettled([
      fetchAdvisories(token, platformConfig, queryVersion),
      pid ? fetchEoX(token, pid) : Promise.resolve(null),
    ]);

    // Process advisories
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

    // Process EoX
    const eol = eolData.status === "fulfilled" ? eolData.value : null;

    // Surface PID normalisation failure as a warning (not a fatal error)
    const warnings = [];
    if (!pid) {
      warnings.push(`Could not determine PID for "${platform}" — EoL check skipped. Please verify the model name.`);
    }
    if (rawAdvisories.status === "rejected") {
      warnings.push(`Advisory lookup failed: ${rawAdvisories.reason?.message}`);
    }
    if (eolData.status === "rejected") {
      warnings.push(`EoL lookup failed: ${eolData.reason?.message}`);
    }

    return res.status(200).json({
      advisories,
      eol,
      pid:            pid || null,
      platform,
      version,
      queryVersion,   // Actual version sent to PSIRT API (may differ for ACI switches)
      family:         platformConfig.family,
      verified:       true,
      warnings:       warnings.length > 0 ? warnings : undefined,
    });

  } catch (err) {
    console.error("advisories.js error:", err.message);
    return res.status(200).json({
      advisories: [],
      eol: null,
      verified: false,
      message: err.message,
    });
  }
}