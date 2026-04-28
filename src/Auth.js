// v1.0 — netwrkr.ai Auth component with Supabase integration
// Covers: Login (password + magic link), Signup (3-step + handle_new_signup RPC),
//         AcceptInvite, AuthGuard, AuthContext, Google SSO, Microsoft SSO

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
//import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────
// SUPABASE CLIENT
// ─────────────────────────────────────────────
//const supabase = createClient(
//  process.env.REACT_APP_SUPABASE_URL,
//  process.env.REACT_APP_SUPABASE_ANON_KEY
//);

// ─────────────────────────────────────────────
// AUTH CONTEXT
// Provides user, member (id/name/email/role), org (id/name/slug)
// and auth actions to the entire app.
// ─────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]     = useState(undefined); // undefined = loading
  const [member, setMember]       = useState(null);
  const [org, setOrg]             = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch member + org from DB once we have a session
  const loadMemberProfile = useCallback(async (userId) => {
    // Read claims directly from the JWT — no extra DB call needed
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
  
    const token = session.access_token;
    const payload = JSON.parse(atob(token.split('.')[1]));
  
    if (!payload.member_id) return null;
  
    setMember({
      id:    payload.member_id,
      email: session.user.email,
      name:  session.user.user_metadata?.name || session.user.email,
      role:  payload.role,
    });
  
    setOrg({
      id:   payload.org_id,
      slug: payload.org_slug,
      name: payload.org_slug, // org name not in JWT — use slug as fallback
    });
  
    return payload;
  }, []);

  // Bootstrap: check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      try {
        if (session?.user) await loadMemberProfile(session.user.id);
      } catch (e) {
        console.error('Profile load error:', e);
      } finally {
        setAuthLoading(false);
      }
    });
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        try {
          if (session?.user) {
            await loadMemberProfile(session.user.id);
          } else {
            setMember(null);
            setOrg(null);
          }
        } catch (e) {
          console.error('Auth state change error:', e);
        } finally {
          setAuthLoading(false);
        }
      }
    );
  
    return () => subscription.unsubscribe();
  }, [loadMemberProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, member, org, authLoading, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─────────────────────────────────────────────
// AUTH GUARD
// Wraps any route that requires authentication.
// Redirects to /login if no session.
// Shows error if session exists but no member record (orphaned auth user).
// ─────────────────────────────────────────────
export function AuthGuard({ children, requiredRole = null }) {
  const { session, member, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={styles.loadingShell}>
        <div style={styles.loadingMark}>
          <LogoMark />
        </div>
        <p style={styles.loadingText}>Authenticating…</p>
      </div>
    );
  }

  if (!session) {
    // Replace with your router's redirect, e.g. <Navigate to="/login" /> for React Router
    window.location.href = '/login';
    return null;
  }

  if (!member) {
    return (
      <div style={styles.errorShell}>
        <p style={styles.errorText}>
          Account error: no member record found for this user.
          Please contact your organisation admin.
        </p>
      </div>
    );
  }

  // Role-gated routes
  if (requiredRole && member.role !== requiredRole) {
    window.location.href = '/app';
    return null;
  }

  return children;
}

