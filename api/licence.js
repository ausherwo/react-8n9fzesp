// /api/licence.js — v1.0
// Returns licence status and usage for the caller's org
// Called on AppPage mount and after each analysis

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Verify JWT
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'unauthorised' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'unauthorised' });

  const { data: member } = await supabase
    .from('members')
    .select('id, org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member) return res.status(401).json({ error: 'unauthorised' });

  // Fetch licence for this org
  const { data: licence, error } = await supabase
    .from('licences')
    .select('plan, status, analyses_used, analyses_limit, current_period_end')
    .eq('org_id', member.org_id)
    .single();

  if (error || !licence) {
    return res.status(404).json({ error: 'licence_not_found' });
  }

  return res.status(200).json({
    plan:               licence.plan,
    status:             licence.status,
    analyses_used:      licence.analyses_used,
    analyses_limit:     licence.analyses_limit,
    remaining:          Math.max(licence.analyses_limit - licence.analyses_used, 0),
    current_period_end: licence.current_period_end,
  });
};