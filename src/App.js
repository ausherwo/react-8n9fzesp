// v1.1 — auth wired in
import RinconChatPrototype from "./RinconChatPrototype";
import { AuthProvider, AuthGuard, LoginPage, SignupPage, AcceptInvitePage } from './Auth';
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordReset';

function Router() {
  const path = window.location.pathname;

  if (path === '/login')                  return <LoginPage />;
  if (path === '/signup')                 return <SignupPage />;
  if (path === '/accept-invite')          return <AcceptInvitePage />;
  if (path === '/reset-password')         return <ForgotPasswordPage />;
  if (path === '/reset-password/confirm') return <SetNewPasswordPage />;

  return (
    <AuthGuard>
      <RinconChatPrototype />
    </AuthGuard>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}