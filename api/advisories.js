// api/advisories.js
// Vercel serverless function — proxies Cisco Security Advisory API

const PLATFORM_CODES = {
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
    "Nexus 7000": "265088",
    "Nexus 7700": "265088",
    "N7K": "265088",
    "MDS 9000": "265086",
    "MDS 9100": "265086",
    "MDS 9200": "265086",
    "MDS 9500": "265086",
    "MDS 9700": "265086",
  };
  
  function getPlatformCode(platformName) {
    if (!platformName) return null;
    const upper = platformName.toUpperCase();
    for (const [key, code] of Object.entries(PLATFORM_CODES)) {
      if (upper.includes(key.toUpperCase())) return code;
    }
    return null;
  }
  
  export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
    const { platform, version, impact } = req.body;
  
    if (!platform || !version) {
      return res.status(400).json({ error: "platform and version are required" });
    }
  
    const platformCode = getPlatformCode(platform);
    if (!platformCode) {
      return res.status(200).json({ advisories: [], message: `No platform code for ${platform}` });
    }
  
    try {
      // Use form-urlencoded as Cisco expects
      const body = new URLSearchParams();
      body.append("platformCodeStep2", platformCode);
      body.append("productSelectedStep2", "nx_os");
      body.append("securityImpactRatingsStep2", impact || "");
      body.append("selectedVersionsStep2", version);
  
      const response = await fetch(
        "https://swc.cloudapps.cisco.com/security/center/iosCheckerGetAdvisories.x",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-GB,en;q=0.9",
            "Origin": "https://sec.cloudapps.cisco.com",
            "Referer": "https://sec.cloudapps.cisco.com/security/center/softwarechecker.x",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: body.toString(),
        }
      );
  
      if (!response.ok) {
        const text = await response.text();
        console.error("Cisco API error:", response.status, text.slice(0, 200));
        return res.status(502).json({ 
          error: `Cisco API returned ${response.status}`,
          advisories: [] 
        });
      }
  
      const data = await response.json();
      const raw = Array.isArray(data) ? data : (data.advisories || data.data || []);
  
      const advisories = raw.map(a => ({
        id: a.identifier || a.advisoryId || "",
        title: a.title || a.advisoryTitle || "",
        impact: a.impact || a.sir || "Unknown",
        published: a.firstPublished || a.publicationUrl || "",
        url: a.url || `https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/${a.identifier}` || "",
        firstFixed: Array.isArray(a.firstFixesName) ? a.firstFixesName[0] : (a.firstFixesName || ""),
      }));
  
      return res.status(200).json({ advisories, platform, version });
  
    } catch (err) {
      console.error("Cisco API fetch error:", err.message);
      return res.status(502).json({ 
        error: `Failed to reach Cisco API: ${err.message}`,
        advisories: [] 
      });
    }
  }