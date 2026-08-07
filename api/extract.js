// api/extract.js
// Vercel serverless function — device extraction from raw inventory text
// v1.5 — fix: corrected invalid model string ("claude-sonnet-4-6" was not a real model,
// caused every extraction call to fail silently). Now matches chat.js.

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
        model: "claude-sonnet-5",
        max_tokens: 8000,
        system: `You are a data extraction engine for a Cisco network analysis tool.
Your only job is to extract network devices from text and return structured JSON.
You never guess or infer software versions — only extract what is explicitly written.
You return ONLY a valid JSON array with no markdown, no explanation, no preamble.

─────────────────────────────────────────────
STEP 1: DETERMINE FABRIC TYPE
─────────────────────────────────────────────

First, check whether an APIC controller is present in the inventory.

IF APIC IS PRESENT → this is an ACI fabric. Use ACI role rules below.
IF NO APIC IS PRESENT → this is a standalone NX-OS fabric (VXLAN/EVPN or traditional).
  Use standalone NX-OS role rules instead. Do NOT apply ACI role rules.

─────────────────────────────────────────────
STANDALONE NX-OS ROLE RULES (no APIC present)
─────────────────────────────────────────────

In standalone NX-OS fabrics, assign roles based on platform capability and position:

HIGH-DENSITY SPINE PLATFORMS (tier 2, role "Spine"):
These platforms have high port density and are used as spines in leaf-spine fabrics:
- Nexus 9336C-FX2 (36x 100G — spine class)
- Nexus 9364C, 9364C-GX (64x 100G — spine class)
- Nexus 9508, 9504, 9516 with spine line cards
- Nexus 9332PQ, 9336PQ (spine class)
- Nexus 7700, 7000 series — role "Core" or "Distribution", tier 2

BORDER LEAF / WAN-FACING PLATFORMS (tier 2, role "Border Leaf"):
These platforms are commonly used as border leafs with external routing:
- Nexus 9332C (32x 100G — commonly border leaf in VXLAN fabrics)
- Nexus 93180YC-EX when adjacent to firewall, ASR, or WAN device
- Any platform explicitly described as border, WAN-facing, or with BGP/L3Out context

STANDARD LEAF PLATFORMS (tier 3, role "Leaf"):
- Nexus 93180YC-EX (standard 48x25G + 6x100G leaf)
- Nexus 93108TC-EX, 93180YC-FX, 93108TC-FX
- Nexus 93240YC-FX2, 93360YC-FX2
- Nexus 3000/3100/3200 series

ROLE AMBIGUITY RULE FOR STANDALONE FABRICS:
- If multiple identical platforms exist and some are labelled spine/border/leaf, apply those labels to all
- If hostnames contain hints (SPINE, BORDER, LEAF, BL, SP, VTEP) use those hints
- If truly ambiguous and platform is high-density (36+ ports, 100G), default to Spine
- If truly ambiguous and platform is 48x25G class, default to Leaf

─────────────────────────────────────────────
ACI FABRIC ROLE RULES (APIC present)
─────────────────────────────────────────────

APIC CONTROLLERS (tier 1, role "Controller"):
- Any platform with "APIC" in the name

ACI SPINE-ONLY PLATFORMS (tier 2, role "Spine"):
- Nexus 9332C (Gen 2 spine in ACI — NOT a leaf in ACI)
- Nexus 9364C, 9364C-GX
- Nexus 9336PQ, 9332PQ (Gen 1 spine)
- Nexus 9504, 9508, 9516 with -EX or -FX line cards

ACI SPINE-OR-LEAF PLATFORMS (tier 2, role "Spine" unless explicitly leaf):
- Nexus 9336C-FX2 (used as leaf in most ACI deployments — default to "Leaf" tier 3, BUT if hostname contains SP, SPINE, or spine-class hints then assign "Spine" tier 2)
- Nexus 9316D, 93600CD-GX, 9332D-GX2B

HOSTNAME HINTS (apply in both ACI and standalone fabrics):
- Hostname contains SP, SPINE → role "Spine", tier 2
- Hostname contains BL, BORDER → role "Border Leaf", tier 2
- Hostname contains LEAF, LF → role "Leaf", tier 3
- Hostname contains SWITCH, SW → role "Switch", tier 3
- Hostname contains APIC, CTRL → role "Controller", tier 1
- Hostname contains FW, FIRE, ASA → role "Firewall", tier 4
- Hostname hints override platform defaults when present

ACI LEAF PLATFORMS (tier 3, role "Leaf" or "Border Leaf"):
- Nexus 93180YC-EX, 93108TC-EX (Gen 2 leaf)
- Nexus 93180YC-FX, 93108TC-FX, 93240YC-FX2 (Gen 2/3 leaf)
- Nexus 9336C-FX2 (Gen 2/3 — leaf in most ACI deployments)
- Nexus 93180YC-FX3, 9300-GX series (Gen 3 leaf)

BORDER LEAF identification (ACI):
- Leaf adjacent to external routing, BGP, L3Out, firewall, or WAN = "Border Leaf"
- Platforms with "-EX" suffix commonly used as border leafs
- If ambiguous, default to "Leaf"

ACI VERSION RULES:
- APIC uses ACI versioning: e.g. 5.2(8e), 6.0(3e)
- ACI Nexus switches: NX-OS major = APIC major + 10
- If switch versions not listed, derive from APIC version using +10 rule

─────────────────────────────────────────────
ALL FABRIC TYPES — COMMON PLATFORMS
─────────────────────────────────────────────

ASR ROUTERS:
- ASR 1000 series — tier 4, role "Edge"
- ASR 9000 series — tier 2, role "Edge"
- ASR 920 series — tier 4, role "Edge"

CATALYST SWITCHES:
- Catalyst 9500, 9400, 9300, 9200 — tier 4, role "Distribution"
- Catalyst 6500, 6800 — tier 2, role "Distribution"

FIREWALLS (tier 4, role "Firewall"):
- Firepower 4100, 9300, 2100, 1000 series
- ASA 5500-X, 5500 series

MDS SAN SWITCHES (tier 3, role "SAN Switch"):
- MDS 9000 series

SOFTWARE VERSION FORMATS:
- APIC: 5.2(8e), 6.0(3e)
- NX-OS ACI: 15.2(8e), 16.0(3e)
- NX-OS standalone: 9.3(9), 8.4(4), 7.3(8)N1(1)
- IOS-XE: 17.3(4a), 16.9(6)
- IOS-XR: 7.5.2, 6.7.4
- FTD: 7.2(5), 7.0(6)
- ASA: 9.18(3), 9.16(1)`,

        messages: [{
          role: "user",
          content: `Extract all network devices from the text below.

IMPORTANT: First check if an APIC is present. If yes → ACI fabric rules. If no → standalone NX-OS rules.

For each device return:
- name: the Cisco platform name (e.g. "Nexus 9336C-FX2", "ASR 1002-HX", "Firepower 4145")
- ver: exact software version if explicitly present — if NOT present set to ""
- role: device role using the correct fabric-type rules above
- tier: infrastructure tier (1=Controller, 2=Spine/Core, 3=Leaf, 4=Distribution/Firewall/Edge)
- isAciSwitch: true if Nexus switch in an ACI fabric (APIC present), false otherwise
- hwGen: hardware generation for ACI switches only ("gen1", "gen2", "gen3", "" for non-ACI)

CRITICAL RULES:
- Never version-guess — only use explicitly written versions or ACI +10 derivation
- Apply standalone NX-OS rules when no APIC is present — do not use ACI role logic
- In standalone fabrics: 9336C-FX2 = Spine, 9332C = Border Leaf, 93180YC-EX = Leaf
- In ACI fabrics: 9332C = Spine, 9336C-FX2 = Leaf (usually), 93180YC-EX = Leaf
- HOSTNAME HINTS ALWAYS OVERRIDE PLATFORM DEFAULTS: SP/SPINE in hostname = Spine, BL/BORDER = Border Leaf, LEAF/LF = Leaf
- Return ONLY a JSON array, no markdown, no explanation

Return format:
[{"name":"...","ver":"...","role":"...","tier":3,"isAciSwitch":false,"hwGen":""}]

Text to parse:
${text.slice(0, 20000)}`,
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic error:", data.error);
      return res.status(502).json({ error: "upstream_error", message: data.error.message });
    }

    const textBlock = (data.content || []).find(b => b.type === "text");
    if (!textBlock || typeof textBlock.text !== "string") {
      console.error("extract.js: no text block in response. content:", JSON.stringify(data.content));
      return res.status(502).json({ error: "upstream_error", message: "Model returned no text content" });
    }
    const raw = textBlock.text.replace(/```json\n?|\n?```/g, "").trim();

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

// Vercel function config — extended timeout for large inventories
module.exports.config = {
  maxDuration: 60,
};
