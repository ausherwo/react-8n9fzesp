// ─────────────────────────────────────────────
// /api/members.js
// GET  — list all members in caller's org
// PATCH /api/members/:id — change role
// DELETE /api/members/:id — remove member
// ─────────────────────────────────────────────

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function authMember(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'unauthorised' }); return null; }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'unauthorised' }); return null; }
  const { data: member } = await supabase
    .from('members').select('id, org_id, role').eq('user_id', user.id).single();
  if (!member) { res.status(401).json({ error: 'unauthorised' }); return null; }
  return member;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const caller = await authMember(req, res);
  if (!caller) return;

  // GET /api/members
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('members')
      .select('id, email, name, role, joined_at')
      .eq('org_id', caller.org_id)
      .order('joined_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'server_error' });
    return res.status(200).json({ members: data });
  }

  // Extract member id from URL: /api/members/:id
  const parts = req.url.split('/').filter(Boolean);
  const targetId = parts[parts.length - 1];

  // PATCH /api/members/:id — change role
  if (req.method === 'PATCH') {
    if (caller.role !== 'admin') return res.status(403).json({ error: 'insufficient_role' });
    if (targetId === caller.id)  return res.status(400).json({ error: 'cannot_change_self' });

    const { role } = req.body;
    if (!['admin', 'analyst', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    // Check last admin invariant
    if (role !== 'admin') {
      const { count } = await supabase
        .from('members').select('id', { count: 'exact', head: true })
        .eq('org_id', caller.org_id).eq('role', 'admin');
      const { data: target } = await supabase
        .from('members').select('role').eq('id', targetId).single();
      if (target?.role === 'admin' && count <= 1) {
        return res.status(409).json({ error: 'last_admin' });
      }
    }

    const { error } = await supabase
      .from('members').update({ role }).eq('id', targetId).eq('org_id', caller.org_id);
    if (error) return res.status(500).json({ error: 'server_error' });
    return res.status(200).json({ updated: true });
  }

  // DELETE /api/members/:id — remove member
  if (req.method === 'DELETE') {
    if (caller.role !== 'admin') return res.status(403).json({ error: 'insufficient_role' });
    if (targetId === caller.id)  return res.status(400).json({ error: 'cannot_remove_self' });

    // Check last admin invariant
    const { data: target } = await supabase
      .from('members').select('role').eq('id', targetId).single();
    if (target?.role === 'admin') {
      const { count } = await supabase
        .from('members').select('id', { count: 'exact', head: true })
        .eq('org_id', caller.org_id).eq('role', 'admin');
      if (count <= 1) return res.status(409).json({ error: 'last_admin' });
    }

    const { error } = await supabase
      .from('members').delete().eq('id', targetId).eq('org_id', caller.org_id);
    if (error) return res.status(500).json({ error: 'server_error' });
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};