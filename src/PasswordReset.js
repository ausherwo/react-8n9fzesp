// v1.0 — netwrkr.ai Password Reset
// Two components:
//   ForgotPasswordPage  — /reset-password        (engineer enters email)
//   SetNewPasswordPage  — /reset-password/confirm (engineer sets new password after clicking email link)
//
// How Supabase password reset works:
//   1. supabase.auth.resetPasswordForEmail()  → Supabase sends email with a magic link
//   2. Engineer clicks link → browser opens /reset-password/confirm with token in URL hash
//   3. Supabase auto-exchanges the token and establishes a temporary session
//   4. supabase.auth.updateUser({ password: newPassword }) → sets new password
//   5. Session remains active → redirect to /app

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────
// SHARED SUB-COMPONENTS
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

function Field({ label, hint, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {hint && <span style={s.fieldHint}>{hint}</span>}
    </div>
  );
}

function Input({ error, type = 'text', ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      {...props}
      style={{
        ...s.input,
        ...(focused ? s.inputFocused : {}),
        ...(error ? s.inputError : {}),
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

function PrimaryButton({ children, onClick, loading, disabled }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...s.primaryBtn,
        ...(hovered && !loading && !disabled ? s.primaryBtnHover : {}),
        ...(loading || disabled ? s.primaryBtnDisabled : {}),
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

function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={s.errorBanner}>{message}</div>;
}

// Password strength indicator
function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label: 'At least 10 characters', pass: password.length >= 10 },
    { label: 'Uppercase letter',        pass: /[A-Z]/.test(password) },
    { label: 'Number',                  pass: /[0-9]/.test(password) },
    { label: 'Special character',       pass: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter(c => c.pass).length;
  const strengthColor = score <= 1 ? '#C0392B' : score <= 2 ? '#F39C12' : score === 3 ? '#F39C12' : '#2ECC71';
  const strengthLabel = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];

  return (
    <div style={{ marginTop: 10 }}>
      {/* Bar */}
      <div style={s.strengthTrack}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            ...s.strengthSegment,
            background: i < score ? strengthColor : 'rgba(212,160,0,0.08)',
          }} />
        ))}
        <span style={{ ...s.strengthLabel, color: strengthColor }}>{strengthLabel}</span>
      </div>
      {/* Checks */}
      <div style={s.checkList}>
        {checks.map(c => (
          <div key={c.label} style={s.checkItem}>
            <span style={{ color: c.pass ? '#2ECC71' : '#4A4840', fontSize: 10 }}>
              {c.pass ? '✓' : '○'}
            </span>
            <span style={{ ...s.checkText, color: c.pass ? '#7A7668' : '#4A4840' }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LEFT PANEL (shared brand panel)
// ─────────────────────────────────────────────
function LeftPanel({ mode }) {
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

      <div style={{ flex: 1 }} />

      {/* Context-sensitive panel message */}
      <div style={s.panelMessage}>
        {mode === 'request' ? (
          <>
            <div style={s.panelMsgIcon}>🔑</div>
            <h2 style={s.panelMsgTitle}>Password reset</h2>
            <p style={s.panelMsgBody}>
              Enter your email address and we'll send you a secure link to reset your password.
              The link expires after 1 hour.
            </p>
            <div style={s.panelMsgDivider} />
            <p style={s.panelMsgNote}>
              If you signed up with Google or Microsoft SSO, you don't have a netwrkr.ai password.
              Use the SSO tab on the login page instead.
            </p>
          </>
        ) : (
          <>
            <div style={s.panelMsgIcon}>🔒</div>
            <h2 style={s.panelMsgTitle}>Set new password</h2>
            <p style={s.panelMsgBody}>
              Choose a strong password for your account. Your passkey 2FA (if configured) will remain unchanged.
            </p>
            <div style={s.panelMsgDivider} />
            <div style={s.securityTips}>
              <div style={s.securityTipsLabel}>Password tips</div>
              {[
                'Use a passphrase — easier to remember, harder to crack',
                'Never reuse a password from another service',
                'A password manager is strongly recommended',
              ].map((tip, i) => (
                <div key={i} style={s.securityTip}>
                  <span style={{ color: '#D4A000', fontSize: 10 }}>→</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={s.panelFooter}>
        <span>netwrkr.ai alpha</span>
        <span>© 2026 netwrkr.ai</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FORGOT PASSWORD PAGE
// Route: /reset-password
// Engineer enters their email — Supabase sends reset link
// ─────────────────────────────────────────────
export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return; }

    setError(''); setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Supabase will append the token to this URL
      // The token lands in the URL hash: /reset-password/confirm#access_token=...
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    });

    setLoading(false);

    if (error) {
      // Don't reveal whether the email exists — show success regardless
      // This prevents user enumeration attacks
      console.error('Reset error (not shown to user):', error.message);
    }

    // Always show sent confirmation — never confirm or deny if email exists
    setSent(true);
    setResendCooldown(60);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setSent(false);
    setLoading(false);
    setError('');
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div style={s.shell}>
      <LeftPanel mode="request" />

      <div style={s.rightPanel}>
        <div style={s.formCard}>

          {!sent ? (
            <>
              <div style={s.formHeader}>
                <div style={s.formEyebrow}>Account security</div>
                <h2 style={s.formTitle}>Forgot password?</h2>
                <p style={s.formSubtitle}>
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              <ErrorBanner message={error} />

              <div style={s.fieldGroup}>
                <Field label="Email address">
                  <Input
                    type="email"
                    placeholder="you@yourorg.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="email"
                    autoFocus
                  />
                </Field>
              </div>

              <PrimaryButton onClick={handleSubmit} loading={loading}>
                Send reset link
              </PrimaryButton>

              <div style={s.switchView}>
                Remember it?{' '}
                <a href="/login" style={s.link}>Back to sign in</a>
              </div>
            </>
          ) : (
            /* ── Sent confirmation state ── */
            <div style={s.sentState}>
              <div style={s.sentIcon}>✉</div>

              <h2 style={s.formTitle}>Check your email</h2>
              <p style={{ ...s.formSubtitle, marginBottom: 24 }}>
                If <strong style={{ color: '#E8E4D8' }}>{email}</strong> has an account,
                a reset link is on its way. Check your spam folder if it doesn't arrive.
              </p>

              {/* Security notice */}
              <div style={s.securityNotice}>
                <span style={s.securityNoticeIcon}>ℹ</span>
                <span>
                  The link expires in <strong style={{ color: '#E8E4D8' }}>1 hour</strong> and
                  can only be used once. After clicking it, you'll be prompted to set a new password.
                </span>
              </div>

              <div style={{ marginTop: 28 }}>
                {resendCooldown > 0 ? (
                  <div style={s.cooldownMsg}>
                    Resend available in {resendCooldown}s
                  </div>
                ) : (
                  <button style={s.textBtn} onClick={handleResend}>
                    Didn't receive it? Try again
                  </button>
                )}
              </div>

              <div style={{ ...s.switchView, marginTop: 28 }}>
                <a href="/login" style={s.link}>← Back to sign in</a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SET NEW PASSWORD PAGE
// Route: /reset-password/confirm
// Supabase puts the recovery token in the URL hash.
// The Supabase client auto-detects this on mount and
// establishes a temporary session — then we call updateUser.
// ─────────────────────────────────────────────
export function SetNewPasswordPage() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [tokenError, setTokenError]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Supabase auto-exchanges the token in the URL hash on mount.
  // We listen for the PASSWORD_RECOVERY event to confirm the
  // temporary session is ready before allowing form submission.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
        }
        // If the token was invalid or expired, no session is established
        if (event === 'SIGNED_OUT' || (!session && !sessionReady)) {
          // Give it a moment before showing error — the event fires async
        }
      }
    );

    // Timeout: if no PASSWORD_RECOVERY event within 5s, token is invalid/expired
    const timeout = setTimeout(() => {
      if (!sessionReady) setTokenError(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [sessionReady]);

  const validate = () => {
    if (!password) { setError('Please enter a new password.'); return false; }
    if (password.length < 10) { setError('Password must be at least 10 characters.'); return false; }
    if (password !== confirm) { setError('Passwords do not match.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setError(''); setLoading(true);

    // supabase.auth.updateUser works because the PASSWORD_RECOVERY
    // event established a temporary session with the recovery token
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      if (error.message?.includes('same password')) {
        setError('New password must be different from your current password.');
      } else {
        setError(error.message || 'Something went wrong. Please request a new reset link.');
      }
      return;
    }

    setDone(true);

    // Auto-redirect to /app after 3 seconds — session is now fully active
    setTimeout(() => { window.location.href = '/app'; }, 3000);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  // ── Token invalid / expired ──
  if (tokenError) {
    return (
      <div style={s.shell}>
        <LeftPanel mode="set" />
        <div style={s.rightPanel}>
          <div style={s.formCard}>
            <div style={s.formEyebrow}>Account security</div>
            <h2 style={s.formTitle}>Link expired</h2>
            <p style={{ ...s.formSubtitle, marginBottom: 24 }}>
              This password reset link has expired or has already been used.
              Reset links are valid for 1 hour and single-use.
            </p>
            <PrimaryButton onClick={() => { window.location.href = '/reset-password'; }}>
              Request a new link
            </PrimaryButton>
            <div style={s.switchView}>
              <a href="/login" style={s.link}>← Back to sign in</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading: waiting for Supabase to exchange token ──
  if (!sessionReady && !tokenError) {
    return (
      <div style={s.loadingShell}>
        <LogoMark size={40} />
        <p style={s.loadingText}>Validating reset link…</p>
      </div>
    );
  }

  // ── Success state ──
  if (done) {
    return (
      <div style={s.shell}>
        <LeftPanel mode="set" />
        <div style={s.rightPanel}>
          <div style={s.formCard}>
            <div style={s.sentIcon} role="img" aria-label="success">✓</div>
            <h2 style={{ ...s.formTitle, marginTop: 16 }}>Password updated</h2>
            <p style={{ ...s.formSubtitle, marginBottom: 24 }}>
              Your password has been changed successfully. Redirecting you to the dashboard…
            </p>
            <div style={s.redirectBar}>
              <div style={s.redirectProgress} />
            </div>
            <div style={{ ...s.switchView, marginTop: 20 }}>
              <a href="/app" style={s.link}>Go to dashboard →</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div style={s.shell}>
      <LeftPanel mode="set" />

      <div style={s.rightPanel}>
        <div style={s.formCard}>

          <div style={s.formHeader}>
            <div style={s.formEyebrow}>Account security</div>
            <h2 style={s.formTitle}>Set new password</h2>
            <p style={s.formSubtitle}>
              Choose a strong password for your netwrkr.ai account.
            </p>
          </div>

          <ErrorBanner message={error} />

          <div style={s.fieldGroup}>
            <Field label="New password">
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 10 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="new-password"
                  autoFocus
                  error={error && error.toLowerCase().includes('password')}
                />
                <button
                  style={s.showPasswordBtn}
                  onClick={() => setShowPassword(v => !v)}
                  type="button"
                  tabIndex={-1}
                >
                  {showPassword ? 'hide' : 'show'}
                </button>
              </div>
              <PasswordStrength password={password} />
            </Field>

            <Field label="Confirm new password">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
                error={confirm && password !== confirm}
              />
              {confirm && password !== confirm && (
                <span style={{ ...s.fieldHint, color: '#C0392B', marginTop: 4 }}>
                  Passwords do not match
                </span>
              )}
              {confirm && password === confirm && confirm.length >= 10 && (
                <span style={{ ...s.fieldHint, color: '#2ECC71', marginTop: 4 }}>
                  ✓ Passwords match
                </span>
              )}
            </Field>
          </div>

          <PrimaryButton
            onClick={handleSubmit}
            loading={loading}
            disabled={!password || !confirm || password !== confirm || password.length < 10}
          >
            Set new password
          </PrimaryButton>

          <div style={s.switchView}>
            <a href="/login" style={s.link}>← Back to sign in</a>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const G = '#D4A000';
const BG = '#080806';

const s = {
  shell: {
    display: 'grid', gridTemplateColumns: '420px 1fr', height: '100vh',
    background: BG, fontFamily: "'DM Sans', sans-serif", color: '#E8E4D8', overflow: 'hidden',
  },
  leftPanel: {
    background: '#0D0D0A', borderRight: '1px solid rgba(212,160,0,0.12)',
    display: 'flex', flexDirection: 'column', padding: '48px 44px',
    position: 'relative', overflow: 'hidden',
  },
  scanLines: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(212,160,0,0.015) 2px,rgba(212,160,0,0.015) 4px)',
  },
  cornerAccent: {
    position: 'absolute', top: 0, left: 0, width: 2, height: 120,
    background: 'linear-gradient(to bottom, #D4A000, transparent)',
  },
  panelLogo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 },
  logoMark: {
    border: '1.5px solid #D4A000', display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 3, padding: 5, flexShrink: 0,
  },
  logoMarkDot: { background: '#D4A000', borderRadius: 1 },
  logoText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: G },

  panelMessage: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  panelMsgIcon: { fontSize: 28, marginBottom: 16 },
  panelMsgTitle: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600,
    color: '#E8E4D8', marginBottom: 12, lineHeight: 1.3,
  },
  panelMsgBody: { fontSize: 13, color: '#7A7668', lineHeight: 1.7, marginBottom: 0 },
  panelMsgDivider: { height: 1, background: 'rgba(212,160,0,0.1)', margin: '24px 0' },
  panelMsgNote: { fontSize: 12, color: '#4A4840', lineHeight: 1.6 },

  securityTips: { display: 'flex', flexDirection: 'column', gap: 10 },
  securityTipsLabel: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
    letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4A4840', marginBottom: 4,
  },
  securityTip: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: '#7A7668', lineHeight: 1.5 },

  panelFooter: {
    marginTop: 'auto', paddingTop: 24,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4A4840',
    letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between',
  },

  rightPanel: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, background: BG,
    backgroundImage: 'linear-gradient(rgba(212,160,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,0,0.025) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  formCard: { width: '100%', maxWidth: 400 },
  formHeader: { marginBottom: 32 },
  formEyebrow: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
    letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A7400',
    marginBottom: 10,
  },
  formTitle: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 24,
    fontWeight: 600, color: '#E8E4D8', marginBottom: 6,
  },
  formSubtitle: { fontSize: 13, color: '#7A7668', lineHeight: 1.5, margin: 0 },

  errorBanner: {
    background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.3)',
    color: '#E07060', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, padding: '10px 14px', marginBottom: 20,
  },

  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7668',
  },
  fieldHint: { fontSize: 11, color: '#4A4840', fontFamily: "'JetBrains Mono', monospace" },

  input: {
    background: '#0A0A08', border: '1px solid rgba(212,160,0,0.12)',
    color: '#E8E4D8', fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    padding: '11px 14px', outline: 'none', width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputFocused: { borderColor: 'rgba(212,160,0,0.5)', boxShadow: '0 0 0 3px rgba(212,160,0,0.1)' },
  inputError: { borderColor: '#C0392B' },

  showPasswordBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    color: '#4A4840', letterSpacing: '0.05em', textTransform: 'uppercase',
  },

  strengthTrack: {
    display: 'flex', gap: 3, alignItems: 'center', marginBottom: 8,
  },
  strengthSegment: {
    flex: 1, height: 3, borderRadius: 1, transition: 'background 0.2s',
  },
  strengthLabel: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    fontWeight: 600, letterSpacing: '0.08em', marginLeft: 8, minWidth: 40,
  },
  checkList: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' },
  checkItem: { display: 'flex', alignItems: 'center', gap: 6 },
  checkText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, transition: 'color 0.2s' },

  primaryBtn: {
    width: '100%', background: G, color: '#080806',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase', padding: '13px 24px',
    border: 'none', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s',
  },
  primaryBtnHover: { background: '#E8B000', boxShadow: '0 0 20px rgba(212,160,0,0.25)' },
  primaryBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  link: { color: G, textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: '#9A7400' },
  textBtn: {
    background: 'none', border: 'none', color: G, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: '#9A7400',
  },
  switchView: { textAlign: 'center', marginTop: 24, fontSize: 13, color: '#7A7668' },

  // Sent confirmation
  sentState: { textAlign: 'center' },
  sentIcon: {
    fontSize: 36, display: 'block', textAlign: 'center',
    marginBottom: 16, fontFamily: "'JetBrains Mono', monospace",
  },
  securityNotice: {
    background: 'rgba(212,160,0,0.04)', border: '1px solid rgba(212,160,0,0.12)',
    padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
    fontSize: 12, color: '#7A7668', lineHeight: 1.6, textAlign: 'left',
  },
  securityNoticeIcon: { color: G, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginTop: 1 },
  cooldownMsg: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    color: '#4A4840', textAlign: 'center', letterSpacing: '0.05em',
  },

  // Redirect progress bar
  redirectBar: {
    height: 2, background: 'rgba(212,160,0,0.1)', overflow: 'hidden', marginTop: 12,
  },
  redirectProgress: {
    height: '100%', background: G,
    animation: 'progressFill 3s linear forwards',
    width: '0%',
  },

  // Loading
  loadingShell: {
    height: '100vh', background: BG, display: 'flex',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  loadingText: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
    color: '#7A7668', letterSpacing: '0.1em',
  },
};

// Inject redirect animation keyframe
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '@keyframes progressFill { from { width: 0% } to { width: 100% } }';
  document.head.appendChild(style);
}

export default { ForgotPasswordPage, SetNewPasswordPage };