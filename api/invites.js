// /api/invites.js
// POST   — create and send invite
// GET    — list pending invites for org
// DELETE /api/invites/:id — revoke invite

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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
    .from('members').select('id, org_id, role, email').eq('user_id', user.id).single();
  if (!member) { res.status(401).json({ error: 'unauthorised' }); return null; }
  return member;
}

function generateToken(email, orgId) {
  const secret = process.env.INVITE_HMAC_SECRET;
  const data   = `${email}:${orgId}:${Date.now()}:${Math.random()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const caller = await authMember(req, res);
  if (!caller) return;

  if (caller.role !== 'admin') return res.status(403).json({ error: 'insufficient_role' });

  // GET — list pending invites
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('invites')
      .select('id, email, role, created_at, expires_at, accepted_at')
      .eq('org_id', caller.org_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'server_error' });
    return res.status(200).json({ invites: data });
  }

  // DELETE — revoke invite
  if (req.method === 'DELETE') {
    const parts = req.url.split('/').filter(Boolean);
    const inviteId = parts[parts.length - 1];
    const { error } = await supabase
      .from('invites').delete().eq('id', inviteId).eq('org_id', caller.org_id);
    if (error) return res.status(500).json({ error: 'server_error' });
    return res.status(200).json({ deleted: true });
  }

  // POST — create invite
  if (req.method === 'POST') {
    const { email, role } = req.body;

    if (!email) return res.status(400).json({ error: 'email_required' });
    if (!['analyst', 'viewer'].includes(role)) return res.status(400).json({ error: 'invalid_role' });

    // Check member doesn't already exist
    const { data: existing } = await supabase
      .from('members').select('id').eq('org_id', caller.org_id).eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'member_already_exists' });

    // Check no pending invite
    const { data: pending } = await supabase
      .from('invites').select('id')
      .eq('org_id', caller.org_id).eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();
    if (pending) return res.status(409).json({ error: 'invite_already_pending' });

    const token     = generateToken(email, caller.org_id);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertErr } = await supabase
      .from('invites')
      .insert({ org_id: caller.org_id, email, role, token, invited_by: caller.id, expires_at: expiresAt })
      .select('id').single();

    if (insertErr) return res.status(500).json({ error: 'server_error' });

    // Send email via Resend
    const inviteUrl = `${process.env.REACT_APP_URL || 'https://netwrkr-app-alpha.vercel.app'}/accept-invite?token=${token}`;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'netwrkr.ai <noreply@netwrkr.ai>',
          to:      [email],
          subject: `You've been invited to netwrkr.ai`,
          html:    `<p>You've been invited to join netwrkr.ai as <strong>${role}</strong>.</p>
                    <p><a href="${inviteUrl}">Accept invite</a></p>
                    <p>This link expires in 48 hours.</p>`,
        }),
      }).catch(err => console.error('Resend error:', err));
    }

    return res.status(201).json({ invite_id: invite.id });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};