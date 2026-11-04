// api/refresh-home-suggestions.js
// Vercel Cron job (see vercel.json "crons") — runs daily, generates a fresh batch of
// JC homepage suggestion chips grounded in what visitors are actually asking and what
// Freddy the Ledger has actually found, and swaps them in for the previous batch.
//
// Protected by CRON_SECRET: Vercel's own cron invocations send
// `Authorization: Bearer <CRON_SECRET>` automatically when that env var is set on the
// project — set it in Vercel's env vars (any random string) before relying on this.
// A manual call without that header is refused.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_SUGGESTIONS = 5;

async function recentConversationQuestions() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('content')
    .eq('role', 'user')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(`conversation query failed: ${error.message}`);
  return (data || [])
    .map(r => (r.content || '').trim())
    .filter(t => t.length >= 12 && t.length <= 300 && !t.startsWith('['))
    .slice(0, 120);
}

async function recentFreddyFindings() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('ledger_facts')
    .select('title, fact_type, platform')
    .eq('confidence', 'confirmed')
    .gte('found_at', since)
    .order('found_at', { ascending: false })
    .limit(60);
  if (error) throw new Error(`ledger_facts query failed: ${error.message}`);
  return (data || []).map(f => `[${f.platform}/${f.fact_type}] ${f.title}`);
}

async function generateSuggestions(apiKey, questions, findings) {
  const prompt = `You write the suggested-question chips shown on JC's (netwrkr.ai's Cisco DC networking copilot) public homepage, to anonymous first-time visitors.

Below are real recent visitor questions and real recent research findings from Freddy the Ledger (netwrkr's research agent). Use them only as inspiration for topics that are genuinely coming up right now — never copy specifics from them.

RECENT VISITOR QUESTIONS:
${questions.length ? questions.map(q => `- ${q}`).join('\n') : '(none available)'}

RECENT FREDDY FINDINGS:
${findings.length ? findings.map(f => `- ${f}`).join('\n') : '(none available)'}

Write exactly ${MAX_SUGGESTIONS} suggestion chips. Hard rules:
- Each is a short, generic question any visitor could ask — never a specific device name, hostname, IP address, serial number, CSC bug ID, software version string, or anything that could identify a real customer's fabric or a real conversation.
- Cover a mix of topics (upgrade sequencing, bug/CVE research, version compatibility, design guidance, EOL/lifecycle) — don't repeat the same topic twice.
- Under 80 characters each.
- Phrased as a question, in plain English, no markdown.
- One entry may instead be the literal string "Upload a config file to analyse your fabric →" if it isn't already obviously covered.

Return ONLY a JSON array of ${MAX_SUGGESTIONS} strings. No other text.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    let message = `Anthropic API error (${response.status})`;
    try { const errJson = await response.json(); message = errJson.error?.message || message; } catch {}
    throw new Error(message);
  }
  const data = await response.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Could not find a JSON array in the model's response: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed) || parsed.some(s => typeof s !== 'string')) {
    throw new Error('Model did not return an array of strings');
  }
  return parsed.slice(0, MAX_SUGGESTIONS).map(s => s.trim()).filter(Boolean);
}

module.exports = async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'unauthorised' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'upstream_error', message: 'Anthropic API key not configured' });

  try {
    const [questions, findings] = await Promise.all([
      recentConversationQuestions(),
      recentFreddyFindings(),
    ]);

    const suggestions = await generateSuggestions(apiKey, questions, findings);
    if (suggestions.length === 0) throw new Error('Generated zero usable suggestions');

    // Swap the active batch atomically-ish: insert the new rows first (so a failure here
    // leaves the previous batch live), then deactivate everything else.
    const source = (questions.length || findings.length) ? 'conversation' : 'seed';
    const rows = suggestions.map(text => ({ text, source, active: true }));
    const { data: inserted, error: insertErr } = await supabase.from('home_suggestions').insert(rows).select('id');
    if (insertErr) throw new Error(`insert failed: ${insertErr.message}`);

    const newIds = inserted.map(r => r.id);
    const { error: deactivateErr } = await supabase
      .from('home_suggestions')
      .update({ active: false })
      .not('id', 'in', `(${newIds.join(',')})`);
    if (deactivateErr) throw new Error(`deactivate failed: ${deactivateErr.message}`);

    return res.status(200).json({ ok: true, count: suggestions.length, suggestions, basedOn: { questions: questions.length, findings: findings.length } });
  } catch (err) {
    console.error('refresh-home-suggestions.js error:', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
