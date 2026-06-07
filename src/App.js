// App.js
// App v3.12 — dark terminal theme, IBM Plex Sans + Mono

import { useState, useEffect, useRef } from "react";
import AnalysisApp from "./AnalysisApp";
import RinconChatPrototype from "./RinconChatPrototype";
import { AuthProvider, AuthGuard, LoginPage, SignupPage, AcceptInvitePage, useAuth } from './Auth';
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordReset';
import { SettingsPage } from './SettingsPage';
import { StrategyPage } from './StrategyPage';
import { ModelPage } from './ModelPage';

// ── Colour tokens
const C = {
  bg:      "#0A0B0C",
  surface: "#111316",
  hi:      "#171A1E",
  border:  "#252A30",
  amber:   "#D4A000",
  amberB:  "#F0B429",
  amberG:  "#D4A00018",
  green:   "#4ADE80",
  red:     "#F87171",
  orange:  "#FB923C",
  text:    "#E8EAED",
  dim:     "#9AA0A8",
  muted:   "#4E5460",
  shadow:  "rgba(0,0,0,0.5)",
};

// ── Typography
// IBM Plex Sans  → headlines, paragraph text, navigation, general UI
// IBM Plex Mono  → commands, buttons, terminal output, section labels, stats
const mono = "'IBM Plex Mono', monospace";
const sans = "'IBM Plex Sans', system-ui, sans-serif";

