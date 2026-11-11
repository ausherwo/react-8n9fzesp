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

// ---- Grounding the main Kelly/JC chat in approved ledger facts ----
// Unlike REVIEW_TOOLS above (a client-side tool loop for reviewers only), the main
// streaming chat path grounds itself by pulling a handful of likely-relevant approved
// facts server-side, before the request to Anthropic, and injecting them into the
// system prompt — same pattern as the existing fabricContext/psirtContext blocks, no
// tool loop and no change to the streaming response shape.

const PLATFORM_HINTS = [
  { platform: 'aci', pattern: /\b(aci|apic)\b/i },
  { platform: 'nxos', pattern: /\b(nx-?os|nexus|vxlan|evpn|vpc)\b/i },
];

const FACT_TYPE_HINTS = [
  { type: 'bug', pattern: /\b(bug|csc[a-z]{2}\d{4,6}|defect|crash(es|ed|ing)?|blackhole)\b/i },
  { type: 'upgrade_path', pattern: /\b(upgrad\w*|issu|migrat\w*)\b/i },
  { type: 'compatibility', pattern: /\b(compat\w*|interop\w*|support(ed)?\s+matrix)\b/i },
  { type: 'scale_limit', pattern: /\b(scale\w*|scalab\w*|\blimit(s)?\b|maximum|capacity)\b/i },
  { type: 'lifecycle', pattern: /\b(eol|eos|end[\s-]?of[\s-]?(life|sale|support)|lifecycle|last date of support)\b/i },
  { type: 'design_guidance', pattern: /\b(design|best practice|recommend\w*|guidance)\b/i },
];

const VERSION_PATTERN = /\b\d{1,2}\.\d{1,2}(?:\.\d{1,2})?(?:\(\d+[a-z]?\))?\b/gi;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'for', 'with', 'that', 'this', 'it', 'as', 'at', 'by',
  'from', 'my', 'our', 'your', 'their', 'i', 'we', 'you', 'they', 'he', 'she',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'will', 'what', 'which',
  'who', 'when', 'where', 'why', 'how', 'about', 'into', 'than', 'then', 'so',
  'if', 'not', 'no', 'have', 'has', 'had', 'just', 'like', 'get', 'got', 'need',
  'want', 'please', 'tell', 'me', 'us', 'there', 'here', 'some', 'any', 'all',
]);

// Pulls a loose query (platform, candidate fact_types, version prefixes, keywords)
// out of free-form chat text. Returns null when nothing in the message looks like
// it's asking about Cisco DC facts at all, so unrelated chat never triggers a query.
function extractLedgerQuery(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  let platform = null;
  for (const h of PLATFORM_HINTS) {
    if (h.pattern.test(lower)) { platform = h.platform; break; }
  }

  const factTypes = FACT_TYPE_HINTS.filter(h => h.pattern.test(lower)).map(h => h.type);
  const versions = [...new Set(text.match(VERSION_PATTERN) || [])];

  // Longer words first, not sentence order: a cap taken in sentence order
  // systematically favors generic lead-in words ("beyond", "those", "aware")
  // over the technical nouns that tend to show up later in a real question
  // ("border", "leaf", "9332c") — which meant the single most relevant fact
  // could get silently dropped before the search ever ran. Sort by length
  // (stable, so same-length words keep their original order) before capping.
  const keywords = [...new Set(
    lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w))
  )].sort((a, b) => b.length - a.length).slice(0, 12);

  if (!platform && !factTypes.length && !versions.length && !keywords.length) return null;
  return { platform, factTypes, versions, keywords };
}

// Strips the parenthetical maintenance-release suffix (e.g. "16.0(3e)" -> "16.0") so
// a version mentioned in chat matches any patch of the same major.minor train stored
// in the ledger, without having to worry about escaping "(" / ")" in a PostgREST filter.
function versionPrefix(v) {
  const m = v.match(/^\d{1,2}\.\d{1,2}/);
  return m ? m[0] : v.replace(/[()]/g, '');
}

