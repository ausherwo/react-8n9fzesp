// App.js
// App v3.10 — JS-based mobile detection, no CSS specificity issues

import { useState, useEffect, useRef } from "react";
import AnalysisApp from "./AnalysisApp";
import RinconChatPrototype from "./RinconChatPrototype";
import { AuthProvider, AuthGuard, LoginPage, SignupPage, AcceptInvitePage, useAuth } from './Auth';
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordReset';
import { SettingsPage } from './SettingsPage';
import { StrategyPage } from './StrategyPage';
import { ModelPage } from './ModelPage';
import posthog from 'posthog-js';
posthog.init('phc_YOUR_KEY_HERE', {
  api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only'
    });

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
        .hero-p{font-size:16px;color:${C.dim};line-height:1.85;margin-bottom:36px;max-width:620px;}
        .hero-btns{display:flex;gap:12px;margin-bottom:48px;}
        .hero-btns button{flex-shrink:0;}
        .roadmap-section{border-top:1px solid ${C.border};padding-top:28px;}
        .roadmap-label{font-family:${mono};font-size:10px;color:${C.muted};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px;}
        .roadmap-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;}
        .roadmap-cell{background:#FFFFFF;padding:16px 18px;}
        .roadmap-cell{background:${C.surface};padding:16px 18px;}
        .footer-inner{max-width:960px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;}
        .footer-tagline{font-family:${mono};font-size:11px;color:${C.muted};}

        /* ── MOBILE */
        @media(max-width:680px){
          .nav-inner{padding:0 20px!important;}
          .hero{padding:40px 20px 36px!important;}
          .hero-h1{font-size:26px!important;line-height:1.2!important;margin-bottom:16px!important;}
          .hero-p{font-size:16px!important;line-height:1.75!important;margin-bottom:28px!important;}
          .hero-btns{flex-direction:column!important;gap:10px!important;margin-bottom:32px!important;}
          .hero-btns button{width:100%!important;font-size:15px!important;padding:14px 20px!important;}
          .roadmap-grid{grid-template-columns:1fr!important;gap:0!important;}
          .roadmap-cell{padding:14px 16px!important;border-bottom:1px solid ${C.border}!important;}
          .roadmap-cell:last-child{border-bottom:none!important;}
          .footer-inner{flex-direction:column!important;gap:14px!important;text-align:center!important;}
          .footer-tagline{display:none!important;}
          footer{padding:20px!important;}
        }
      `}</style>

      <HomeNav authed={authed}/>

      {/* Hero */}
      <div className="hero">
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 13px",marginBottom:24,boxShadow:`0 1px 4px ${C.shadow}`}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
          <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>cloudbreak // live now</span>
          <span style={{width:1,height:11,background:C.border}}/>
          <span style={{fontFamily:mono,fontSize:11,color:C.amber}}>ghost ships // the destination</span>
        </div>

        <h1 style={{fontSize:isMobile?26:34,fontWeight:300,letterSpacing:"-0.03em",lineHeight:isMobile?1.2:1.25,marginBottom:isMobile?16:24,color:C.text,maxWidth:700}}>
          netwrkr.ai will autonomously monitor, diagnose and operate your data centre fabric.
        </h1>

        <p className="hero-p">
          Data centre networks are complex to operate. They carry bugs, version drift, and accumulated risk that engineers spend their careers managing manually. netwrkr.ai is the AI layer that changes that — giving engineers the intelligence to make better decisions today, and building toward a fabric that monitors, diagnoses, and operates itself.
        </p>

        <div style={{display:"flex",flexDirection:isMobile?"column":"row",gap:12,marginBottom:48}}>
          <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:isMobile?15:13,padding:isMobile?"14px":"13px 28px",cursor:"pointer",boxShadow:`0 2px 8px ${C.amber}40`,width:isMobile?"100%":"auto"}}>
            analyse_my_fabric() // free
          </button>
          <button onClick={()=>window.location.href="/signup"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:isMobile?15:13,padding:isMobile?"14px":"13px 22px",cursor:"pointer",width:isMobile?"100%":"auto"}}>
            get_started →
          </button>
        </div>

        {/* Roadmap */}
        <div className="roadmap-section">
          <div className="roadmap-label">// roadmap</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(4,1fr)",gap:1,background:C.border,borderRadius:8,overflow:"hidden",boxShadow:`0 1px 6px ${C.shadow}`}}>
            {[
              {code:"Cloudbreak",  label:"Live now",    desc:"Analysis & advisory intelligence",  color:C.green,  live:true},
              {code:"Desert Point",label:"Building",    desc:"Continuous monitoring",              color:C.amber,  live:false},
              {code:"Jaws",        label:"Next",        desc:"Autonomous remediation",             color:C.orange, live:false},
              {code:"Ghost Ships", label:"Destination", desc:"Fully autonomous operations",        color:C.red,    live:false},
            ].map((p)=>(
              <div key={p.code} style={{background:C.surface,padding:isMobile?"14px 16px":"16px 18px",borderBottom:isMobile?`1px solid ${C.border}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontFamily:mono,fontSize:9,color:p.color,background:p.color+"15",border:`1px solid ${p.color}30`,padding:"2px 7px",letterSpacing:"0.06em"}}>{p.label}</span>
                  {p.live&&<span style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>}
                </div>
                <div style={{fontFamily:mono,fontSize:12,fontWeight:700,color:p.color,marginBottom:4}}>{p.code}</div>
                <div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>{p.desc}</div>
              </div>
            ))}
          </div>
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
          {!isMobile&&<span style={{fontFamily:mono,fontSize:11,color:C.muted}}>// cloudbreak → desert point → jaws → ghost ships</span>}
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