// SettingsPage.js — v1.0
// Three tabs: Account (all roles), Team (admin only), Billing (admin only)
// Route: /settings  — add ?tab=team or ?tab=billing to deep-link
//
// Add to App.js Router:
//   import { SettingsPage } from './SettingsPage';
//   if (path === '/settings') return <AuthGuard><SettingsPage /></AuthGuard>;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────
// DESIGN TOKENS — matches netwrkr.ai system
// ─────────────────────────────────────────────
const G   = '#D4A000';
const BG  = '#080806';
const MONO = "'JetBrains Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const t = {
  shell:      { minHeight: '100vh', background: BG, fontFamily: SANS, color: '#E8E4D8' },
  topbar:     { background: '#0D0D0A', borderBottom: '1px solid rgba(212,160,0,0.12)', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:       { fontFamily: MONO, fontSize: 14, fontWeight: 600, color: G },
  logoDim:    { color: '#7A7668', fontWeight: 300 },
  backBtn:    { background: 'none', border: '1px solid rgba(212,160,0,0.15)', color: '#7A7668', fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer', transition: 'all 0.15s' },
  content:    { maxWidth: 820, margin: '0 auto', padding: '40px 32px' },
  pageTitle:  { fontFamily: MONO, fontSize: 20, fontWeight: 600, color: '#E8E4D8', marginBottom: 6 },
  pageSlug:   { fontFamily: MONO, fontSize: 10, color: '#4A4840', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 32 },
  tabs:       { display: 'flex', borderBottom: '1px solid rgba(212,160,0,0.12)', marginBottom: 36 },
  tab:        { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#4A4840', fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 20px', cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s, border-color 0.15s' },
  tabActive:  { color: G, borderBottomColor: G },
  section:    { marginBottom: 36 },
  sectionHead:{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4A4840', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(212,160,0,0.06)' },
  card:       { background: '#0D0D0A', border: '1px solid rgba(212,160,0,0.12)', padding: '20px 24px', marginBottom: 12 },
  row:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  label:      { fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7668', marginBottom: 6, display: 'block' },
  value:      { fontSize: 14, color: '#E8E4D8' },
  valueDim:   { fontSize: 13, color: '#7A7668' },
  input:      { background: '#080806', border: '1px solid rgba(212,160,0,0.15)', color: '#E8E4D8', fontFamily: MONO, fontSize: 13, padding: '10px 14px', outline: 'none', width: '100%', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box' },
  inputFocus: { borderColor: 'rgba(212,160,0,0.5)', boxShadow: '0 0 0 3px rgba(212,160,0,0.08)' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 },
  field:      { display: 'flex', flexDirection: 'column', gap: 6 },
  btnPrimary: { background: G, color: '#080806', fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 20px', border: 'none', cursor: 'pointer', transition: 'background 0.15s' },
  btnSecondary:{ background: 'transparent', color: '#7A7668', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 18px', border: '1px solid rgba(212,160,0,0.15)', cursor: 'pointer', transition: 'all 0.15s' },
  btnDanger:  { background: 'rgba(192,57,43,0.08)', color: '#E07060', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 18px', border: '1px solid rgba(192,57,43,0.25)', cursor: 'pointer', transition: 'all 0.15s' },
  btnDisabled:{ opacity: 0.35, cursor: 'not-allowed' },
  badge:      { fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', display: 'inline-block' },
  success:    { background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)', color: '#2ECC71', fontFamily: MONO, fontSize: 11, padding: '10px 14px', marginBottom: 16 },
  error:      { background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.3)', color: '#E07060', fontFamily: MONO, fontSize: 11, padding: '10px 14px', marginBottom: 16 },
  divider:    { height: 1, background: 'rgba(212,160,0,0.08)', margin: '20px 0' },
  track:      { height: 4, background: 'rgba(212,160,0,0.08)', overflow: 'hidden', flex: 1 },
  bar:        { height: '100%', transition: 'width 0.4s ease' },
  initials:   { width: 36, height: 36, background: 'rgba(212,160,0,0.12)', border: '1px solid rgba(212,160,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, fontWeight: 700, color: G, flexShrink: 0 },
  memberRow:  { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(212,160,0,0.06)' },
  select:     { background: '#080806', border: '1px solid rgba(212,160,0,0.15)', color: '#E8E4D8', fontFamily: MONO, fontSize: 11, padding: '6px 10px', outline: 'none', cursor: 'pointer' },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getInitials(name, email) {
  if (name) return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
  return email?.[0]?.toUpperCase() || '?';
}

function roleBadgeStyle(role) {
  return {
    admin:   { background: 'rgba(212,160,0,0.1)',  border: '1px solid rgba(212,160,0,0.3)',  color: G },
    analyst: { background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)', color: '#3498DB' },
    viewer:  { background: 'rgba(74,72,64,0.4)',   border: '1px solid #4A4840',              color: '#7A7668' },
  }[role] || {};
}

function planBadgeStyle(plan) {
  return {
    free:       { background: 'rgba(74,72,64,0.4)',    border: '1px solid #4A4840',  color: '#7A7668' },
    pro:        { background: 'rgba(212,160,0,0.1)',   border: '1px solid #9A7400',  color: G },
    enterprise: { background: 'rgba(52,152,219,0.1)', border: '1px solid #3498DB',  color: '#3498DB' },
  }[plan] || {};
}

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...t.input, ...(focused ? t.inputFocus : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FocusSelect({ children, ...props }) {
  return <select {...props} style={t.select}>{children}</select>;
}

function Btn({ children, onClick, variant = 'primary', disabled, loading }) {
  const [hov, setHov] = useState(false);
  const base = variant === 'primary' ? t.btnPrimary
             : variant === 'danger'  ? t.btnDanger
             : t.btnSecondary;
  const hover = variant === 'primary'
    ? { background: '#E8B000', boxShadow: '0 0 16px rgba(212,160,0,0.2)' }
    : variant === 'danger'
    ? { background: 'rgba(192,57,43,0.15)', color: '#EF4444' }
    : { borderColor: '#9A7400', color: '#E8E4D8' };
  return (
    <button
      style={{ ...base, ...(hov && !disabled ? hover : {}), ...(disabled ? t.btnDisabled : {}) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function Banner({ type, message }) {
  if (!message) return null;
  return <div style={type === 'success' ? t.success : t.error}>{message}</div>;
}

// ─────────────────────────────────────────────
// ACCOUNT TAB
// All roles — update name and password
// ─────────────────────────────────────────────
function AccountTab() {
  const { member, org, session } = useAuth();
  const [name, setName]         = useState(member?.name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [nameLoading, setNameLoading]   = useState(false);
  const [pwLoading, setPwLoading]       = useState(false);
  const [nameMsg, setNameMsg]   = useState({ type: '', text: '' });
  const [pwMsg, setPwMsg]       = useState({ type: '', text: '' });

  const saveName = async () => {
    if (!name.trim()) { setNameMsg({ type: 'error', text: 'Name cannot be empty.' }); return; }
    setNameLoading(true); setNameMsg({ type: '', text: '' });

    // Update in auth.users metadata
    const { error: metaErr } = await supabase.auth.updateUser({
      data: { name: name.trim() }
    });

    // Update in members table
    const { error: dbErr } = await supabase
      .from('members')
      .update({ name: name.trim() })
      .eq('id', member.id);

    setNameLoading(false);
    if (metaErr || dbErr) {
      setNameMsg({ type: 'error', text: metaErr?.message || dbErr?.message || 'Failed to update name.' });
    } else {
      setNameMsg({ type: 'success', text: 'Name updated successfully.' });
    }
  };

  const savePassword = async () => {
    if (!newPw || newPw.length < 10) { setPwMsg({ type: 'error', text: 'Password must be at least 10 characters.' }); return; }
    if (newPw !== confirmPw)          { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return; }
    setPwLoading(true); setPwMsg({ type: '', text: '' });

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'success', text: 'Password updated. All other sessions have been signed out.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
  };

  return (
    <div>
      {/* Profile info */}
      <div style={t.section}>
        <div style={t.sectionHead}>Profile</div>
        <div style={t.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ ...t.initials, width: 52, height: 52, fontSize: 16 }}>
              {getInitials(member?.name, member?.email)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#E8E4D8', marginBottom: 4 }}>
                {member?.name || 'No name set'}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#4A4840' }}>{member?.email}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ ...t.badge, ...roleBadgeStyle(member?.role) }}>{member?.role}</span>
                {org?.name && (
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#4A4840', marginLeft: 10 }}>
                    {org.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Banner type={nameMsg.type} message={nameMsg.text} />

          <div style={t.fieldGroup}>
            <div style={t.field}>
              <label style={t.label}>Display name</label>
              <FocusInput
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
            <div style={t.field}>
              <label style={t.label}>Email address</label>
              <FocusInput type="email" value={member?.email || ''} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#4A4840', marginTop: 4 }}>
                Email cannot be changed. Contact your admin if needed.
              </span>
            </div>
          </div>
          <Btn onClick={saveName} loading={nameLoading}>Save name</Btn>
        </div>
      </div>

      {/* Password */}
      <div style={t.section}>
        <div style={t.sectionHead}>Password</div>
        <div style={t.card}>
          <Banner type={pwMsg.type} message={pwMsg.text} />
          <div style={t.fieldGroup}>
            <div style={t.field}>
              <label style={t.label}>New password</label>
              <FocusInput type="password" value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 10 characters"
                autoComplete="new-password" />
            </div>
            <div style={t.field}>
              <label style={t.label}>Confirm new password</label>
              <FocusInput type="password" value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password" />
              {confirmPw && newPw !== confirmPw && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#C0392B', marginTop: 4 }}>
                  Passwords do not match
                </span>
              )}
              {confirmPw && newPw === confirmPw && newPw.length >= 10 && (
                <span style={{ fontFamily: MONO, fontSize: 10, color: '#2ECC71', marginTop: 4 }}>
                  ✓ Passwords match
                </span>
              )}
            </div>
          </div>
          <Btn
            onClick={savePassword}
            loading={pwLoading}
            disabled={!newPw || !confirmPw || newPw !== confirmPw || newPw.length < 10}
          >
            Update password
          </Btn>
        </div>
      </div>

      {/* Danger zone */}
      <div style={t.section}>
        <div style={t.sectionHead}>Session</div>
        <div style={t.card}>
          <div style={t.row}>
            <div>
              <div style={{ fontSize: 13, color: '#E8E4D8', marginBottom: 4 }}>Sign out of all devices</div>
              <div style={{ fontSize: 12, color: '#7A7668' }}>
                Invalidates your current session and all active sessions on other devices.
              </div>
            </div>
            <Btn variant="secondary" onClick={async () => {
              await supabase.auth.signOut({ scope: 'global' });
              window.location.href = '/login';
            }}>
              Sign out all
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TEAM TAB
// Admin only — manage members and invites
// ─────────────────────────────────────────────
function TeamTab() {
  const { member: self, session } = useAuth();
  const [members, setMembers]         = useState([]);
  const [invites, setInvites]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState('analyst');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [msg, setMsg]                 = useState({ type: '', text: '' });

  const authHeader = { Authorization: `Bearer ${session?.access_token}` };

  const load = useCallback(async () => {
    setLoading(true);
    const [mRes, iRes] = await Promise.all([
      fetch('/api/members', { headers: authHeader }),
      fetch('/api/invites', { headers: authHeader }),
    ]);
    if (mRes.ok) setMembers(await mRes.json().then(d => d.members || []));
    if (iRes.ok) setInvites(await iRes.json().then(d => d.invites || []));
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!inviteEmail) { setMsg({ type: 'error', text: 'Please enter an email address.' }); return; }
    setInviteLoading(true); setMsg({ type: '', text: '' });
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    setInviteLoading(false);
    if (!res.ok) {
      setMsg({ type: 'error', text:
        data.error === 'invite_already_pending' ? 'An invite is already pending for this email.' :
        data.error === 'member_already_exists'  ? 'This person is already a member.' :
        data.error || 'Failed to send invite.'
      });
    } else {
      setMsg({ type: 'success', text: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');
      load();
    }
  };

  const changeRole = async (memberId, newRole) => {
    setMsg({ type: '', text: '' });
    const res = await fetch(`/api/members/${memberId}`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'error', text:
        data.error === 'last_admin'       ? 'Cannot demote the last admin.' :
        data.error === 'cannot_change_self' ? 'You cannot change your own role.' :
        'Failed to update role.'
      });
    } else {
      load();
    }
  };

  const removeMember = async (memberId, name) => {
    if (!window.confirm(`Remove ${name} from your organisation?`)) return;
    setMsg({ type: '', text: '' });
    const res = await fetch(`/api/members/${memberId}`, {
      method: 'DELETE', headers: authHeader,
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ type: 'error', text:
        data.error === 'last_admin' ? 'Cannot remove the last admin.' :
        'Failed to remove member.'
      });
    } else {
      load();
    }
  };

  const revokeInvite = async (inviteId) => {
    await fetch(`/api/invites/${inviteId}`, { method: 'DELETE', headers: authHeader });
    load();
  };

  const adminCount = members.filter(m => m.role === 'admin').length;

  return (
    <div>
      <Banner type={msg.type} message={msg.text} />

      {/* Current members */}
      <div style={t.section}>
        <div style={t.sectionHead}>Members — {members.length}</div>
        <div style={t.card}>
          {loading ? (
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#4A4840', padding: '8px 0' }}>Loading…</div>
          ) : members.map(m => {
            const isSelf     = m.id === self?.id;
            const isLastAdmin = m.role === 'admin' && adminCount === 1;
            const cantChange = isSelf || isLastAdmin;
            return (
              <div key={m.id} style={t.memberRow}>
                <div style={t.initials}>{getInitials(m.name, m.email)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#E8E4D8', fontWeight: 500 }}>
                    {m.name || '—'}
                    {isSelf && <span style={{ fontFamily: MONO, fontSize: 9, color: '#4A4840', marginLeft: 8 }}>you</span>}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: '#4A4840', marginTop: 2 }}>{m.email}</div>
                </div>
                <FocusSelect
                  value={m.role}
                  disabled={cantChange}
                  onChange={e => changeRole(m.id, e.target.value)}
                  style={{ ...t.select, opacity: cantChange ? 0.4 : 1 }}
                >
                  <option value="admin">admin</option>
                  <option value="analyst">analyst</option>
                  <option value="viewer">viewer</option>
                </FocusSelect>
                <Btn
                  variant="danger"
                  disabled={cantChange}
                  onClick={() => removeMember(m.id, m.name || m.email)}
                >
                  Remove
                </Btn>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div style={t.section}>
          <div style={t.sectionHead}>Pending invites — {invites.length}</div>
          <div style={t.card}>
            {invites.map(inv => (
              <div key={inv.id} style={{ ...t.memberRow, alignItems: 'flex-start' }}>
                <div style={{ ...t.initials, opacity: 0.4 }}>{inv.email[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: '#7A7668' }}>{inv.email}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span style={{ ...t.badge, ...roleBadgeStyle(inv.role) }}>{inv.role}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#4A4840' }}>
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Btn variant="danger" onClick={() => revokeInvite(inv.id)}>Revoke</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      <div style={t.section}>
        <div style={t.sectionHead}>Invite a team member</div>
        <div style={t.card}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={t.label}>Email address</label>
              <FocusInput
                type="email" value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
                placeholder="colleague@yourorg.com"
              />
            </div>
            <div>
              <label style={t.label}>Role</label>
              <FocusSelect value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="analyst">analyst</option>
                <option value="viewer">viewer</option>
              </FocusSelect>
            </div>
            <Btn onClick={sendInvite} loading={inviteLoading}>Send invite</Btn>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: '#4A4840', marginTop: 12 }}>
            Invites expire after 48 hours. The recipient must create an account using the same email address.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BILLING TAB
// Admin only — plan, usage, Stripe upgrade
// ─────────────────────────────────────────────
function BillingTab() {
  const { session } = useAuth();
  const [licence, setLicence]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [msg, setMsg]             = useState({ type: '', text: '' });

  const authHeader = { Authorization: `Bearer ${session?.access_token}` };

  useEffect(() => {
    fetch('/api/licence', { headers: authHeader })
      .then(r => r.json())
      .then(d => { setLicence(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    setUpgradeLoading(true); setMsg({ type: '', text: '' });
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      setMsg({ type: 'error', text: 'Failed to start checkout. Please try again.' });
      setUpgradeLoading(false);
    }
  };

  const handleManage = async () => {
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  };

  if (loading) {
    return <div style={{ fontFamily: MONO, fontSize: 11, color: '#4A4840' }}>Loading billing information…</div>;
  }

  const pct       = licence ? Math.min((licence.analyses_used / licence.analyses_limit) * 100, 100) : 0;
  const remaining = licence ? Math.max(licence.analyses_limit - licence.analyses_used, 0) : 0;
  const isAtLimit = licence?.analyses_used >= licence?.analyses_limit;
  const barColor  = isAtLimit ? '#C0392B' : remaining <= 2 ? '#F39C12' : G;
  const isUnlimited = licence?.analyses_limit >= 999999;

  return (
    <div>
      <Banner type={msg.type} message={msg.text} />

      {/* Current plan */}
      <div style={t.section}>
        <div style={t.sectionHead}>Current plan</div>
        <div style={t.card}>
          <div style={t.row}>
            <div>
              <span style={{ ...t.badge, ...planBadgeStyle(licence?.plan), fontSize: 11, padding: '4px 12px', marginBottom: 8, display: 'inline-block' }}>
                {licence?.plan?.toUpperCase() || 'FREE'}
              </span>
              <div style={{ fontSize: 13, color: '#7A7668', marginTop: 6 }}>
                {licence?.plan === 'free'
                  ? '10 analyses per month · 1 organisation · basic support'
                  : licence?.plan === 'pro'
                  ? 'Unlimited analyses · team management · priority support'
                  : 'Custom · dedicated support · enterprise features'}
              </div>
              {licence?.current_period_end && (
                <div style={{ fontFamily: MONO, fontSize: 10, color: '#4A4840', marginTop: 8 }}>
                  Renews {new Date(licence.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
            {licence?.plan === 'free' && (
              <Btn onClick={handleUpgrade} loading={upgradeLoading}>
                Upgrade to Pro →
              </Btn>
            )}
            {licence?.plan === 'pro' && (
              <Btn variant="secondary" onClick={handleManage}>
                Manage subscription
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* Usage */}
      <div style={t.section}>
        <div style={t.sectionHead}>Usage this period</div>
        <div style={t.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div>
              <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: isAtLimit ? '#C0392B' : '#E8E4D8' }}>
                {licence?.analyses_used || 0}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 16, color: '#4A4840' }}>
                {' '}/ {isUnlimited ? '∞' : licence?.analyses_limit}
              </span>
              <span style={{ fontSize: 13, color: '#7A7668', marginLeft: 8 }}>analyses</span>
            </div>
            {!isUnlimited && (
              <span style={{ fontFamily: MONO, fontSize: 11, color: remaining <= 2 ? '#F39C12' : '#4A4840' }}>
                {remaining} remaining
              </span>
            )}
          </div>

          {!isUnlimited && (
            <div style={t.track}>
              <div style={{ ...t.bar, width: `${pct}%`, background: barColor }} />
            </div>
          )}

          {isAtLimit && licence?.plan === 'free' && (
            <div style={{ marginTop: 16, background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', padding: '12px 14px' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#C0392B', marginBottom: 4 }}>
                Monthly limit reached
              </div>
              <div style={{ fontSize: 12, color: '#7A7668' }}>
                Upgrade to Pro for unlimited analyses and full team access.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan comparison */}
      {licence?.plan === 'free' && (
        <div style={t.section}>
          <div style={t.sectionHead}>Pro plan — £99/month</div>
          <div style={t.card}>
            {[
              ['Analyses',       'Unlimited',             '10 / month'],
              ['Team members',   'Unlimited',             '1 user'],
              ['Analysis history','Full audit trail',     'Not included'],
              ['Team management','Invite, roles, access', 'Not included'],
              ['Support',        'Priority',              'Standard'],
            ].map(([feat, pro, free]) => (
              <div key={feat} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid rgba(212,160,0,0.06)', alignItems: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: '#7A7668', width: 140, flexShrink: 0 }}>{feat}</div>
                <div style={{ flex: 1, fontSize: 12, color: '#2ECC71' }}>✓ {pro}</div>
                <div style={{ flex: 1, fontSize: 12, color: '#4A4840' }}>{free}</div>
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <Btn onClick={handleUpgrade} loading={upgradeLoading}>
                Upgrade to Pro — £99/month →
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS PAGE — container with tab switcher
// ─────────────────────────────────────────────
export function SettingsPage() {
  const { member } = useAuth();

  // Read initial tab from URL query param
  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'account';
  const [activeTab, setActiveTab] = useState(initialTab);

  const isAdmin = member?.role === 'admin';

  const tabs = [
    { id: 'account',  label: 'Account',  show: true },
    { id: 'team',     label: 'Team',     show: isAdmin },
    { id: 'billing',  label: 'Billing',  show: isAdmin },
  ].filter(tab => tab.show);

  return (
    <div style={t.shell}>
      {/* Topbar */}
      <div style={t.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={t.logo}>netwrkr<span style={t.logoDim}>.ai</span></span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#4A4840' }}>/ settings</span>
        </div>
        <button
          style={t.backBtn}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,0,0.4)'; e.currentTarget.style.color = '#E8E4D8'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,160,0,0.15)'; e.currentTarget.style.color = '#7A7668'; }}
          onClick={() => window.location.href = '/app'}
        >
          ← Back to analysis
        </button>
      </div>

      <div style={t.content}>
        <h1 style={t.pageTitle}>Settings</h1>
        <div style={t.pageSlug}>
          {member?.name || member?.email} · {member?.role}
        </div>

        {/* Tab bar */}
        <div style={t.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{ ...t.tab, ...(activeTab === tab.id ? t.tabActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'team'    && isAdmin && <TeamTab />}
        {activeTab === 'billing' && isAdmin && <BillingTab />}
        {(activeTab === 'team' || activeTab === 'billing') && !isAdmin && (
          <div style={{ fontFamily: MONO, fontSize: 12, color: '#4A4840' }}>
            This section is only available to admins.
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;