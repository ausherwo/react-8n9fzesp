// api/ledger-review.js
// Read-only feed for the review side panel in JC's chat UI (RinconChatPrototype /app).
// GET /api/ledger-review            -> { summary: [...by run...] }
// GET /api/ledger-review?runId=...  -> { facts: [...] } (optionally &platform=&factType=&confidence=)
// Auth required; 403 for anyone not on the reviewer allowlist. This endpoint never
// writes — approvals/rejections only happen through JC's chat tool, api/chat.js.

const { isReviewer, memberFromToken, bearerToken, listPendingFacts, pendingSummary } = require('./_lib/ledgerReview');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const member = await memberFromToken(bearerToken(req));
  if (!member) return res.status(401).json({ error: 'unauthorised' });
  if (!isReviewer(member)) return res.status(403).json({ error: 'not_a_reviewer' });

  try {
    const { runId, platform, factType, confidence, limit } = req.query;
    if (runId || platform || factType || confidence) {
      const facts = await listPendingFacts({ runId, platform, factType, confidence, limit });
      return res.status(200).json({ facts });
    }
    const summary = await pendingSummary();
    return res.status(200).json({ summary });
  } catch (err) {
    console.error('ledger-review.js error:', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
};
