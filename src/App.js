// App.js
// App v3.5 — simplified homepage, light theme, Ghost Ships positioning

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
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 36px",background:`${C.bg}F0`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:960,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
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
  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:sans}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:#D4A00040;color:#8B6400;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(11px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
      `}</style>

      <HomeNav authed={authed}/>

      {/* Hero */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"100px 36px 80px"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 13px",marginBottom:28,boxShadow:`0 1px 4px ${C.shadow}`}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
          <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>cloudbreak // live now</span>
          <span style={{width:1,height:11,background:C.border}}/>
          <span style={{fontFamily:mono,fontSize:11,color:C.amber}}>ghost ships // the destination</span>
        </div>

        <h1 style={{fontSize:34,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.25,marginBottom:24,color:C.text,maxWidth:700}}>
          netwrkr.ai will autonomously monitor, diagnose and operate your data centre fabric.
        </h1>

        <p style={{fontSize:16,color:C.dim,lineHeight:1.85,marginBottom:36,maxWidth:620}}>
          Data centre networks are complex to operate. They carry bugs, version drift, and accumulated risk that engineers spend their careers managing manually. netwrkr.ai is the AI layer that changes that — giving engineers the intelligence to make better decisions today, and building toward a fabric that monitors, diagnoses, and operates itself.
        </p>

        <div style={{display:"flex",gap:12,marginBottom:56}}>
          <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"13px 28px",cursor:"pointer",boxShadow:`0 2px 8px ${C.amber}40`}}>
            analyse_my_fabric() // free
          </button>
          <button onClick={()=>window.location.href="/signup"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:13,padding:"13px 22px",cursor:"pointer"}}>
            get_started →
          </button>
        </div>

        {/* Phase strip */}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:28}}>
          <div style={{fontFamily:mono,fontSize:10,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16}}>// roadmap</div>
          <div style={{display:"flex",gap:0,background:C.border,borderRadius:8,overflow:"hidden",boxShadow:`0 1px 6px ${C.shadow}`}}>
            {[
              {code:"Cloudbreak", label:"Live now",    desc:"Analysis & advisory intelligence",   color:C.green,  status:"live"},
              {code:"Desert Point",label:"Building",   desc:"Continuous monitoring",               color:C.amber,  status:"building"},
              {code:"Jaws",       label:"Next",        desc:"Autonomous remediation",              color:C.orange, status:"planned"},
              {code:"Ghost Ships",label:"Destination", desc:"Fully autonomous operations",         color:C.red,    status:"vision"},
            ].map((p,i,arr)=>(
              <div key={p.code} style={{flex:1,background:C.surface,padding:"16px 18px",borderRight:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{fontFamily:mono,fontSize:9,color:p.color,background:p.color+"15",border:`1px solid ${p.color}30`,padding:"2px 7px",letterSpacing:"0.06em"}}>{p.label}</span>
                  {p.status==="live"&&<span style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>}
                </div>
                <div style={{fontFamily:mono,fontSize:12,fontWeight:700,color:p.color,marginBottom:4}}>{p.code}</div>
                <div style={{fontSize:11,color:C.dim,lineHeight:1.5}}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"20px 36px",background:C.surface}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:13,fontWeight:700,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
          <div style={{display:"flex",gap:16}}>
            {["privacy","terms","security","contact"].map(l=>(
              <button key={l} onClick={()=>window.location.href=`/${l}`} style={{background:"none",border:"none",color:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>// cloudbreak → desert point → jaws → ghost ships</span>
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