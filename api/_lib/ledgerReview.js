// api/_lib/ledgerReview.js
// Shared helpers for reviewing Freddy the Ledger's pending facts.
// Used by both api/ledger-review.js (the side-panel data feed) and api/chat.js
// (the conversational review tools). Not routed by Vercel — files under an
// underscore-prefixed folder in /api are excluded from automatic routing.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Netwrkr staff allowed to review Freddy's facts. This is deliberately an
// allowlist independent of org role (admin/analyst/viewer is a per-customer-org
// concept and says nothing about who's trusted to review the shared ledger).
// Set via LEDGER_REVIEWER_EMAILS (comma-separated) in the Vercel project's env
// vars — intentionally NOT hardcoded here, since this repo is public on GitHub.
// No env var set = no reviewers (fails closed, not open).
function reviewerAllowlist() {
  const raw = process.env.LEDGER_REVIEWER_EMAILS;
  if (!raw) return [];
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function isReviewer(member) {
  if (!member?.email) return false;
  return reviewerAllowlist().includes(member.email.toLowerCase());
}

// Resolves the caller's member row from a bearer token. Returns null if the
// token is missing/invalid — callers decide what that means for them.
async function memberFromToken(token) {
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: member } = await supabase
    .from('members').select('id, email, name, org_id, role').eq('user_id', user.id).single();
  return member || null;
}

function bearerToken(req) {
  return req.headers.authorization?.split(' ')[1] || null;
}

const FACT_FIELDS = 'id, run_id, platform, component, version, fact_type, title, confidence, source_url, source_date, found_at, review_status, review_note';

// Lists pending facts, newest run first, grouped implicitly by the sort order
// (run, then platform, then fact_type) so consecutive facts read as a group.
// Assigns a `ref` (#1, #2, ...) stable only within this one result set — good
// enough for a model to tag facts in one reply and resolve "#3" back to an id
// a user references in their next turn.
async function listPendingFacts({ runId, platform, factType, confidence, limit } = {}) {
  let query = supabase
    .from('ledger_facts')
    .select(`${FACT_FIELDS}, ledger_runs ( id, started_at )`)
    .eq('review_status', 'pending');

  if (runId) query = query.eq('run_id', runId);
  if (platform) query = query.eq('platform', platform);
  if (factType) query = query.eq('fact_type', factType);
  if (confidence) query = query.eq('confidence', confidence);

  const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  query = query.order('run_id', { ascending: false }).order('platform').order('fact_type').order('found_at', { ascending: false }).limit(cappedLimit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data || []).map((row, i) => ({
    ref: i + 1,
    id: row.id,
    run_id: row.run_id,
    run_started_at: row.ledger_runs?.started_at || null,
    platform: row.platform,
    component: row.component,
    version: row.version,
    fact_type: row.fact_type,
    title: row.title,
    confidence: row.confidence,
    source_url: row.source_url,
    source_date: row.source_date,
    found_at: row.found_at,
  }));
}

// Grouped counts come from a SQL-side GROUP BY (public.ledger_review_summary) rather
// than pulling every pending row and aggregating in JS — pending facts can run into the
// thousands, well past PostgREST's default row cap, which would silently undercount.
async function pendingSummary() {
  const { data, error } = await supabase.rpc('ledger_review_summary');
  if (error) throw new Error(error.message);

  const runs = new Map();
  for (const row of data || []) {
    const key = row.run_id || 'unknown';
    if (!runs.has(key)) {
      runs.set(key, { run_id: row.run_id, run_started_at: row.run_started_at || null, count: 0, by_platform: {}, by_fact_type: {}, flagged: 0 });
    }
    const r = runs.get(key);
    const n = Number(row.cnt) || 0;
    r.count += n;
    r.by_platform[row.platform] = (r.by_platform[row.platform] || 0) + n;
    r.by_fact_type[row.fact_type] = (r.by_fact_type[row.fact_type] || 0) + n;
    if (row.confidence === 'flagged') r.flagged += n;
  }
  return [...runs.values()].sort((a, b) => new Date(b.run_started_at || 0) - new Date(a.run_started_at || 0));
}

// Writes ONLY review_status, reviewed_by, reviewed_at (+ the reviewer's own
// optional note) — never fact content. Refuses anything not currently pending
// so a fact can't be silently re-reviewed or have its decision overwritten.
async function applyReviews(items, reviewerId) {
  const updated = [];
  const skipped = [];
  for (const item of items || []) {
    const { id, decision, note } = item || {};
    if (!id || !['approved', 'rejected'].includes(decision)) {
      skipped.push({ id, reason: 'invalid_item' });
      continue;
    }
    const { data, error } = await supabase
      .from('ledger_facts')
      .update({
        review_status: decision,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      })
      .eq('id', id)
      .eq('review_status', 'pending')
      .select('id, title, review_status')
      .single();
    if (error || !data) {
      skipped.push({ id, reason: 'not_pending_or_not_found' });
      continue;
    }
    updated.push(data);
  }
  return { updated, skipped };
}

module.exports = {
  supabase,
  isReviewer,
  memberFromToken,
  bearerToken,
  listPendingFacts,
  pendingSummary,
  applyReviews,
};
