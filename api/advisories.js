// api/advisories.js
// Vercel serverless function — proxies Cisco Security Advisory API

const PLATFORM_CODES = {
    // Nexus 9000 series
    "Nexus 9336C-FX2": "265096",
    "Nexus 93180YC-EX": "265096",
    "Nexus 93180YC-FX": "265096",
    "Nexus 93180YC-FX3": "265096",
    "Nexus 9300-EX": "265096",
    "Nexus 9300-FX": "265096",
    "Nexus 9504": "265096",
    "Nexus 9508": "265096",
    "Nexus 9516": "265096",
    "Nexus 9000": "265096",
    "N9K": "265096",
    // Nexus 7000 series
    "Nexus 7000": "265088",
    "Nexus 7700": "265088",
    "N7K": "265088",
    // MDS 9000 series
    "MDS 9000": "265086",
    "MDS 9100": "265086",
    "MDS 9200": "265086",
    "MDS 9500": "265086",
    "MDS 9700": "265086",
  };
  
  function getPlatformCode(platformName) {
    if (!platformName) return null;
    const upper = platformName.toUpperCase();
    // Check exact matches first
    for (const [key, code] of Object.entries(PLATFORM_CODES)) {
      if (upper.includes(key.toUpperCase())) return code;
    }
    return null;
  }
  
  export default async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
  
    const { platform, version, impact } = req.body;
  
    if (!platform || !version) {
      return res.status(400).json({ error: "platform and version are required" });
    }
  
    const platformCode = getPlatformCode(platform);
  
    if (!platformCode) {
      return res.status(200).json({ 
        advisories: [], 
        message: `No platform code found for ${platform}` 
      });
    }
  
    try {
      const payload = new URLSearchParams({
        platformCodeStep2: platformCode,
        productSelectedStep2: "nx_os",
        securityImpactRatingsStep2: impact || "",
        selectedVersionsStep2: version,
      });
  
      const response = await fetch(
        "https://swc.cloudapps.cisco.com/security/center/iosCheckerGetAdvisories.x",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://sec.cloudapps.cisco.com/",
            "Origin": "https://sec.cloudapps.cisco.com",
          },
          body: payload.toString(),
        }
      );
  
      if (!response.ok) {
        return res.status(502).json({ 
          error: `Cisco API returned ${response.status}`,
          advisories: [] 
        });
      }
  
      const data = await response.json();
  
      // Normalise the response
      const advisories = (Array.isArray(data) ? data : data.advisories || []).map(a => ({
        id: a.identifier || "",
        title: a.title || "",
        impact: a.impact || "Unknown",
        published: a.firstPublished || "",
        url: a.url || "",
        firstFixed: Array.isArray(a.firstFixesName) ? a.firstFixesName[0] : a.firstFixesName || "",
      }));
  
      return res.status(200).json({ advisories, platform, version });
  
    } catch (err) {
      console.error("Cisco API error:", err);
      return res.status(502).json({ 
        error: "Failed to reach Cisco advisory API",
        advisories: [] 
      });
    }
  }