// api/extract.js
// Vercel serverless function — device extraction from raw inventory text
// v1.2 — ACI hardware compatibility matrix added
 
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
 
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
 
  const { text } = req.body;
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "invalid_request", message: "text is required" });
  }
 
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
You return ONLY a valid JSON array with no markdown, no explanation, no preamble.
 
─────────────────────────────────────────────
ACI HARDWARE COMPATIBILITY — use this to assign correct role and tier
─────────────────────────────────────────────
 
APIC CONTROLLERS (tier 1):
- Any platform with "APIC" in the name is a Controller, tier 1
- Examples: APIC-SERVER-M3, APIC-SERVER-L3, APIC-SERVER-M2, APIC-SERVER-L2
 
ACI SPINE-CAPABLE PLATFORMS (tier 2, role "Spine"):
The following platforms can ONLY operate as spines in ACI — never as leafs:
- Nexus 9336PQ, 9332PQ (Gen 1 spine — ACI 1.x–4.x only, not supported in ACI 5.0+)
- Nexus 9364C, 9364C-GX (Gen 3 spine — supported ACI 4.0+)
- Nexus 9332C (Gen 2 spine — supported ACI 3.0+)
- Nexus 9504, 9508, 9516 with -EX or -FX line cards (modular spine)
- Nexus 9504, 9508, 9516 with N9K-X9736C-EX/FX (spine line cards)

ACI SPINE-LEAF-CAPABLE PLATFORMS (tier 2, role "Spine"):
The following platforms can operate as spines or leafs in ACI:
- Nexus 9316D
- Nexus 93600CD-GX
- Nexus 9332D-GX2B
- Nexus 9348D-GX2A
- Nexus 9348D-GX2A

ACI LEAF-CAPABLE PLATFORMS (tier 3, role "Leaf" or "Border Leaf"):
Generation 1 leafs — supported ACI 1.x to 4.x ONLY, NOT supported ACI 5.0+:
- Nexus 93128TX, 9372PX, 9372PX-E, 9372TX, 9372TX-E
- Nexus 9396PX, 9396TX
- Nexus 9332PQ (when used as leaf — unusual but possible in early ACI)
 
Generation 2 leafs — supported ACI 2.x+:
- Nexus 93180YC-EX, 93108TC-EX, 9348GC-FXP
- Nexus 93180LC-EX
 
Generation 2/3 leafs — supported ACI 4.0+:
- Nexus 93180YC-FX, 93108TC-FX, 93240YC-FX2
- Nexus 93360YC-FX2, 9336C-FX2 (also used as spine in some designs)
- Nexus 93216TC-FX2 
 
Generation 3 leafs — supported ACI 5.1+:
- Nexus 93180YC-FX3, 9300-GX series

Generation 3 leafs — supported ACI 5.2+:
- Nexus 9332D-GX2B, 9364D-GX2A
 
Generation 5 leafs — supported ACI 6.1+:
- Nexus 9348GC-FX3, 93108TC-FX3

BORDER LEAF identification rules:
- Any leaf platform connected to external routing (ASR, ASA, Firepower, WAN) = "Border Leaf"
- Platforms with "-EX" suffix are commonly used as border leafs due to 40G uplinks
- If the inventory text mentions BGP, L3Out, WAN, external peering, or firewall adjacency for a leaf = "Border Leaf"
- If role is ambiguous and platform is leaf-capable, default to "Leaf"
 
ACI VERSION RULES:
- APIC uses ACI versioning: e.g. 5.2(8e), 6.0(3e)
- ACI Nexus switches run NX-OS where major version = APIC major + 10
  Example: APIC 5.2(8e) → switches run 15.2(8e); APIC 6.0(3e) → switches run 16.0(3e)
- If file lists APIC version but not switch versions, derive switch NX-OS using the +10 rule
- If switch versions are explicitly listed, use those exactly
 
─────────────────────────────────────────────
NON-ACI PLATFORMS — assign correct tier and role
─────────────────────────────────────────────
 
