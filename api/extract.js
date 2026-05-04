// api/extract.js
// Vercel serverless function — device extraction from raw inventory text
// Public endpoint — no auth required (free tier, unauthenticated users)
// v1.1

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
    // ── Input validation
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "invalid_request", message: "text is required" });
    }
  
    // ── Call Anthropic server-side
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "upstream_error", message: "Anthropic API key not configured" });
    }
  
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: `You are a data extraction engine for a Cisco network analysis tool.
  Your only job is to extract network devices from text and return structured JSON.
  You never guess or infer software versions — only extract what is explicitly written.
  You return ONLY a valid JSON array with no markdown, no explanation, no preamble.`,
          messages: [{
            role: "user",
            content: `Extract all network devices from the text below. For each device return:
  - name: the Cisco platform name (e.g. "Nexus 9336C-FX2", "Catalyst 9500", "APIC")
  - ver: the exact software version string if explicitly present (e.g. "9.3(9)", "17.9.4", "6.1(5e)") — if NOT present set to ""
  - role: the device role if present (e.g. "Spine", "Leaf", "Border Leaf", "Distribution", "Controller") — if not present set to ""
  
  IMPORTANT: Only extract versions that are explicitly written in the text. Do not guess or infer versions from platform names.
  
  Return ONLY a JSON array, no markdown, no explanation:
  [{"name":"...","ver":"...","role":"..."}]
  
  Text to parse:
  ${text.slice(0, 12000)}`
          }],
        }),
      });
  
      const data = await response.json();
  
      if (data.error) {
        console.error("Anthropic error:", data.error);
        return res.status(502).json({ error: "upstream_error", message: data.error.message });
      }
  
      const raw = data.content[0].text.replace(/```json\n?|\n?```/g, "").trim();
  
      let devices;
      try {
        devices = JSON.parse(raw);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr.message, "Raw:", raw.slice(0, 200));
        return res.status(502).json({ error: "upstream_error", message: "Failed to parse extraction result" });
      }
  
      return res.status(200).json({ devices });
  
    } catch (err) {
      console.error("extract.js error:", err.message);
      return res.status(502).json({ error: "upstream_error", message: err.message });
    }
  };
  