function HomeNav({ authed }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 680);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 680);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:isMobile?"0 20px":"0 36px",background:`${C.bg}F0`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>

        {/* Logo — Mono, brand mark */}
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>window.location.href="/"}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontFamily:mono,fontWeight:500,fontSize:15,color:C.text,letterSpacing:"-0.01em"}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
        </div>

        {/* Nav actions — Mono, command style */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {authed ? (
            <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#000",border:"none",borderRadius:4,fontFamily:mono,fontWeight:500,fontSize:13,padding:"7px 16px",cursor:"pointer",letterSpacing:"-0.01em"}}>
              &gt; dashboard()
            </button>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>window.location.href="/login"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:4,fontFamily:mono,fontWeight:400,fontSize:13,padding:"7px 16px",cursor:"pointer",letterSpacing:"-0.01em"}}>
                sign_in()
              </button>
              <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#000",border:"none",borderRadius:4,fontFamily:mono,fontWeight:500,fontSize:13,padding:"7px 16px",cursor:"pointer",letterSpacing:"-0.01em"}}>
                &gt; try_free()
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
    <div style={{background:C.bg,color:C.text,fontFamily:sans,minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:${C.amber}30;color:${C.amber};}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}

        /* Hero layout */
        .hero{max-width:960px;margin:0 auto;padding:88px 36px 72px;}

        /* IBM Plex Sans — body copy */
        .hero-p{
          font-family:${sans};
          font-size:18px;
          font-weight:400;
          color:${C.dim};
          line-height:1.8;
          margin-bottom:20px;
          max-width:600px;
        }

        /* IBM Plex Sans — bullets */
        .hero-ul{
          font-family:${sans};
          font-size:18px;
          font-weight:400;
          color:${C.dim};
          line-height:1.8;
          margin-bottom:40px;
          max-width:600px;
          list-style:none;
          padding-left:0;
        }
        .hero-ul li{
          margin-bottom:12px;
          padding-left:22px;
          position:relative;
        }
        .hero-ul li::before{
          content:"›";
          position:absolute;
          left:0;
          color:${C.amber};
          font-family:${mono};
          font-weight:500;
          font-size:16px;
          top:2px;
        }

        /* Mobile overrides */
        @media(max-width:680px){
          .hero{padding:44px 20px 40px!important;}
          .hero-p{font-size:17px!important;}
          .hero-ul{font-size:17px!important;margin-bottom:28px!important;}
          footer{padding:20px 20px!important;}
        }
      `}</style>

      <HomeNav authed={authed}/>

      {/* Hero */}
      <div className="hero">

        {/* IBM Plex Sans 600 — main headline */}
        <h1 style={{
          fontFamily:sans,
          fontSize:isMobile?26:38,
          fontWeight:600,
          letterSpacing:"-0.02em",
          lineHeight:1.2,
          marginBottom:28,
          color:C.text,
          maxWidth:720
        }}>
          netwrkr.ai analyses your data centre network topology and tells you what security and software risks are present, ranked by priority based on your specific fabric.
        </h1>

        {/* IBM Plex Sans 400 — body */}
        <p className="hero-p">
          netwrkr.ai accepts device inventory in any format and extracts a structured device list for your review before any analysis runs.
        </p>

        {/* IBM Plex Sans 400 — bullets with amber › */}
        <ul className="hero-ul">
          <li>Live Cisco PSIRT API integration — verified advisories matched to your platform versions</li>
          <li>Risk scoring weighted by infrastructure role — spines, border leafs, and controllers assessed differently</li>
          <li>Pre-flight check blocks submission if hostnames, serial numbers, or other identifying data are detected</li>
          <li>Results returned as three prioritised items: act now, schedule, monitor</li>
        </ul>

        {/* IBM Plex Mono — command-style buttons */}
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:12,marginBottom:56}}>
          <button
            onClick={()=>window.location.href="/analyse"}
            style={{
              background:C.amber,color:"#000",border:"none",
              borderRadius:4,fontFamily:mono,fontWeight:500,
              fontSize:isMobile?15:14,
              padding:isMobile?"14px 20px":"13px 28px",
              cursor:"pointer",
              letterSpacing:"-0.01em",
              boxShadow:`0 2px 16px ${C.amber}35`,
              width:isMobile?"100%":"auto"
            }}>
            &gt; analyse_my_fabric() <span style={{opacity:0.6}}>// free</span>
          </button>
          <button
            onClick={()=>window.location.href="/signup"}
            style={{
              background:"none",
              border:`1px solid ${C.border}`,
              color:C.dim,
              borderRadius:4,fontFamily:mono,fontWeight:400,
              fontSize:isMobile?15:14,
              padding:isMobile?"14px 20px":"13px 24px",
              cursor:"pointer",
              letterSpacing:"-0.01em",
              width:isMobile?"100%":"auto"
            }}>
            &gt; get_started()
          </button>
        </div>
      </div>

      {/* Footer — Mono throughout */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"22px 36px",background:C.surface}}>
        <div style={{
          maxWidth:960,margin:"0 auto",
          display:"flex",
          flexDirection:isMobile?"column":"row",
          justifyContent:"space-between",
          alignItems:"center",
          gap:isMobile?14:0,
          textAlign:isMobile?"center":"left"
        }}>
          <span style={{fontFamily:mono,fontWeight:500,fontSize:13,color:C.text,letterSpacing:"-0.01em"}}>
            netwrkr<span style={{color:C.amber}}>.ai</span>
          </span>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",justifyContent:"center"}}>
            {["privacy","terms","security","contact"].map(l=>(
              <button key={l} onClick={()=>window.location.href=`/${l}`} style={{background:"none",border:"none",color:C.muted,fontFamily:mono,fontWeight:400,fontSize:12,cursor:"pointer",letterSpacing:"-0.01em"}}>
                {l}
              </button>
            ))}
          </div>
          {!isMobile && <span style={{fontFamily:mono,fontWeight:400,fontSize:12,color:C.muted}}>// cloudbreak</span>}
        </div>
      </footer>
    </div>
  );
}

function HistoryStub() {
  return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.text,fontFamily:sans}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:mono,fontSize:12,color:C.amber,letterSpacing:"0.06em",marginBottom:16}}>
          $ coming_soon
        </div>
        <div style={{fontFamily:sans,fontSize:26,fontWeight:600,marginBottom:12}}>
          Analysis history
        </div>
        <div style={{fontFamily:sans,fontSize:16,fontWeight:400,color:C.dim,marginBottom:28}}>
          Full history with member attribution — Phase 2.
        </div>
        <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#000",border:"none",borderRadius:4,fontFamily:mono,fontWeight:500,fontSize:13,padding:"10px 20px",cursor:"pointer",letterSpacing:"-0.01em"}}>
          &gt; back_to_dashboard()
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