async function searchApprovedFacts({ platform, factTypes, versions, keywords, limit = 8 } = {}) {
  let query = supabase
    .from('ledger_facts')
    .select(`${FACT_FIELDS}, detail`)
    .eq('review_status', 'approved');

  if (platform) query = query.eq('platform', platform);
  if (factTypes && factTypes.length) query = query.in('fact_type', factTypes);

  // Version and keyword filters are independent .or() groups, so when both are present
  // they AND together (version match narrows to the right release; keyword match then
  // narrows a release's many bugs/facts down to the one(s) actually asked about).
  if (versions && versions.length) {
    const prefixes = [...new Set(versions.map(versionPrefix))];
    query = query.or(prefixes.map(p => `version.ilike.${p}%`).join(','));
  }
  if (keywords && keywords.length) {
    query = query.or(keywords.map(k => `title.ilike.%${k}%`).join(','));
  }

  const cappedLimit = Math.min(Math.max(Number(limit) || 8, 1), 25);
  query = query.order('found_at', { ascending: false }).limit(cappedLimit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

// Renders matched facts as a plain-text block for the system prompt. `detail`'s shape
// varies by fact_type (bug: symptom/trigger_condition/affected_versions; lifecycle:
// eol/eos dates; scale_limit: thresholds; ...) so this just lists whatever keys are
// present rather than assuming a fixed shape.
function formatLedgerContext(facts) {
  if (!facts || !facts.length) return null;
  return facts.map(f => {
    const detailStr = f.detail && typeof f.detail === 'object'
      ? Object.entries(f.detail).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k}: ${v}`).join('; ')
      : '';
    const lines = [`[${f.fact_type}] ${f.title}`];
    lines.push(`platform: ${f.platform}${f.version ? `, version: ${f.version}` : ''}`);
    if (detailStr) lines.push(detailStr);
    if (f.source_url) lines.push(`source: ${f.source_url}`);
    return lines.join('\n');
  }).join('\n\n');
}

// ---- Source citations for the JC chat UI ----
// The system prompt is the only thing that actually conditions the model's answer — there's
// no tool loop to ask it which facts it used. So "cited" here means: the fact's own identifying
// text (its CSC bug ID, or else enough of its distinctive title words) shows up verbatim in the
// model's final answer. That's a deliberately conservative bar — it can under-cite (miss a fact
// the model paraphrased rather than quoted) but it can't fabricate a citation for a fact the
// answer never actually touched.
const CSC_ID_PATTERN = /CSC[a-z]{2}\d{4,6}/i;

function factIdentifier(fact) {
  const cscMatch = fact.title.match(CSC_ID_PATTERN);
  if (cscMatch) return { kind: 'id', value: cscMatch[0].toLowerCase() };
  const words = [...new Set(
    fact.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 5 && !STOPWORDS.has(w))
  )];
  return { kind: 'keywords', value: words };
}

function factIsCited(fact, answerLower) {
  const ident = factIdentifier(fact);
  if (ident.kind === 'id') return answerLower.includes(ident.value);
  if (!ident.value.length) return false;
  const needed = ident.value.length >= 2 ? 2 : 1;
  return ident.value.filter(w => answerLower.includes(w)).length >= needed;
}

// fact_type -> citation colour group. design_guidance is the only type sourced from Cisco
// Validated Designs (teal); every other type comes from Cisco's published release notes (gold).
function factColorGroup(factType) {
  return factType === 'design_guidance' ? 'cvd' : 'release_notes';
}

function factCitation(fact) {
  const source = factColorGroup(fact.fact_type);
  const ref = source === 'release_notes' && fact.version
    ? `${(fact.platform || '').toUpperCase()} ${fact.version}`
    : fact.title;
  return { source, ref, sourceUrl: fact.source_url || null };
}

// Returns at most one citation per colour group (release_notes, cvd) — `facts` is already
// ordered newest-first, so the first cited fact in each group wins.
function matchLedgerCitations(facts, answerText) {
  if (!facts?.length || !answerText) return [];
  const lower = answerText.toLowerCase();
  const seen = new Set();
  const citations = [];
  for (const fact of facts) {
    if (!factIsCited(fact, lower)) continue;
    const group = factColorGroup(fact.fact_type);
    if (seen.has(group)) continue;
    seen.add(group);
    citations.push(factCitation(fact));
  }
  return citations;
}

// Parses the plain-text PSIRT block built by queryPSIRTForDevices (src/chat/ChatPrimitives.js)
// back into structured advisories — e.g. "  - [HIGH] cisco-sa-nxos-rbac — Title | Fixed: ...".
// Must stay in sync with that function's line format.
const PSIRT_LINE_PATTERN = /^\s*-\s*\[[A-Z]+\]\s+([\w.-]+)\s+—\s+(.+?)(?:\s\|.*)?$/;

function parsePsirtAdvisories(psirtContext) {
  if (!psirtContext) return [];
  const advisories = [];
  for (const line of psirtContext.split('\n')) {
    const m = line.match(PSIRT_LINE_PATTERN);
    if (m) advisories.push({ id: m[1], title: m[2].trim() });
  }
  return advisories;
}

// Same conservative bar as ledger facts: only cited if the advisory's own id appears
// verbatim in the answer. Returns at most one citation (the pill shows one PSIRT source).
function matchPsirtCitation(psirtContext, answerText) {
  if (!answerText) return null;
  const advisories = parsePsirtAdvisories(psirtContext);
  const lower = answerText.toLowerCase();
  const hit = advisories.find(a => lower.includes(a.id.toLowerCase()));
  return hit ? { source: 'psirt', ref: hit.id, sourceUrl: null } : null;
}

module.exports = {
  supabase,
  isReviewer,
  memberFromToken,
  bearerToken,
  listPendingFacts,
  pendingSummary,
  applyReviews,
  extractLedgerQuery,
  searchApprovedFacts,
  formatLedgerContext,
  matchLedgerCitations,
  matchPsirtCitation,
};
