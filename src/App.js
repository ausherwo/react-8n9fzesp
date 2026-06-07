// App.js
// App v3.13 — aggressive terminal UI, IBM Plex Mono dominant

import { useState, useEffect, useRef } from "react";
import AnalysisApp from "./AnalysisApp";
import RinconChatPrototype from "./RinconChatPrototype";
import { AuthProvider, AuthGuard, LoginPage, SignupPage, AcceptInvitePage, useAuth } from './Auth';
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordReset';
import { SettingsPage } from './SettingsPage';
import { StrategyPage } from './StrategyPage';
import { ModelPage } from './ModelPage';

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

// IBM Plex Mono  — dominant: logo, nav, commands, headlines, labels, buttons, stats
// IBM Plex Sans  — body paragraphs only
const mono = "'IBM Plex Mono', monospace";
const sans = "'IBM Plex Sans', system-ui, sans-serif";

function Cursor() {
  return (
    <span style={{
      display:"inline-block",
      width:"0.55em",
      height:"1.1em",
      background:C.amber,
      verticalAlign:"text-bottom",
      marginLeft:1,
      animation:"blink 1.1s step-end infinite"
    }}/>
  );
}

function HomeNav({ authed }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 680);
  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 680);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  return (
    <nav style={{
      borderBottom:`1px solid ${C.border}`,
      background:`${C.bg}F0`,
      backdropFilter:"blur(20px)",
      position:"sticky",top:0,zIndex:100
    }}>
      <div style={{
        maxWidth:960,margin:"0 auto",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        height:56,padding:isMobile?"0 20px":"0 36px"
      }}>

        {/* Logo — mono with blinking cursor */}
        <div
          style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}
          onClick={()=>window.location.href="/"}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{fontFamily:mono,fontWeight:500,fontSize:15,color:C.text,letterSpacing:"-0.01em"}}>
            netwrkr<span style={{color:C.amber}}>.ai</span><Cursor/>
          </span>
        </div>

        {/* Nav — all mono */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {authed ? (
            <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#000",border:"none",borderRadius:3,fontFamily:mono,fontWeight:500,fontSize:13,padding:"7px 16px",cursor:"pointer",letterSpacing:"-0.01em"}}>
              &gt;&nbsp;dashboard()
            </button>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>window.location.href="/login"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:3,fontFamily:mono,fontWeight:400,fontSize:13,padding:"7px 16px",cursor:"pointer",letterSpacing:"-0.01em"}}>
                sign_in()
              </button>
              <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#000",border:"none",borderRadius:3,fontFamily:mono,fontWeight:500,fontSize:13,padding:"7px 16px",cursor:"pointer",letterSpacing:"-0.01em"}}>
                &gt;&nbsp;try_free()
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
    <div style={{background:C.bg,color:C.text,minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:${C.amber}30;color:${C.amber};}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
        .hero{max-width:960px;margin:0 auto;padding:${isMobile?"44px 20px 40px":"88px 36px 72px"};}
        .hero-body{font-family:${sans};font-size:${isMobile?"17px":"18px"};font-weight:400;color:${C.dim};line-height:1.8;margin-bottom:20px;max-width:580px;}
        .hero-ul{list-style:none;padding:0;margin:0 0 40px 0;max-width:580px;}
        .hero-ul li{font-family:${sans};font-size:${isMobile?"17px":"18px"};font-weight:400;color:${C.dim};line-height:1.8;margin-bottom:10px;padding-left:22px;position:relative;}
        .hero-ul li::before{content:"›";position:absolute;left:0;top:1px;color:${C.amber};font-family:${mono};font-size:16px;}
        footer a,footer button{background:none;border:none;color:${C.muted};font-family:${mono};font-size:12px;cursor:pointer;padding:0;letter-spacing:-0.01em;}
        footer a:hover,footer button:hover{color:${C.dim};}
      `}</style>

      <HomeNav authed={authed}/>

      <div className="hero">

        {/* $ section label — mono, amber */}
        <div style={{fontFamily:mono,fontWeight:400,fontSize:isMobile?12:13,color:C.amber,marginBottom:20,letterSpacing:"-0.01em"}}>
          $ analyse_my_fabric
        </div>

        {/* Headline — IBM Plex Mono, weight 500 */}
        <h1 style={{
          fontFamily:mono,
          fontWeight:500,
          fontSize:isMobile?24:34,
          lineHeight:1.25,
          letterSpacing:"-0.02em",
          color:C.text,
          maxWidth:700,
          marginBottom:28
        }}>
          netwrkr.ai analyses your data centre network topology and tells you what security and software risks are present, ranked by priority based on your specific fabric.
        </h1>

        {/* Body — IBM Plex Sans */}
        <p className="hero-body">
          netwrkr.ai accepts device inventory in any format and extracts a structured device list for your review before any analysis runs.
        </p>

        {/* Bullets — IBM Plex Sans body, amber › marker */}
        <ul className="hero-ul">
          <li>Live Cisco PSIRT API integration — verified advisories matched to your platform versions</li>
          <li>Risk scoring weighted by infrastructure role — spines, border leafs, and controllers assessed differently</li>
          <li>Pre-flight check blocks submission if hostnames, serial numbers, or other identifying data are detected</li>
          <li>Results returned as three prioritised items: act_now, schedule, monitor</li>
        </ul>

        {/* CTAs — IBM Plex Mono */}
        <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:12,marginBottom:56}}>
          <button
            onClick={()=>window.location.href="/analyse"}
            style={{
              background:C.amber,color:"#000",border:"none",
              borderRadius:3,fontFamily:mono,fontWeight:500,
              fontSize:isMobile?14:13,
              padding:isMobile?"14px 20px":"12px 28px",
              cursor:"pointer",letterSpacing:"-0.01em",
              boxShadow:`0 0 20px ${C.amber}30`,
              width:isMobile?"100%":"auto",
              whiteSpace:"nowrap"
            }}>
            &gt;&nbsp;analyse_my_fabric() <span style={{opacity:0.55}}>// free</span>
          </button>
          <button
            onClick={()=>window.location.href="/signup"}
            style={{
              background:"none",border:`1px solid ${C.border}`,
              color:C.dim,borderRadius:3,fontFamily:mono,fontWeight:400,
              fontSize:isMobile?14:13,
              padding:isMobile?"14px 20px":"12px 24px",
              cursor:"pointer",letterSpacing:"-0.01em",
              width:isMobile?"100%":"auto",
              whiteSpace:"nowrap"
            }}>
            &gt;&nbsp;get_started()
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"20px 36px",background:C.surface}}>
        <div style={{
          maxWidth:960,margin:"0 auto",
          display:"flex",
          flexDirection:isMobile?"column":"row",
          justifyContent:"space-between",
          alignItems:"center",
          gap:isMobile?14:0
        }}>
          <span style={{fontFamily:mono,fontWeight:500,fontSize:13,color:C.text,letterSpacing:"-0.01em"}}>
            netwrkr<span style={{color:C.amber}}>.ai</span>
          </span>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",justifyContent:"center"}}>
            {["privacy","terms","security","contact"].map(l=>(
              <button key={l} onClick={()=>window.location.href=`/${l}`}>{l}</button>
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
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.text}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:mono,fontSize:13,color:C.amber,marginBottom:20}}>$ coming_soon</div>
        <div style={{fontFamily:mono,fontWeight:500,fontSize:26,marginBottom:12,letterSpacing:"-0.02em"}}>analysis_history</div>
        <div style={{fontFamily:sans,fontSize:16,fontWeight:400,color:C.dim,marginBottom:28}}>
          Full history with member attribution — Phase 2.
        </div>
        <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#000",border:"none",borderRadius:3,fontFamily:mono,fontWeight:500,fontSize:13,padding:"10px 20px",cursor:"pointer",letterSpacing:"-0.01em"}}>
          &gt;&nbsp;back_to_dashboard()
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