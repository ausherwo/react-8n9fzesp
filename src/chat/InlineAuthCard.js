// InlineAuthCard.js
// Sign up or sign in without ever leaving the JC conversation — rendered as a chat
// message (JCHome's "signup-gate" type), not a redirect to /signup or /login.
// Uses the same Supabase calls as Auth.js's SignupPage/LoginPage (signUp + the
// handle_new_signup RPC, or signInWithPassword), so account creation behaves
// identically — only the surface changes. Once Supabase's onAuthStateChange fires,
// AuthProvider's session updates and this card swaps to a confirmation line; JCHome's
// existing anon-conversation migration effect (keyed on `session`) takes it from there.

import { useState } from "react";
import posthog from "posthog-js";
import { useAuth } from "../Auth";
import { supabase } from "../supabaseClient";
import { LIGHT as C, sans } from "./ChatPrimitives";

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const inputStyle = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px",
  fontSize: 14, fontFamily: sans, color: C.text, outline: "none", background: C.hi, boxSizing: "border-box",
};

const primaryBtnStyle = (enabled) => ({
  background: enabled ? C.amber : C.border, border: "none", borderRadius: 999, color: enabled ? C.onAmber : C.muted,
  fontFamily: sans, fontWeight: 600, fontSize: 13.5, padding: "10px 18px", cursor: enabled ? "pointer" : "default", width: "100%",
});

const ghostBtnStyle = {
  background: "none", border: `1px solid ${C.border}`, borderRadius: 999, color: C.dim,
  fontFamily: sans, fontSize: 13.5, padding: "9px 18px", cursor: "pointer",
};

const linkBtnStyle = {
  background: "none", border: "none", color: C.muted, fontFamily: sans, fontSize: 12.5,
  cursor: "pointer", textDecoration: "underline", padding: 0,
};

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: `${C.red}10`, border: `1px solid ${C.red}30`, borderRadius: 10, color: C.red, fontFamily: sans, fontSize: 12.5, padding: "8px 12px", marginBottom: 14 }}>
      {message}
    </div>
  );
}

export default function InlineAuthCard() {
  const { session } = useAuth();
  const [mode, setMode] = useState("choice"); // choice | signup | login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  if (session) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.green, fontFamily: sans }}>
        <span>✓</span><span>Signed in — picking up right where we left off.</span>
      </div>
    );
  }

  if (awaitingConfirmation) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", maxWidth: 420, boxShadow: "0 1px 2px rgba(26,24,16,0.04), 0 12px 32px rgba(26,24,16,0.05)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6, fontFamily: sans }}>Check your email</div>
        <div style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.6, fontFamily: sans }}>
          We sent a confirmation link to <strong style={{ color: C.text }}>{email}</strong>. Once confirmed, come back here and sign in — your conversation is saved and waiting.
        </div>
      </div>
    );
  }

  const slug = orgName ? toSlug(orgName) : "";

  const doSignup = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address."); return; }
    if (!password || password.length < 10) { setError("Password must be at least 10 characters."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!orgName.trim() || slug.length < 2) { setError("Please enter your organisation name."); return; }
    setError(""); setLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (authErr) { setLoading(false); setError(authErr.message); return; }

    if (!authData.session) {
      // Email confirmation required before a session exists — org gets created once they
      // confirm and sign in, same as the full-page signup flow's assumption.
      const { error: rpcErr } = await supabase.rpc('handle_new_signup', {
        p_user_id: authData.user.id, p_email: email, p_name: name, p_org_name: orgName, p_org_slug: slug,
      });
      setLoading(false);
      if (rpcErr) { setError(rpcErr.message?.includes('slug') || rpcErr.message?.includes('unique') ? "That organisation URL is already taken." : rpcErr.message || "Something went wrong."); return; }
      try { posthog.capture('home_signup_gate_signup_completed', { email_confirmation_required: true }); } catch {}
      setAwaitingConfirmation(true);
      return;
    }

    const { error: rpcErr } = await supabase.rpc('handle_new_signup', {
      p_user_id: authData.user.id, p_email: email, p_name: name, p_org_name: orgName, p_org_slug: slug,
    });
    setLoading(false);
    if (rpcErr) {
      setError(rpcErr.message?.includes('slug') || rpcErr.message?.includes('unique') ? "That organisation URL is already taken." : rpcErr.message || "Something went wrong.");
      return;
    }
    try { posthog.capture('home_signup_gate_signup_completed'); } catch {}
  };

  const doLogin = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : err.message);
    else try { posthog.capture('home_signup_gate_login_completed'); } catch {}
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", maxWidth: 420, boxShadow: "0 1px 2px rgba(26,24,16,0.04), 0 12px 32px rgba(26,24,16,0.05)" }}>
      {mode === "choice" && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.amber, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: sans }}>Free questions used</div>
          <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.7, marginBottom: 16, fontFamily: sans }}>
            Create a free account to keep talking to JC — your conversation carries over right here, nothing is lost.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { try { posthog.capture('home_signup_gate_signup_clicked'); } catch {} setMode("signup"); }} style={{ ...primaryBtnStyle(true), width: "auto", flex: 1 }}>
              Create a free account
            </button>
            <button onClick={() => setMode("login")} style={{ ...ghostBtnStyle, flex: 1 }}>I already have an account</button>
          </div>
        </>
      )}

      {mode === "signup" && (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4, fontFamily: sans }}>Create your account</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, fontFamily: sans }}>Your conversation with JC carries over automatically.</div>
          <ErrorNote message={error} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            <input style={inputStyle} type="password" placeholder="Password (min. 10 characters)" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            <input style={inputStyle} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            <input style={inputStyle} type="text" placeholder="Organisation name" value={orgName} onChange={e => setOrgName(e.target.value)} autoComplete="organization" />
            {slug && <div style={{ fontSize: 12, color: C.muted, fontFamily: sans }}>netwrkr.ai/<span style={{ color: C.amber }}>{slug}</span></div>}
          </div>
          <button onClick={doSignup} disabled={loading} style={primaryBtnStyle(!loading)}>{loading ? "Creating account…" : "Create account"}</button>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => { setMode("login"); setError(""); }} style={linkBtnStyle}>Already have an account? Sign in</button>
          </div>
        </>
      )}

      {mode === "login" && (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16, fontFamily: sans }}>Sign in</div>
          <ErrorNote message={error} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} autoComplete="email" />
            <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} autoComplete="current-password" />
          </div>
          <button onClick={doLogin} disabled={loading} style={primaryBtnStyle(!loading)}>{loading ? "Signing in…" : "Sign in"}</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <button onClick={() => { setMode("signup"); setError(""); }} style={linkBtnStyle}>Create an account instead</button>
            <a href="/reset-password" style={{ fontSize: 12.5, color: C.muted, fontFamily: sans }}>Forgot password?</a>
          </div>
        </>
      )}
    </div>
  );
}