STANDALONE NX-OS (not in ACI fabric):
- Nexus 7700 series (7702, 7706, 7710, 7718) — tier 2, role "Distribution"
- Nexus 7000 series (7004, 7009, 7010, 7018) — tier 2, role "Distribution"
- Nexus 5600 series (5672UP, 5696Q) — tier 4, role "Distribution"
- Nexus 5500 series (5548UP, 5596UP) — tier 4, role "Distribution"
- Nexus 3000/3100/3200 series — tier 3, role "Leaf" or "Distribution"
- MDS 9000 series (SAN switches) — tier 3, role "SAN Switch"
 
ASR ROUTERS (tier 4, role "Edge"):
- ASR 1001-X, 1001-HX, 1002-X, 1002-HX, 1004, 1006, 1006-X, 1009-X
- ASR 9000 series (9001, 9006, 9010, 9904, 9906, 9910, 9912, 9922) — tier 2, role "Edge"
- ASR 920 series — tier 4, role "Edge"
 
CATALYST SWITCHES (tier 4 unless core role specified):
- Catalyst 9500, 9400, 9300, 9200 — tier 4, role "Distribution" or "Access"
- Catalyst 6500, 6800 — tier 2, role "Distribution" if core role indicated
 
FIREWALLS (tier 4):
- Firepower 4100 series (4110, 4115, 4120, 4125, 4140, 4145, 4150) — role "Firewall"
- Firepower 9300 — role "Firewall"
- Firepower 2100 series (2110, 2120, 2130, 2140) — role "Firewall"
- Firepower 1000 series — role "Firewall"
- ASA 5500-X series (5506, 5508, 5516, 5525, 5545, 5555) — role "Firewall"
- ASA 5500 series — role "Firewall"
 
SOFTWARE VERSION FORMAT by platform:
- APIC: e.g. 5.2(8e), 6.0(3e) — ACI release format
- NX-OS (ACI): e.g. 15.2(8e), 16.0(3e) — major = APIC major + 10
- NX-OS (standalone): e.g. 8.4(4), 7.3(8)N1(1), 9.3(9) — standard NX-OS
- IOS-XE (ASR 1000): e.g. 17.3(4a), 16.9(6), 17.9.4
- IOS-XR (ASR 9000): e.g. 7.5.2, 6.7.4
- FTD: e.g. 7.2(5), 7.0(6), 6.7.0
- ASA: e.g. 9.18(3), 9.16(1)`,
 
        messages: [{
          role: "user",
          content: `Extract all network devices from the text below.
 
For each device return:
- name: the Cisco platform name (e.g. "Nexus 9336C-FX2", "ASR 1002-HX", "Firepower 4145", "APIC-SERVER-L3")
- ver: the exact software version string if explicitly present (e.g. "9.3(9)", "17.9.4", "6.0(3e)") — if NOT present set to ""
- role: the device role using the hardware compatibility rules above (e.g. "Spine", "Leaf", "Border Leaf", "Controller", "Edge", "Firewall", "Distribution") — use the rules to determine role if not explicitly stated
- tier: infrastructure tier using the rules above (1=Controller, 2=Spine/Core, 3=Leaf, 4=Distribution/Firewall/Edge)
- isAciSwitch: boolean — true if this is a Nexus switch operating in an ACI fabric (APIC present in inventory)
- hwGen: hardware generation for ACI switches only ("gen1", "gen2", "gen3", "" for non-ACI)
 
IMPORTANT:
- Only extract versions explicitly written in the text, or derive NX-OS from APIC version using the +10 rule
- Use the hardware compatibility matrix to assign correct roles — do not rely solely on what the text says
- If a device name matches a spine-only platform, set role to "Spine" regardless of what the text says
- Return ONLY a JSON array, no markdown, no explanation
 
Return format:
[{"name":"...","ver":"...","role":"...","tier":3,"isAciSwitch":false,"hwGen":""}]
 
Text to parse:
${text.slice(0, 12000)}`,
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
 
