// ─────────────────────────────────────────────
// SLUG UTILITY
// ─────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─────────────────────────────────────────────
// LOGO MARK (shared)
// ─────────────────────────────────────────────
function LogoMark({ size = 32 }) {
  return (
    <div style={{ ...styles.logoMark, width: size, height: size }}>
      {[0.9, 0.9, 0.4, 0.2].map((op, i) => (
        <div key={i} style={{ ...styles.logoMarkDot, opacity: op }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// FIELD COMPONENT
// ─────────────────────────────────────────────
function Field({ label, hint, rightLabel, children }) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabelRow}>
        <label style={styles.fieldLabel}>{label}</label>
        {rightLabel && <span style={styles.fieldLabelRight}>{rightLabel}</span>}
      </div>
      {children}
      {hint && <span style={styles.fieldHint}>{hint}</span>}
    </div>
  );
}

function Input({ error, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...styles.input,
        ...(focused ? styles.inputFocused : {}),
        ...(error ? styles.inputError : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ─────────────────────────────────────────────
// ERROR BANNER
// ─────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={styles.errorBanner}>{message}</div>;
}

// ─────────────────────────────────────────────
// SSO BUTTON
// ─────────────────────────────────────────────
function SSOButton({ provider, label, icon, onClick, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{ ...styles.ssoBtn, ...(hovered ? styles.ssoBtnHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      disabled={loading}
    >
      <span style={styles.ssoIcon}>{icon}</span>
      <span>{loading ? 'Redirecting…' : label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
export function LoginPage() {
  const { supabase } = useAuth();
  const [tab, setTab]           = useState('password'); // 'password' | 'magic' | 'sso'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(null);

  // ── Password login
  const handlePasswordLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message);
    } else {
      window.location.href = '/app';
    }
  };

  // ── Magic link
  const handleMagicLink = async () => {
    if (!email) { setError('Please enter your email address.'); return; }
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` }
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMagicSent(true);
  };

  // ── SSO (OAuth)
  const handleSSO = async (provider) => {
    setSsoLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider, // 'google' | 'azure'
      options: {
        redirectTo: `${window.location.origin}/app`,
        // For Azure AD (Microsoft), scopes can be extended:
        // scopes: 'email profile openid'
      }
    });
    if (error) { setError(error.message); setSsoLoading(null); }
    // On success, Supabase redirects the browser — no further action needed
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handlePasswordLogin(); };

  return (
    <div style={styles.shell}>
      <LeftPanel />

      <div style={styles.rightPanel}>
        <div style={styles.formCard}>

          <div style={styles.formHeader}>
            <div style={styles.formEyebrow}>Authenticate</div>
            <h2 style={styles.formTitle}>Sign in</h2>
            <p style={styles.formSubtitle}>Access your fabric analysis dashboard.</p>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            {['password', 'magic', 'sso'].map(t => (
              <button
                key={t}
                style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
                onClick={() => { setTab(t); setError(''); setMagicSent(false); }}
              >
                {t === 'password' ? 'Password' : t === 'magic' ? 'Magic Link' : 'SSO'}
              </button>
            ))}
          </div>

          <ErrorBanner message={error} />

          {/* ── PASSWORD TAB ── */}
          {tab === 'password' && (
            <>
              <div style={styles.fieldGroup}>
                <Field label="Email address">
                  <Input type="email" placeholder="you@yourorg.com" value={email}
                    onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown}
                    autoComplete="email" />
                </Field>
                <Field label="Password" rightLabel={
                  <a href="/reset-password" style={styles.link}>Forgot password?</a>
                }>
                  <Input type="password" placeholder="••••••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown}
                    autoComplete="current-password" />
                </Field>
              </div>
              <PrimaryButton onClick={handlePasswordLogin} loading={loading}>
                Sign in
              </PrimaryButton>
            </>
          )}

          {/* ── MAGIC LINK TAB ── */}
          {tab === 'magic' && (
            magicSent ? (
              <MagicSentConfirmation email={email} onResend={() => setMagicSent(false)} />
            ) : (
              <>
                <div style={styles.fieldGroup}>
                  <Field label="Email address">
                    <Input type="email" placeholder="you@yourorg.com" value={email}
                      onChange={e => setEmail(e.target.value)} autoComplete="email" />
                  </Field>
                </div>
                <PrimaryButton onClick={handleMagicLink} loading={loading}>
                  Send sign-in link
                </PrimaryButton>
              </>
            )
          )}

          {/* ── SSO TAB ── */}
          {tab === 'sso' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ ...styles.formSubtitle, marginBottom: 8 }}>
                Sign in with your organisation's identity provider.
                Your admin must have enabled SSO for your domain.
              </p>
              <SSOButton
                provider="google"
                label="Continue with Google Workspace"
                icon="G"
                loading={ssoLoading === 'google'}
                onClick={() => handleSSO('google')}
              />
              <SSOButton
                provider="azure"
                label="Continue with Microsoft / Azure AD"
                icon="⊞"
                loading={ssoLoading === 'azure'}
                onClick={() => handleSSO('azure')}
              />
              <div style={styles.ssoNote}>
                SAML / Okta / custom IdP available on Enterprise plan.
              </div>
            </div>
          )}

          <div style={styles.switchView}>
            Don't have an account?{' '}
            <a href="/signup" style={styles.link}>Create one</a>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIGNUP PAGE  — 3-step flow
// Calls handle_new_signup RPC atomically
// ─────────────────────────────────────────────
export function SignupPage() {
  const { supabase } = useAuth();
  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [orgName, setOrgName]   = useState('');
  const [slug, setSlug]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const updateSlug = (val) => {
    setOrgName(val);
    setSlug(toSlug(val));
  };

  // Step 1 → 2: validate credentials
  const nextFromStep1 = () => {
    if (!email) { setError('Please enter your email address.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Please enter a password.'); return; }
    if (password.length < 10) { setError('Password must be at least 10 characters.'); return; }
    setError(''); setStep(2);
  };

  // Step 2 → 3: validate org details
  const nextFromStep2 = () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!orgName.trim()) { setError('Please enter your organisation name.'); return; }
    if (slug.length < 2) { setError('Organisation name is too short.'); return; }
    setError(''); setStep(3);
  };

  // Step 3: create account + org atomically
  const handleCreate = async () => {
    setError(''); setLoading(true);

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { name } // stored in auth.users.raw_user_meta_data
      }
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    // 2. Call handle_new_signup RPC — creates org + licence + admin member atomically
    const { error: rpcError } = await supabase.rpc('handle_new_signup', {
      p_user_id:  authData.user.id,
      p_email:    email,
      p_name:     name,
      p_org_name: orgName,
      p_org_slug: slug,
    });

    setLoading(false);

    if (rpcError) {
      // Slug collision is the most likely error
      if (rpcError.message?.includes('unique') || rpcError.message?.includes('slug')) {
        setError('That organisation URL is already taken. Please choose a different name.');
        setStep(2);
      } else {
        setError(rpcError.message || 'Something went wrong. Please try again.');
      }
      return;
    }

    // 3. Redirect to app — Supabase session is now active
    window.location.href = '/app';
  };

  const stepLabels = ['Account', 'Organisation', 'Confirm'];

  return (
    <div style={styles.shell}>
      <LeftPanel />

      <div style={styles.rightPanel}>
        <div style={styles.formCard}>

          <div style={styles.formHeader}>
            <div style={styles.formEyebrow}>New organisation</div>
            <h2 style={styles.formTitle}>Create account</h2>
            <p style={styles.formSubtitle}>You'll be the admin. Invite your team after setup.</p>
          </div>

          {/* Step track */}
          <StepTrack current={step} labels={stepLabels} />

          <ErrorBanner message={error} />

          {/* Step 1 */}
          {step === 1 && (
            <>
              <div style={styles.fieldGroup}>
                <Field label="Email address">
                  <Input type="email" placeholder="you@yourorg.com" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </Field>
                <Field label="Password"
                  hint="Min. 10 characters — this is your organisation's admin account">
                  <Input type="password" placeholder="••••••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
              <PrimaryButton onClick={nextFromStep1}>Continue</PrimaryButton>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div style={styles.fieldGroup}>
                <Field label="Your name">
                  <Input type="text" placeholder="e.g. Alex Chen" value={name}
                    onChange={e => setName(e.target.value)} autoComplete="name" />
                </Field>
                <Field label="Organisation name">
                  <Input type="text" placeholder="e.g. Acme Networks" value={orgName}
                    onChange={e => updateSlug(e.target.value)} autoComplete="organization" />
                  {slug && (
                    <div style={styles.slugPreview}>
                      netwrkr.ai/<span style={{ color: '#D4A000' }}>{slug}</span>
                    </div>
                  )}
                </Field>
              </div>
              <PrimaryButton onClick={nextFromStep2}>Continue</PrimaryButton>
              <SecondaryButton onClick={() => { setStep(1); setError(''); }}>← Back</SecondaryButton>
            </>
          )}

          {/* Step 3 — confirmation */}
          {step === 3 && (
            <>
              <div style={styles.confirmCard}>
                <div style={styles.confirmTitle}>Review</div>
                {[
                  ['Email', email],
                  ['Name', name],
                  ['Organisation', orgName, true],
                  ['URL', `netwrkr.ai/${slug}`, true],
                  ['Your role', 'admin'],
                  ['Plan', 'Free — 10 analyses/month'],
                ].map(([label, value, highlight]) => (
                  <div key={label} style={styles.confirmRow}>
                    <span style={styles.confirmLabel}>{label}</span>
                    <span style={{ ...styles.confirmValue, ...(highlight ? styles.confirmHighlight : {}) }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <PrimaryButton onClick={handleCreate} loading={loading}>
                Create account &amp; organisation
              </PrimaryButton>
              <SecondaryButton onClick={() => { setStep(2); setError(''); }}>← Back</SecondaryButton>
            </>
          )}

          <div style={styles.switchView}>
            Already have an account?{' '}
            <a href="/login" style={styles.link}>Sign in</a>
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
  const { supabase } = useAuth();
  const [name, setName]         = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [tokenValid, setTokenValid]   = useState(null); // null=checking, true, false

  const token = new URLSearchParams(window.location.search).get('token');

  // Validate token on mount — fetch invite details
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }

    supabase
      .from('invites')
      .select('email, expires_at, accepted_at')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setTokenValid(false); return; }
        if (data.accepted_at || new Date(data.expires_at) < new Date()) {
          setTokenValid(false); return;
        }
        setInviteEmail(data.email);
        setTokenValid(true);
      });
  }, [token, supabase]);

  const handleAccept = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!password || password.length < 10) { setError('Password must be at least 10 characters.'); return; }
    setError(''); setLoading(true);

    // 1. Create Supabase Auth user with the invited email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteEmail,
      password,
      options: { data: { name } }
    });

    if (authError) { setLoading(false); setError(authError.message); return; }

    // 2. Accept invite via RPC — creates member record atomically
    const { error: rpcError } = await supabase.rpc('accept_invite', {
      p_token:   token,
      p_user_id: authData.user.id,
      p_name:    name,
    });

    setLoading(false);

    if (rpcError) {
      if (rpcError.message?.includes('invite_invalid_or_expired')) {
        setError('This invite has expired or already been used.');
      } else {
        setError(rpcError.message || 'Something went wrong.');
      }
      return;
    }

    window.location.href = '/app';
  };

  if (tokenValid === null) {
    return (
      <div style={styles.loadingShell}>
        <LogoMark size={40} />
        <p style={styles.loadingText}>Validating invite…</p>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div style={styles.shell}>
        <LeftPanel />
        <div style={styles.rightPanel}>
          <div style={styles.formCard}>
            <div style={styles.formEyebrow}>Invite</div>
            <h2 style={styles.formTitle}>Link expired</h2>
            <p style={{ ...styles.formSubtitle, marginBottom: 24 }}>
              This invite has expired or has already been used.
              Please ask your admin to send a new invite.
            </p>
            <a href="/login" style={styles.link}>Return to sign in →</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <LeftPanel />
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <div style={styles.formEyebrow}>Invite</div>
            <h2 style={styles.formTitle}>Join your team</h2>
            <p style={styles.formSubtitle}>
              You've been invited to netwrkr.ai. Set your name and password to continue.
            </p>
          </div>

          <ErrorBanner message={error} />

          <div style={styles.fieldGroup}>
            <Field label="Email address">
              <Input type="email" value={inviteEmail} disabled
                style={{ ...styles.input, opacity: 0.5, cursor: 'not-allowed' }} />
            </Field>
            <Field label="Your name">
              <Input type="text" placeholder="e.g. Alex Chen" value={name}
                onChange={e => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Choose a password" hint="Min. 10 characters">
              <Input type="password" placeholder="••••••••••••" value={password}
                onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>

          <PrimaryButton onClick={handleAccept} loading={loading}>
            Accept invite &amp; create account
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function MagicSentConfirmation({ email, onResend }) {
  return (
    <div style={styles.magicSent}>
      <div style={styles.magicIcon}>✉</div>
      <h3 style={styles.magicTitle}>Check your email</h3>
      <p style={styles.magicBody}>
        We sent a sign-in link to<br />
        <strong style={{ color: '#D4A000' }}>{email}</strong>
      </p>
      <p style={{ ...styles.magicBody, marginTop: 12, fontSize: 11, opacity: 0.6 }}>
        Didn't receive it?{' '}
        <button onClick={onResend} style={styles.textBtn}>Try again</button>
      </p>
    </div>
  );
}

function StepTrack({ current, labels }) {
  return (
    <div style={styles.stepTrack}>
      {labels.map((label, i) => {
        const n = i + 1;
        const isDone   = n < current;
        const isActive = n === current;
        return (
          <React.Fragment key={n}>
            <div style={{
              ...styles.stepDot,
              ...(isActive ? styles.stepDotActive : {}),
              ...(isDone   ? styles.stepDotDone   : {}),
            }}>
              {isDone ? '✓' : n}
            </div>
            {i < labels.length - 1 && <div style={styles.stepLine} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, onClick, loading, disabled }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...styles.primaryBtn,
        ...(hovered && !loading ? styles.primaryBtnHover : {}),
        ...(loading || disabled ? styles.primaryBtnDisabled : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{ ...styles.secondaryBtn, ...(hovered ? styles.secondaryBtnHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LeftPanel() {
  return (
    <div style={styles.leftPanel}>
      <div style={styles.scanLines} />
      <div style={styles.cornerAccent} />

      {/* Logo */}
      <div style={styles.panelLogo}>
        <LogoMark />
        <span style={styles.logoText}>
          netwrkr<span style={{ color: '#7A7668', fontWeight: 300 }}>.ai</span>
        </span>
      </div>

      <div style={styles.panelEyebrow}>DC Network Intelligence</div>
      <h1 style={styles.panelTitle}>
        Know your fabric.<br />
        Know your <span style={{ color: '#D4A000' }}>risk.</span>
      </h1>

      <ul style={styles.featureList}>
        {[
          ['P1', 'Priority risk assessment from your actual device inventory'],
          ['Σ',  'Version mismatch detection across spines, leafs, and border leafs'],
          ['⚠',  'Netwrkr Intel — AI-sourced advisories, clearly unverified'],
          ['↑',  'Infrastructure hierarchy weighting — Controllers first, always'],
        ].map(([tag, text]) => (
          <li key={tag} style={styles.featureItem}>
            <span style={styles.featureTag}>{tag}</span>
            <span style={styles.featureText}>{text}</span>
          </li>
        ))}
      </ul>

      <div style={styles.panelDivider} />

      <TopoSVG />

      <div style={styles.panelFooter}>
        <span>netwrkr.ai alpha</span>
        <span>© 2026 netwrkr.ai</span>
      </div>
    </div>
  );
}

function TopoSVG() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 16 }}>
      <svg viewBox="0 0 332 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', opacity: 0.55 }}>
        <line x1="166" y1="20" x2="80" y2="70" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="166" y1="20" x2="166" y2="70" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="166" y1="20" x2="252" y2="70" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="80" y1="70" x2="50" y2="130" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="80" y1="70" x2="110" y2="130" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="166" y1="70" x2="140" y2="130" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="166" y1="70" x2="192" y2="130" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="252" y1="70" x2="222" y2="130" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <line x1="252" y1="70" x2="282" y2="130" stroke="#D4A000" strokeWidth="0.5" opacity="0.25"/>
        <rect x="152" y="6" width="28" height="18" rx="2" fill="rgba(212,160,0,0.15)" stroke="#D4A000" strokeWidth="1" opacity="0.5"/>
        <text x="166" y="18" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#9A7400" textAnchor="middle">APIC</text>
        {[[80,67],[166,67],[252,67]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r="5" fill="#D4A000" opacity="0.25"/>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const G = '#D4A000';
const BG = '#080806';

const styles = {
  shell: {
    display: 'grid', gridTemplateColumns: '420px 1fr', height: '100vh',
    background: BG, fontFamily: "'DM Sans', sans-serif", color: '#E8E4D8',
  },
  leftPanel: {
    background: '#0D0D0A', borderRight: '1px solid rgba(212,160,0,0.12)',
    display: 'flex', flexDirection: 'column', padding: '48px 44px', position: 'relative', overflow: 'hidden',
  },
  scanLines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(212,160,0,0.015) 2px,rgba(212,160,0,0.015) 4px)',
  },
  cornerAccent: {
    position: 'absolute', top: 0, left: 0, width: 2, height: 120,
    background: 'linear-gradient(to bottom, #D4A000, transparent)',
  },
  panelLogo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 },
  logoMark: {
    border: '1.5px solid #D4A000', display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 3, padding: 5, flexShrink: 0,
  },
  logoMarkDot: { background: '#D4A000', borderRadius: 1 },
  logoText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: G, letterSpacing: '0.04em' },
  panelEyebrow: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500,
    letterSpacing: '0.15em', textTransform: 'uppercase', color: G, marginBottom: 16,
  },
  panelTitle: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 600,
    lineHeight: 1.3, color: '#E8E4D8', marginBottom: 28,
  },
  featureList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 },
  featureItem: { display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13, color: '#7A7668', lineHeight: 1.5 },
  featureTag: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: G,
    background: 'rgba(212,160,0,0.1)', border: '1px solid rgba(212,160,0,0.2)',
    padding: '2px 5px', flexShrink: 0, marginTop: 1, letterSpacing: '0.05em',
  },
  featureText: { color: '#7A7668' },
  panelDivider: { height: 1, background: 'rgba(212,160,0,0.12)', marginBottom: 24 },
  panelFooter: {
    marginTop: 'auto', paddingTop: 16,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840',
    letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between',
  },

  rightPanel: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, background: BG, position: 'relative',
  },
  formCard: { width: '100%', maxWidth: 400 },
  formHeader: { marginBottom: 32 },
  formEyebrow: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
    letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A7400',
    marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
  },
  formTitle: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 24,
    fontWeight: 600, color: '#E8E4D8', marginBottom: 6,
  },
  formSubtitle: { fontSize: 13, color: '#7A7668', lineHeight: 1.5, margin: 0 },

  tabs: { display: 'flex', borderBottom: '1px solid rgba(212,160,0,0.12)', marginBottom: 28 },
  tab: {
    background: 'none', border: 'none', borderBottom: '2px solid transparent',
    color: '#4A4840', fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '10px 16px', cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: { color: G, borderBottomColor: G },

  errorBanner: {
    background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.3)',
    color: '#E07060', fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    padding: '10px 14px', marginBottom: 20,
  },

  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7668',
  },
  fieldLabelRight: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 },
  fieldHint: { fontSize: 11, color: '#4A4840', fontFamily: "'JetBrains Mono', monospace" },

  input: {
    background: '#0A0A08', border: '1px solid rgba(212,160,0,0.12)',
    color: '#E8E4D8', fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    padding: '11px 14px', outline: 'none', width: '100%', transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputFocused: { borderColor: 'rgba(212,160,0,0.5)', boxShadow: '0 0 0 3px rgba(212,160,0,0.1)' },
  inputError: { borderColor: '#C0392B' },

  slugPreview: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840',
    background: 'rgba(212,160,0,0.04)', border: '1px solid rgba(212,160,0,0.1)',
    padding: '4px 8px', marginTop: 2,
  },

  primaryBtn: {
    width: '100%', background: G, color: '#080806',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase', padding: '13px 24px',
    border: 'none', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s',
  },
  primaryBtnHover: { background: '#E8B000', boxShadow: '0 0 20px rgba(212,160,0,0.25)' },
  primaryBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },

  secondaryBtn: {
    width: '100%', background: 'transparent', color: '#7A7668',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500,
    letterSpacing: '0.1em', textTransform: 'uppercase', padding: '11px 24px',
    border: '1px solid rgba(212,160,0,0.12)', cursor: 'pointer', marginTop: 10,
    transition: 'border-color 0.15s, color 0.15s',
  },
  secondaryBtnHover: { borderColor: '#9A7400', color: '#E8E4D8' },

  link: { color: G, textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: '#9A7400' },
  textBtn: { background: 'none', border: 'none', color: G, cursor: 'pointer', fontSize: 'inherit' },

  switchView: { textAlign: 'center', marginTop: 28, fontSize: 13, color: '#7A7668' },

  stepTrack: { display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 },
  stepDot: {
    width: 24, height: 24, border: '1px solid rgba(212,160,0,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840',
    flexShrink: 0, transition: 'all 0.2s',
  },
  stepDotActive: { borderColor: G, color: G, background: 'rgba(212,160,0,0.1)' },
  stepDotDone:   { borderColor: '#9A7400', color: G, background: 'rgba(212,160,0,0.08)' },
  stepLine: { flex: 1, height: 1, background: 'rgba(212,160,0,0.12)' },

  confirmCard: {
    background: '#111110', border: '1px solid rgba(212,160,0,0.12)',
    padding: 20, marginBottom: 24,
  },
  confirmTitle: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A4840', marginBottom: 14,
  },
  confirmRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 },
  confirmLabel: { fontFamily: "'JetBrains Mono', monospace", color: '#4A4840' },
  confirmValue: { color: '#E8E4D8' },
  confirmHighlight: { color: G, fontFamily: "'JetBrains Mono', monospace" },

  ssoBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#111110', border: '1px solid rgba(212,160,0,0.15)',
    color: '#E8E4D8', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    padding: '12px 16px', cursor: 'pointer', width: '100%',
    transition: 'border-color 0.15s, background 0.15s',
  },
  ssoBtnHover: { borderColor: 'rgba(212,160,0,0.4)', background: '#161614' },
  ssoIcon: {
    width: 24, height: 24, background: 'rgba(212,160,0,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: G, flexShrink: 0,
  },
  ssoNote: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840',
    textAlign: 'center', marginTop: 8, letterSpacing: '0.05em',
  },

  magicSent: { textAlign: 'center', padding: '24px 0' },
  magicIcon: { fontSize: 32, display: 'block', marginBottom: 16 },
  magicTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#E8E4D8', marginBottom: 10 },
  magicBody: { fontSize: 13, color: '#7A7668', lineHeight: 1.6 },

  loadingShell: {
    height: '100vh', background: BG, display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  loadingMark: {},
  loadingText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#7A7668', letterSpacing: '0.1em' },
  errorShell: {
    height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#E07060', maxWidth: 400, textAlign: 'center' },
};

export default { LoginPage, SignupPage, AcceptInvitePage, AuthProvider, AuthGuard, useAuth };