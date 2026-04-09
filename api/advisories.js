// api/advisories.js
// Vercel serverless function — Cisco PSIRT openVuln API with OAuth
// v1.2 — per-platform endpoint routing (NX-OS, IOS-XE, FTD, APIC)

const CISCO_TOKEN_URL = "https://id.cisco.com/oauth2/default/v1/token";
const CISCO_PSIRT_BASE = "https://apix.cisco.com/security/advisories";

// Map platform names to { family, endpoint } for correct PSIRT API routing
function getPlatformConfig(platformName) {
  if (!platformName) return null;
  const upper = platformName.toUpperCase();

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

  // APIC — use product name search as no dedicated version endpoint
  if (upper.includes("APIC")) {
    return { family: "APIC", endpoint: "product" };
  }

  return null;
}

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

async function fetchAdvisories(token, platformConfig, version) {
  let url;

  if (platformConfig.endpoint === "product") {
    // APIC — query by product name, no version endpoint available
    url = `${CISCO_PSIRT_BASE}/product?product=${encodeURIComponent("Cisco Application Policy Infrastructure Controller")}`;
  } else {
    // All others — query by version using platform-specific endpoint
    url = `${CISCO_PSIRT_BASE}/${platformConfig.endpoint}?version=${encodeURIComponent(version)}`;
  }

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { platform, version } = req.body;

  if (!platform || !version) {
    return res.status(400).json({ error: "platform and version are required" });
  }

  const platformConfig = getPlatformConfig(platform);
  if (!platformConfig) {
    return res.status(200).json({
      advisories: [],
      verified: false,
      message: `No platform mapping for ${platform}`
    });
  }

  try {
    const token = await getAccessToken();
    const raw = await fetchAdvisories(token, platformConfig, version);

    const advisories = raw.map(a => ({
      id: a.advisoryId || a.identifier || "",
      title: a.advisoryTitle || a.title || "",
      impact: a.sir || a.impact || "Unknown",
      published: a.firstPublished || "",
      url: a.publicationUrl || a.url || "",
      firstFixed: Array.isArray(a.firstFixed) ? a.firstFixed[0] : (a.firstFixed || ""),
      cvssScore: a.cvssBaseScore || "",
      cveId: Array.isArray(a.cves) ? a.cves[0] : (a.cves || ""),
    }));

    return res.status(200).json({
      advisories,
      platform,
      version,
      family: platformConfig.family,
      verified: true
    });

  } catch (err) {
    console.error("PSIRT API error:", err.message);
    return res.status(200).json({
      advisories: [],
      verified: false,
      message: err.message
    });
  }
}