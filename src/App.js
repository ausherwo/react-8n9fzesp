//   /                → Home (public marketing) — redirects to /app if authenticated
//   /analyse         → AnalysisApp (public free tier)
//   /app             → RinconChatPrototype (authenticated dashboard)
//   /login           → LoginPage
//   /signup          → SignupPage
//   /accept-invite   → AcceptInvitePage
//   /reset-password  → ForgotPasswordPage
//   /reset-password/confirm → SetNewPasswordPage
//   /settings        → SettingsPage (authenticated)
//   /history         → HistoryPage stub (authenticated)

import { useEffect } from "react";
import AnalysisApp from "./AnalysisApp";
import RinconChatPrototype from "./RinconChatPrototype";
import { AuthProvider, AuthGuard, LoginPage, SignupPage, AcceptInvitePage, useAuth } from './Auth';
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordReset';
import { SettingsPage } from './SettingsPage';

// ── Redirect authenticated users away from marketing pages
function HomeRedirect() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      window.location.replace("/app");
    }
  }, [session, loading]);

  if (loading) return null;
  if (session) return null; // redirect in progress

  // Not authenticated — show public analysis tool as the entry point
  // This routes / to the free analysis experience, not a locked marketing page
  return <AnalysisApp />;
}

// ── History stub — placeholder until HistoryPage is built
function HistoryStub() {
  const C = {
    bg: "#080806", surface: "#0E0D0A", border: "#272318",
    amber: "#D4A000", dim: "#9C9278", muted: "#524B3A",
    text: "#EDE8DC",
  };
  const mono = "JetBrains Mono, Fira Code, monospace";
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.text, fontFamily: mono }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16 }}>// coming soon</div>
        <div style={{ fontSize: 24, fontWeight: 300, marginBottom: 12 }}>Analysis history</div>
        <div style={{ fontSize: 13, color: C.dim, marginBottom: 24 }}>Full history with member attribution — Phase 2.</div>
        <button onClick={() => window.location.href = "/app"} style={{ background: C.amber, color: "#000", border: "none", borderRadius: 6, fontFamily: mono, fontWeight: 700, fontSize: 12, padding: "9px 18px", cursor: "pointer" }}>
          ← back_to_dashboard()
        </button>
      </div>
    </div>
  );
}

function Router() {
  const path = window.location.pathname;

  // Public auth routes
  if (path === '/login')                   return <LoginPage />;
  if (path === '/signup')                  return <SignupPage />;
  if (path === '/accept-invite')           return <AcceptInvitePage />;
  if (path === '/reset-password')          return <ForgotPasswordPage />;
  if (path === '/reset-password/confirm')  return <SetNewPasswordPage />;

  // Public free-tier analysis — always accessible without auth
  if (path === '/analyse')                 return <AnalysisApp />;

  // Authenticated routes
  if (path === '/app')                     return <AuthGuard><RinconChatPrototype /></AuthGuard>;
  if (path === '/settings')                return <AuthGuard><SettingsPage /></AuthGuard>;
  if (path === '/history')                 return <AuthGuard><HistoryStub /></AuthGuard>;

  // Root — redirect authenticated users to /app, show analysis tool to guests
  if (path === '/' || path === '')         return <HomeRedirect />;

  // 404 fallback — redirect to home
  window.location.replace('/');
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}