// App.js
// App v3.10 — light theme, updated copy

import { useState, useEffect, useRef } from "react";
import AnalysisApp from "./AnalysisApp";
import RinconChatPrototype from "./RinconChatPrototype";
import { AuthProvider, AuthGuard, LoginPage, SignupPage, AcceptInvitePage, useAuth } from './Auth';
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordReset';
import { SettingsPage } from './SettingsPage';
import { StrategyPage } from './StrategyPage';
import { ModelPage } from './ModelPage';

const C = {
  bg:      "#F7F5F0",
  surface: "#FFFFFF",
  hi:      "#F0EDE6",
  border:  "#DDD9CF",
  amber:   "#B8860B",
  amberB:  "#D4A000",
  amberG:  "#D4A00012",
  green:   "#1A7A3C",
  red:     "#C0392B",
  orange:  "#C0620B",
  text:    "#1A1810",
  dim:     "#4A4438",
  muted:   "#7A7060",
  shadow:  "rgba(0,0,0,0.06)",
};

const mono = "JetBrains Mono, Fira Code, monospace";
const sans = "'DM Sans', system-ui, sans-serif";

function HomeNav({ authed }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 680);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 680);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:isMobile?"0 20px":"0 36px",background:`${C.bg}F0`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div className="nav-inner" style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>window.location.href="/"}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontFamily:mono,fontWeight:700,fontSize:15,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {authed ? (
            <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
              dashboard →
            </button>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>window.location.href="/login"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 16px",cursor:"pointer"}}>
                sign_in()
              </button>
              <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
                try_free →
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Home({ authed }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 680);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 680);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return (
    <div style={{background:C.bg,color:C.text,fontFamily:sans}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:#D4A00040;color:#8B6400;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(11px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}

        /* ── DESKTOP (default) */
        .nav-inner{padding:0 36px;}
        .hero{max-width:960px;margin:0 auto;padding:80px 36px 64px;}
        .hero-h1{font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1.25;margin-bottom:24px;color:${C.text};max-width:700px;}
        .hero-p{font-size:16px;color:${C.dim};line-height:1.85;margin-bottom:16px;max-width:620px;}
        .hero-ul{font-size:15px;color:${C.dim};line-height:1.85;margin-bottom:36px;max-width:620px;padding-left:20px;}
        .hero-ul li{margin-bottom:10px;}
        .hero-btns{display:flex;gap:12px;margin-bottom:48px;}
        .hero-btns button{flex-shrink:0;}
        .footer-inner{max-width:960px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;}
        .footer-tagline{font-family:${mono};font-size:11px;color:${C.muted};}

        /* ── MOBILE */
        @media(max-width:680px){
          .nav-inner{padding:0 20px!important;}
          .hero{padding:40px 20px 36px!important;}
          .hero-h1{font-size:26px!important;line-height:1.2!important;margin-bottom:16px!important;}
          .hero-p{font-size:16px!important;line-height:1.75!important;margin-bottom:12px!important;}
          .hero-ul{font-size:15px!important;line-height:1.75!important;margin-bottom:28px!important;}
          .hero-btns{flex-direction:column!important;gap:10px!important;margin-bottom:32px!important;}
          .hero-btns button{width:100%!important;font-size:15px!important;padding:14px 20px!important;}
          .footer-inner{flex-direction:column!important;gap:14px!important;text-align:center!important;}
          .footer-tagline{display:none!important;}
          footer{padding:20px!important;}
        }
      `}</style>

      <HomeNav authed={authed}/>

      {/* Hero */}
      <div className="hero">
        <h1 style={{fontSize:isMobile?26:34,fontWeight:300,letterSpacing:"-0.03em",lineHeight:isMobile?1.2:1.25,marginBottom:isMobile?16:24,color:C.text,maxWidth:700}}>
          netwrkr.ai analyses your data centre network topology and tells you what security and software risks are present, ranked by priority based on your specific fabric.
        </h1>

        <p className="hero-p">
          netwrkr.ai accepts device inventory in any format and extracts a structured device list for your review before any analysis runs.
        </p>

        <ul className="hero-ul">
          <li>Live Cisco PSIRT API integration — verified advisories matched to your platform versions</li>
          <li>Risk scoring weighted by infrastructure role — spines, border leafs, and controllers assessed differently</li>
          <li>Pre-flight check blocks submission if hostnames, serial numbers, or other identifying data are detected</li>
          <li>Results returned as three prioritised items: act now, schedule, monitor</li>
        </ul>

        <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:12,marginBottom:48}}>
          <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:isMobile?15:13,padding:isMobile?"14px":"13px 28px",cursor:"pointer",boxShadow:`0 2px 8px ${C.amber}40`,width:isMobile?"100%":"auto"}}>
            analyse_my_fabric() // free
          </button>
          <button onClick={()=>window.location.href="/signup"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:isMobile?15:13,padding:isMobile?"14px":"13px 22px",cursor:"pointer",width:isMobile?"100%":"auto"}}>
            get_started →
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"22px 36px",background:C.surface}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:"center",gap:isMobile?12:0,textAlign:isMobile?"center":"left"}}>
          <span style={{fontFamily:mono,fontSize:13,fontWeight:700,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
            {["privacy","terms","security","contact"].map(l=>(
              <button key={l} onClick={()=>window.location.href=`/${l}`} style={{background:"none",border:"none",color:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          {!isMobile&&<span style={{fontFamily:mono,fontSize:11,color:C.muted}}>// cloudbreak</span>}
        </div>
      </footer>
    </div>
  );
}

function HistoryStub() {
  return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.text,fontFamily:mono}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:16}}>// coming soon</div>
        <div style={{fontSize:24,fontWeight:300,marginBottom:12}}>Analysis history</div>
        <div style={{fontSize:13,color:C.dim,marginBottom:24}}>Full history with member attribution — Phase 2.</div>
        <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"9px 18px",cursor:"pointer"}}>
          ← back_to_dashboard()
        </button>
      </div>
    </div>
  );
}

function RootPage() {
  const { session, loading } = useAuth();
  useEffect(() => { if (!loading && session) window.location.replace("/app"); }, [session, loading]);
  if (loading) return null;
  if (session) return null;
  return <Home authed={false}/>;
}

function Router() {
    const { member, org } = useAuth();
      useEffect(() => {
          if (member) {
                posthog.identify(member.id, {
                        org_id: org.id,
                                org_slug: org.slug,
                                        role: member.role
                                              });
                                                  }
                                                    }, [member]);
  const path = window.location.pathname;
  if (path === '/login')                  return <LoginPage />;
  if (path === '/signup')                 return <SignupPage />;
  if (path === '/accept-invite')          return <AcceptInvitePage />;
  if (path === '/reset-password')         return <ForgotPasswordPage />;
  if (path === '/reset-password/confirm') return <SetNewPasswordPage />;
  if (path === '/analyse')                return <AnalysisApp />;
  if (path === '/app')                    return <AuthGuard><RinconChatPrototype /></AuthGuard>;
  if (path === '/settings')               return <AuthGuard><SettingsPage /></AuthGuard>;
  if (path === '/strategy')               return <StrategyPage />;
  if (path === '/model')                  return <ModelPage />;
  if (path === '/history')                return <AuthGuard><HistoryStub /></AuthGuard>;
  if (path === '/' || path === '')        return <RootPage />;
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