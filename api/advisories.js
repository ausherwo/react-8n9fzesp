// api/advisories.js
// Vercel serverless function — Cisco PSIRT openVuln API with OAuth

const CISCO_TOKEN_URL = "https://id.cisco.com/oauth2/default/v1/token";
const CISCO_PSIRT_BASE = "https://api.cisco.com/security/advisories";

// Map platform names to Cisco product families for PSIRT API queries
function getProductQuery(platformName) {
  if (!platformName) return null;
  const upper = platformName.toUpperCase();
  if (upper.includes("NEXUS 93") || upper.includes("NEXUS 92") || upper.includes("NEXUS 9")) return "NX-OS";
  if (upper.includes("NEXUS 7")) return "NX-OS";
  if (upper.includes("NEXUS 5")) return "NX-OS";
  if (upper.includes("NEXUS 3")) return "NX-OS";
  if (upper.includes("CATALYST 9")) return "IOS XE";
  if (upper.includes("CATALYST 6")) return "IOS";
  if (upper.includes("ASR")) return "IOS XE";
  if (upper.includes("ISR")) return "IOS XE";
  if (upper.includes("FIREPOWER") || upper.includes("FTD")) return "Firepower";
  if (upper.includes("APIC")) return "APIC";
  if (upper.includes("MDS")) return "NX-OS";
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

async function fetchAdvisories(token, version) {
  const url = `${CISCO_PSIRT_BASE}/ios?version=${encodeURIComponent(version)}`;
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

  const productQuery = getProductQuery(platform);
  if (!productQuery) {
    return res.status(200).json({ advisories: [], message: `No product mapping for ${platform}` });
  }

  try {
    const token = await getAccessToken();
    const raw = await fetchAdvisories(token, version);

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

    return res.status(200).json({ advisories, platform, version, verified: true });

  } catch (err) {
    console.error("PSIRT API error:", err.message);
    return res.status(200).json({
      advisories: [],
      verified: false,
      message: err.message
    });
  }
}