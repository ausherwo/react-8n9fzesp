// Auth.js — v2.0 clean
// AuthProvider, AuthGuard, useAuth
// LoginPage, SignupPage, AcceptInvitePage
// Google SSO, Microsoft SSO, Magic Link

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function decodeJWT(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─────────────────────────────────────────────
// AUTH PROVIDER
// Single source of truth for session + member + org
// ─────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [session, setSession]         = useState(null);
  const [member, setMember]           = useState(null);
  const [org, setOrg]                 = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Apply a session — decode JWT claims and set all state atomically
  const applySession = useCallback((newSession) => {
    if (!newSession?.access_token) {
      setSession(null);
      setMember(null);
      setOrg(null);
      return false;
    }

    const payload = decodeJWT(newSession.access_token);
    if (!payload) {
      setSession(null);
      setMember(null);
      setOrg(null);
      return false;
    }

    setSession(newSession);

    if (payload.member_id) {
      setMember({
        id:    payload.member_id,
        email: newSession.user?.email || '',
        name:  newSession.user?.user_metadata?.name || newSession.user?.email || '',
        role:  payload.role || 'analyst',
      });
      setOrg({
        id:   payload.org_id   || '',
        slug: payload.org_slug || '',
        name: payload.org_slug || '',
        plan: payload.plan     || 'free',
      });
    } else {
      setMember(null);
      setOrg(null);
    }

    return true;
  }, []);

  useEffect(() => {
    let mounted = true;

    const fallback = setTimeout(() => {
      if (mounted) setAuthLoading(false);
    }, 4000);

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!mounted) return;
      applySession(existing);
      clearTimeout(fallback);
      setAuthLoading(false);
    }).catch(() => {
      if (!mounted) return;
      clearTimeout(fallback);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      if (event === 'TOKEN_REFRESHED') {
        if (newSession) setSession(newSession);
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null); setMember(null); setOrg(null); setAuthLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        applySession(newSession);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ session, member, org, authLoading, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// AUTH GUARD
// ─────────────────────────────────────────────
export function AuthGuard({ children, requiredRole = null }) {
  const { session, member, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={s.loadingShell}>
        <LogoMark size={40} />
        <p style={s.loadingText}>Authenticating…</p>
      </div>
    );
  }

  if (!session) {
    window.location.href = '/login';
    return null;
  }

  if (!member) {
    return (
      <div style={s.loadingShell}>
        <LogoMark size={40} />
        <p style={s.loadingText}>Loading profile…</p>
      </div>
    );
  }

  if (requiredRole && member.role !== requiredRole) {
    window.location.href = '/app';
    return null;
  }

  return children;
}

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────
function LogoMark({ size = 32 }) {
  return (
    <div style={{ ...s.logoMark, width: size, height: size }}>
      {[0.9, 0.9, 0.4, 0.2].map((op, i) => (
        <div key={i} style={{ ...s.logoMarkDot, opacity: op }} />
      ))}
    </div>
  );
}

function LeftPanel() {
  return (
    <div style={s.leftPanel}>
      <div style={s.scanLines} />
      <div style={s.cornerAccent} />
      <div style={s.panelLogo}>
        <LogoMark />
        <span style={s.logoText}>
          netwrkr<span style={{ color: '#7A7668', fontWeight: 300 }}>.ai</span>
        </span>
      </div>
      <div style={s.panelEyebrow}>DC Network Intelligence</div>
      <h1 style={s.panelTitle}>
        Know your fabric.<br />
        Know your <span style={{ color: '#D4A000' }}>risk.</span>
      </h1>
      <ul style={s.featureList}>
        {[
          ['P1', 'Priority risk assessment from your actual device inventory'],
          ['Σ',  'Version mismatch detection across spines, leafs, and border leafs'],
          ['⚠',  'Netwrkr Intel — AI-sourced advisories, clearly unverified'],
          ['↑',  'Infrastructure hierarchy weighting — Controllers first, always'],
        ].map(([tag, text]) => (
          <li key={tag} style={s.featureItem}>
            <span style={s.featureTag}>{tag}</span>
            <span style={s.featureText}>{text}</span>
          </li>
        ))}
      </ul>
      <div style={s.panelDivider} />
      <div style={{ flex: 1 }} />
      <div style={s.panelFooter}>
        <span>netwrkr.ai alpha</span>
        <span>© 2026 netwrkr.ai</span>
      </div>
    </div>
  );
}

function Field({ label, hint, rightLabel, children }) {
  return (
    <div style={s.field}>
      <div style={s.fieldLabelRow}>
        <label style={s.fieldLabel}>{label}</label>
        {rightLabel && <span>{rightLabel}</span>}
      </div>
      {children}
      {hint && <span style={s.fieldHint}>{hint}</span>}
    </div>
  );
}

function TextInput({ error, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...s.input,
        ...(focused ? s.inputFocused : {}),
        ...(error ? s.inputError : {}),
        ...props.style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function PrimaryBtn({ children, onClick, loading, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        ...s.primaryBtn,
        ...(hov && !loading && !disabled ? s.primaryBtnHover : {}),
        ...(loading || disabled ? s.primaryBtnDisabled : {}),
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function SecondaryBtn({ children, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{ ...s.secondaryBtn, ...(hov ? s.secondaryBtnHover : {}) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={s.errorBanner}>{message}</div>;
}

function StepTrack({ current, labels }) {
  return (
    <div style={s.stepTrack}>
      {labels.map((label, i) => {
        const n = i + 1;
        return (
          <React.Fragment key={n}>
            <div style={{
              ...s.stepDot,
              ...(n === current ? s.stepDotActive : {}),
              ...(n < current  ? s.stepDotDone   : {}),
            }}>
              {n < current ? '✓' : n}
            </div>
            {i < labels.length - 1 && <div style={s.stepLine} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function SSOButton({ label, icon, onClick, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{ ...s.ssoBtn, ...(hov ? s.ssoBtnHover : {}) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      disabled={loading}
    >
      <span style={s.ssoIcon}>{icon}</span>
      <span>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// LOGIN PAGE
// Route: /login
// ─────────────────────────────────────────────
export function LoginPage() {
  const [tab, setTab]               = useState('password');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [magicSent, setMagicSent]   = useState(false);
  const [ssoLoading, setSsoLoading] = useState(null);

  const handlePassword = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : err.message);
    } else {
      window.location.href = '/app';
    }
  };

  const handleMagic = async () => {
    if (!email) { setError('Please enter your email address.'); return; }
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` }
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setMagicSent(true);
  };

  const handleSSO = async (provider) => {
    setSsoLoading(provider);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/app` }
    });
    if (err) { setError(err.message); setSsoLoading(null); }
  };

  return (
    <div style={s.shell}>
      <LeftPanel />
      <div style={s.rightPanel}>
        <div style={s.formCard}>
          <div style={s.formHeader}>
            <div style={s.formEyebrow}>Authenticate</div>
            <h2 style={s.formTitle}>Sign in</h2>
            <p style={s.formSubtitle}>Access your fabric analysis dashboard.</p>
          </div>

          <div style={s.tabs}>
            {[['password','Password'],['magic','Magic Link'],['sso','SSO']].map(([id, label]) => (
              <button key={id}
                style={{ ...s.tab, ...(tab === id ? s.tabActive : {}) }}
                onClick={() => { setTab(id); setError(''); setMagicSent(false); }}
              >{label}</button>
            ))}
          </div>

          <ErrorBanner message={error} />

          {tab === 'password' && (
            <>
              <div style={s.fieldGroup}>
                <Field label="Email address">
                  <TextInput type="email" placeholder="you@yourorg.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePassword()}
                    autoComplete="email" />
                </Field>
                <Field label="Password" rightLabel={
                  <a href="/reset-password" style={s.link}>Forgot password?</a>
                }>
                  <TextInput type="password" placeholder="••••••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePassword()}
                    autoComplete="current-password" />
                </Field>
              </div>
              <PrimaryBtn onClick={handlePassword} loading={loading}>Sign in</PrimaryBtn>
            </>
          )}

          {tab === 'magic' && (
            magicSent ? (
              <div style={s.magicSent}>
                <div style={s.magicIcon}>✉</div>
                <h3 style={s.magicTitle}>Check your email</h3>
                <p style={s.magicBody}>Sign-in link sent to <strong style={{ color: '#D4A000' }}>{email}</strong></p>
                <button style={s.textBtn} onClick={() => setMagicSent(false)}>Try again</button>
              </div>
            ) : (
              <>
                <div style={s.fieldGroup}>
                  <Field label="Email address">
                    <TextInput type="email" placeholder="you@yourorg.com" value={email}
                      onChange={e => setEmail(e.target.value)} autoComplete="email" />
                  </Field>
                </div>
                <PrimaryBtn onClick={handleMagic} loading={loading}>Send sign-in link</PrimaryBtn>
              </>
            )
          )}

          {tab === 'sso' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ ...s.formSubtitle, marginBottom: 8 }}>
                Sign in with your organisation's identity provider.
              </p>
              <SSOButton label="Continue with Google Workspace" icon="G"
                loading={ssoLoading === 'google'} onClick={() => handleSSO('google')} />
              <SSOButton label="Continue with Microsoft / Azure AD" icon="⊞"
                loading={ssoLoading === 'azure'} onClick={() => handleSSO('azure')} />
              <div style={s.ssoNote}>SAML / Okta / custom IdP available on Enterprise plan.</div>
            </div>
          )}

          <div style={s.switchView}>
            Don't have an account?{' '}
            <a href="/signup" style={s.link}>Create one</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIGNUP PAGE
// Route: /signup
// ─────────────────────────────────────────────
export function SignupPage() {
  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [orgName, setOrgName]   = useState('');
  const [slug, setSlug]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const updateSlug = (val) => { setOrgName(val); setSlug(toSlug(val)); };

  const next1 = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return; }
    if (!password || password.length < 10)      { setError('Password must be at least 10 characters.'); return; }
    setError(''); setStep(2);
  };

  const next2 = () => {
    if (!name.trim())                 { setError('Please enter your name.'); return; }
    if (!orgName.trim() || slug.length < 2) { setError('Please enter your organisation name.'); return; }
    setError(''); setStep(3);
  };

  const handleCreate = async () => {
    setError(''); setLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/app`, data: { name } }
    });

    if (authErr) { setLoading(false); setError(authErr.message); return; }

    const { error: rpcErr } = await supabase.rpc('handle_new_signup', {
      p_user_id: authData.user.id, p_email: email,
      p_name: name, p_org_name: orgName, p_org_slug: slug,
    });

    setLoading(false);
    if (rpcErr) {
      if (rpcErr.message?.includes('unique') || rpcErr.message?.includes('slug')) {
        setError('That organisation URL is already taken.'); setStep(2);
      } else {
        setError(rpcErr.message || 'Something went wrong.');
      }
      return;
    }
    window.location.href = '/app';
  };

  return (
    <div style={s.shell}>
      <LeftPanel />
      <div style={s.rightPanel}>
        <div style={s.formCard}>
          <div style={s.formHeader}>
            <div style={s.formEyebrow}>New organisation</div>
            <h2 style={s.formTitle}>Create account</h2>
            <p style={s.formSubtitle}>You'll be the admin. Invite your team after setup.</p>
          </div>
          <StepTrack current={step} labels={['Account', 'Organisation', 'Confirm']} />
          <ErrorBanner message={error} />

          {step === 1 && (
            <>
              <div style={s.fieldGroup}>
                <Field label="Email address">
                  <TextInput type="email" placeholder="you@yourorg.com" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </Field>
                <Field label="Password" hint="Min. 10 characters — this is your admin account">
                  <TextInput type="password" placeholder="••••••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
              <PrimaryBtn onClick={next1}>Continue</PrimaryBtn>
            </>
          )}

          {step === 2 && (
            <>
              <div style={s.fieldGroup}>
                <Field label="Your name">
                  <TextInput type="text" placeholder="e.g. Alex Chen" value={name}
                    onChange={e => setName(e.target.value)} autoComplete="name" />
                </Field>
                <Field label="Organisation name">
                  <TextInput type="text" placeholder="e.g. Acme Networks" value={orgName}
                    onChange={e => updateSlug(e.target.value)} autoComplete="organization" />
                  {slug && (
                    <div style={s.slugPreview}>
                      netwrkr.ai/<span style={{ color: '#D4A000' }}>{slug}</span>
                    </div>
                  )}
                </Field>
              </div>
              <PrimaryBtn onClick={next2}>Continue</PrimaryBtn>
              <SecondaryBtn onClick={() => { setStep(1); setError(''); }}>← Back</SecondaryBtn>
            </>
          )}

          {step === 3 && (
            <>
              <div style={s.confirmCard}>
                <div style={s.confirmTitle}>Review</div>
                {[
                  ['Email', email], ['Name', name],
                  ['Organisation', orgName, true], ['URL', `netwrkr.ai/${slug}`, true],
                  ['Role', 'admin'], ['Plan', 'Free — 10 analyses/month'],
                ].map(([label, value, gold]) => (
                  <div key={label} style={s.confirmRow}>
                    <span style={s.confirmLabel}>{label}</span>
                    <span style={gold ? s.confirmGold : s.confirmValue}>{value}</span>
                  </div>
                ))}
              </div>
              <PrimaryBtn onClick={handleCreate} loading={loading}>
                Create account &amp; organisation
              </PrimaryBtn>
              <SecondaryBtn onClick={() => { setStep(2); setError(''); }}>← Back</SecondaryBtn>
            </>
          )}

          <div style={s.switchView}>
            Already have an account?{' '}
            <a href="/login" style={s.link}>Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ACCEPT INVITE PAGE
// Route: /accept-invite?token=...
// ─────────────────────────────────────────────
export function AcceptInvitePage() {
  const [name, setName]               = useState('');
  const [password, setPassword]       = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [tokenValid, setTokenValid]   = useState(null);

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    supabase
      .from('invites')
      .select('email, expires_at, accepted_at')
      .eq('token', token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data)                                             { setTokenValid(false); return; }
        if (data.accepted_at || new Date(data.expires_at) < new Date()) { setTokenValid(false); return; }
        setInviteEmail(data.email);
        setTokenValid(true);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!name.trim())                    { setError('Please enter your name.'); return; }
    if (!password || password.length < 10) { setError('Password must be at least 10 characters.'); return; }
    setError(''); setLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: inviteEmail, password, options: { data: { name } }
    });
    if (authErr) { setLoading(false); setError(authErr.message); return; }

    const { error: rpcErr } = await supabase.rpc('accept_invite', {
      p_token: token, p_user_id: authData.user.id, p_name: name,
    });
    setLoading(false);
    if (rpcErr) {
      setError(rpcErr.message?.includes('invite_invalid')
        ? 'This invite has expired or already been used.' : rpcErr.message || 'Something went wrong.');
      return;
    }
    window.location.href = '/app';
  };

  if (tokenValid === null) {
    return (
      <div style={s.loadingShell}>
        <LogoMark size={40} />
        <p style={s.loadingText}>Validating invite…</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={s.shell}>
        <LeftPanel />
        <div style={s.rightPanel}>
          <div style={s.formCard}>
            <div style={s.formEyebrow}>Invite</div>
            <h2 style={s.formTitle}>Link expired</h2>
            <p style={{ ...s.formSubtitle, marginBottom: 24 }}>
              This invite has expired or has already been used. Ask your admin to send a new one.
            </p>
            <a href="/login" style={s.link}>Return to sign in →</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.shell}>
      <LeftPanel />
      <div style={s.rightPanel}>
        <div style={s.formCard}>
          <div style={s.formHeader}>
            <div style={s.formEyebrow}>Invite</div>
            <h2 style={s.formTitle}>Join your team</h2>
            <p style={s.formSubtitle}>Set your name and password to complete your account.</p>
          </div>
          <ErrorBanner message={error} />
          <div style={s.fieldGroup}>
            <Field label="Email address">
              <TextInput type="email" value={inviteEmail} disabled />
            </Field>
            <Field label="Your name">
              <TextInput type="text" placeholder="e.g. Alex Chen" value={name}
                onChange={e => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Password" hint="Min. 10 characters">
              <TextInput type="password" placeholder="••••••••••••" value={password}
                onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          <PrimaryBtn onClick={handleAccept} loading={loading}>
            Accept invite &amp; create account
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const G  = '#D4A000';
const BG = '#080806';

const s = {
  shell: { display: 'grid', gridTemplateColumns: '420px 1fr', height: '100vh', background: BG, fontFamily: "'DM Sans', sans-serif", color: '#E8E4D8', overflow: 'hidden' },
  leftPanel: { background: '#0D0D0A', borderRight: '1px solid rgba(212,160,0,0.12)', display: 'flex', flexDirection: 'column', padding: '48px 44px', position: 'relative', overflow: 'hidden' },
  scanLines: { position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(212,160,0,0.015) 2px,rgba(212,160,0,0.015) 4px)' },
  cornerAccent: { position: 'absolute', top: 0, left: 0, width: 2, height: 120, background: 'linear-gradient(to bottom, #D4A000, transparent)' },
  panelLogo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 },
  logoMark: { border: '1.5px solid #D4A000', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 5, flexShrink: 0 },
  logoMarkDot: { background: '#D4A000', borderRadius: 1 },
  logoText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: G },
  panelEyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: 16 },
  panelTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600, lineHeight: 1.3, color: '#E8E4D8', marginBottom: 28 },
  featureList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 },
  featureItem: { display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13, lineHeight: 1.5 },
  featureTag: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: G, background: 'rgba(212,160,0,0.1)', border: '1px solid rgba(212,160,0,0.2)', padding: '2px 5px', flexShrink: 0, marginTop: 1 },
  featureText: { color: '#7A7668' },
  panelDivider: { height: 1, background: 'rgba(212,160,0,0.12)', marginBottom: 24 },
  panelFooter: { paddingTop: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' },
  rightPanel: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: BG, backgroundImage: 'linear-gradient(rgba(212,160,0,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(212,160,0,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' },
  formCard: { width: '100%', maxWidth: 400 },
  formHeader: { marginBottom: 32 },
  formEyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A7400', marginBottom: 10 },
  formTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 600, color: '#E8E4D8', marginBottom: 6 },
  formSubtitle: { fontSize: 13, color: '#7A7668', lineHeight: 1.5, margin: 0 },
  tabs: { display: 'flex', borderBottom: '1px solid rgba(212,160,0,0.12)', marginBottom: 28 },
  tab: { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#4A4840', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 16px', cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s, border-color 0.15s' },
  tabActive: { color: G, borderBottomColor: G },
  errorBanner: { background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.3)', color: '#E07060', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '10px 14px', marginBottom: 20 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7668' },
  fieldHint: { fontSize: 11, color: '#4A4840', fontFamily: "'JetBrains Mono', monospace" },
  input: { background: '#0A0A08', border: '1px solid rgba(212,160,0,0.12)', color: '#E8E4D8', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: '11px 14px', outline: 'none', width: '100%', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box' },
  inputFocused: { borderColor: 'rgba(212,160,0,0.5)', boxShadow: '0 0 0 3px rgba(212,160,0,0.1)' },
  inputError: { borderColor: '#C0392B' },
  slugPreview: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840', background: 'rgba(212,160,0,0.04)', border: '1px solid rgba(212,160,0,0.1)', padding: '4px 8px', marginTop: 2 },
  primaryBtn: { width: '100%', background: G, color: '#080806', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '13px 24px', border: 'none', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s' },
  primaryBtnHover: { background: '#E8B000', boxShadow: '0 0 20px rgba(212,160,0,0.25)' },
  primaryBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  secondaryBtn: { width: '100%', background: 'transparent', color: '#7A7668', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '11px 24px', border: '1px solid rgba(212,160,0,0.12)', cursor: 'pointer', marginTop: 10, transition: 'border-color 0.15s, color 0.15s' },
  secondaryBtnHover: { borderColor: '#9A7400', color: '#E8E4D8' },
  link: { color: G, textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: '#9A7400' },
  textBtn: { background: 'none', border: 'none', color: G, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 },
  switchView: { textAlign: 'center', marginTop: 24, fontSize: 13, color: '#7A7668' },
  stepTrack: { display: 'flex', alignItems: 'center', marginBottom: 28 },
  stepDot: { width: 24, height: 24, border: '1px solid rgba(212,160,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840', flexShrink: 0, transition: 'all 0.2s' },
  stepDotActive: { borderColor: G, color: G, background: 'rgba(212,160,0,0.1)' },
  stepDotDone:   { borderColor: '#9A7400', color: G, background: 'rgba(212,160,0,0.08)' },
  stepLine: { flex: 1, height: 1, background: 'rgba(212,160,0,0.12)' },
  confirmCard: { background: '#111110', border: '1px solid rgba(212,160,0,0.12)', padding: 20, marginBottom: 24 },
  confirmTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A4840', marginBottom: 14 },
  confirmRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 },
  confirmLabel: { fontFamily: "'JetBrains Mono', monospace", color: '#4A4840' },
  confirmValue: { color: '#E8E4D8' },
  confirmGold:  { color: G, fontFamily: "'JetBrains Mono', monospace" },
  ssoBtn: { display: 'flex', alignItems: 'center', gap: 12, background: '#111110', border: '1px solid rgba(212,160,0,0.15)', color: '#E8E4D8', fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '12px 16px', cursor: 'pointer', width: '100%', transition: 'border-color 0.15s' },
  ssoBtnHover: { borderColor: 'rgba(212,160,0,0.4)', background: '#161614' },
  ssoIcon: { width: 24, height: 24, background: 'rgba(212,160,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: G, flexShrink: 0 },
  ssoNote: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840', textAlign: 'center', marginTop: 8 },
  magicSent: { textAlign: 'center', padding: '24px 0' },
  magicIcon: { fontSize: 32, display: 'block', marginBottom: 16 },
  magicTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#E8E4D8', marginBottom: 10 },
  magicBody: { fontSize: 13, color: '#7A7668', lineHeight: 1.6 },
  loadingShell: { height: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily: "'DM Sans', sans-serif" },
  loadingText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7A7668', letterSpacing: '0.1em' },
};