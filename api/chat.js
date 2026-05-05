// api/chat.js

// Vercel serverless function — Kelly chat conversation turns

// Public endpoint — no auth required (free tier, unauthenticated users)

// v1.1 — auth removed, Kelly persona, response field fixed

module.exports = async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") return res.status(200).end();

          if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

            const { messages, system, fabricContext, psirtContext, maxTokens } = req.body;

              if (!messages || !Array.isArray(messages) || messages.length === 0) {

                  return res.status(400).json({ error: "invalid_request", message: "messages array is required" });

                    }

                      const apiKey = process.env.ANTHROPIC_API_KEY;

                        if (!apiKey) {

                            return res.status(500).json({ error: "upstream_error", message: "Anthropic API key not configured" });

                              }

                                const systemPrompt = system || buildKellyPrompt(fabricContext || null, psirtContext || null);

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

                                                                                                      max_tokens: maxTokens || 1500,

                                                                                                              system: systemPrompt,

                                                                                                                      messages: messages,

                                                                                                                            }),

                                                                                                                                });

                                                                                                                                    const data = await response.json();

                                                                                                                                        if (data.error) {

                                                                                                                                              console.error("Anthropic error:", data.error);

                                                                                                                                                    return res.status(502).json({ error: "upstream_error", message: data.error.message });

                                                                                                                                                        }

                                                                                                                                                            const text = data.content[0].text;

                                                                                                                                                                return res.status(200).json({ content: text, text });

                                                                                                                                                                  } catch (err) {

                                                                                                                                                                      console.error("chat.js error:", err.message);

                                                                                                                                                                          return res.status(502).json({ error: "upstream_error", message: err.message });

                                                                                                                                                                            }

                                                                                                                                                                            };

                                                                                                                                                                            function buildKellyPrompt(fabricContext, psirtContext) {

                                                                                                                                                                              const base = `You are Kelly, an expert Cisco data centre network engineer embedded in netwrkr.ai. Named after Kelly Slater — the greatest of all time. You have deep knowledge of:

                                                                                                                                                                              - Cisco ACI fabric architecture (APIC, Nexus 9000 series, spines, leafs, border leafs)

                                                                                                                                                                              - NX-OS and ACI software versions, known bugs, CVEs, and upgrade paths

                                                                                                                                                                              - Cisco PSIRT advisories and CSC bug IDs

                                                                                                                                                                              - DC fabric upgrade sequencing (Controllers → Spine → Border Leaf → Leaf)

                                                                                                                                                                              - BGP, VXLAN/EVPN, vPC, ECMP, and other DC networking protocols

                                                                                                                                                                              - End-of-life / end-of-support implications for Cisco hardware and software

                                                                                                                                                                              - Maintenance window planning and change risk assessment

                                                                                                                                                                              BEHAVIOUR RULES:

                                                                                                                                                                              1. Be direct and precise — DC engineers don't want padding

                                                                                                                                                                              2. When discussing bugs or vulnerabilities, always distinguish between verified (PSIRT confirmed) and your training knowledge

                                                                                                                                                                              3. Never fabricate CSC IDs — if you don't know the exact ID, say so

                                                                                                                                                                              4. Upgrade recommendations must follow the tier order: Controllers first, then Spine, then Border Leaf, then Leaf

                                                                                                                                                                              5. Use cautious language for unverified findings: "may affect", "worth checking", "review recommended"

                                                                                                                                                                              6. When fabric context is provided, ground your answers in that data first before drawing on general knowledge

                                                                                                                                                                              7. Keep responses focused and specific — 2-4 sentences unless a detailed sequence is needed

                                                                                                                                                                              8. Reference verified CSC IDs by name when present

                                                                                                                                                                              TONE: Technical peer, not a customer service agent. Senior network architect talking to another engineer.

                                                                                                                                                                              FORMAT: Use plain text. For lists use dashes. For version numbers use exact notation (e.g. 9.3(9), 16.1(5e)). No markdown headers.`;

                                                                                                                                                                                let prompt = base;

                                                                                                                                                                                  if (fabricContext) {

                                                                                                                                                                                      prompt += `\n\n─────────────────────────────────────────────

                                                                                                                                                                                      FABRIC CONTEXT — loaded from engineer's analysis

                                                                                                                                                                                      ─────────────────────────────────────────────

                                                                                                                                                                                      ${fabricContext}

                                                                                                                                                                                      When answering questions, treat this fabric data as ground truth. Reference specific devices, versions, and roles from this inventory in your answers.`;

                                                                                                                                                                                        }

                                                                                                                                                                                          if (psirtContext) {

                                                                                                                                                                                              prompt += `\n\n─────────────────────────────────────────────

                                                                                                                                                                                              VERIFIED PSIRT DATA (live Cisco PSIRT API)

                                                                                                                                                                                              ─────────────────────────────────────────────

                                                                                                                                                                                              ${psirtContext}`;

                                                                                                                                                                                                }

                                                                                                                                                                                                  return prompt;

                                                                                                                                                                                                  }