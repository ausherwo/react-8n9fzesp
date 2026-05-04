// App.js
// App v3.1 — definitive routing with Home marketing page
// Route map:
//   /                → Home (public marketing) — redirects to /app if authenticated
//   /analyse         → AnalysisApp (public free tier, no auth required)
//   /app             → RinconChatPrototype (authenticated dashboard)
//   /login           → LoginPage
//   /signup          → SignupPage
//   /accept-invite   → AcceptInvitePage
//   /reset-password  → ForgotPasswordPage
//   /reset-password/confirm → SetNewPasswordPage
//   /settings        → SettingsPage (authenticated)
//   /history         → HistoryStub (authenticated, Phase 2)

import { useState, useEffect, useRef } from "react";
import AnalysisApp from "./AnalysisApp";
import RinconChatPrototype from "./RinconChatPrototype";
import { AuthProvider, AuthGuard, LoginPage, SignupPage, AcceptInvitePage, useAuth } from './Auth';
import { ForgotPasswordPage, SetNewPasswordPage } from './PasswordReset';
import { SettingsPage } from './SettingsPage';
import { StrategyPage } from './StrategyPage';

const C = {
  bg:"#080806", surface:"#0E0D0A", hi:"#141310",
  border:"#272318", amber:"#D4A000", amberB:"#FFCA28",
  amberG:"#D4A00015", green:"#22C55E", greenG:"#22C55E15",
  red:"#EF4444", orange:"#F97316", yellow:"#EAB308",
  text:"#EDE8DC", dim:"#9C9278", muted:"#524B3A", faint:"#1A1810",
};

const mono = "JetBrains Mono, Fira Code, monospace";

function Pill({ children, color=C.amber }) {
  return <span style={{fontFamily:mono,fontSize:10,color,background:color+"18",border:`1px solid ${color}30`,padding:"2px 8px",borderRadius:3,letterSpacing:"0.04em"}}>{children}</span>;
}

function MacBar({ label }) {
  return (
    <div style={{background:C.hi,borderBottom:`1px solid ${C.border}`,padding:"8px 14px",display:"flex",alignItems:"center",gap:7}}>
      {["#FF5F56","#FFBD2E","#27C93F"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c,opacity:.8}}/>)}
      <span style={{marginLeft:8,fontFamily:mono,fontSize:11,color:C.muted}}>{label}</span>
    </div>
  );
}

function Cur() {
  const [v,setV]=useState(true);
  useEffect(()=>{const t=setInterval(()=>setV(x=>!x),530);return()=>clearInterval(t);},[]);
  return <span style={{color:C.amber,opacity:v?1:0}}>▌</span>;
}

const TL = [
  {t:0,   s:"$ netwrkr analyze --input fabric.csv",          c:C.amber},
  {t:600, s:"  parsing inventory... 7 devices found",        c:C.muted},
  {t:1100,s:"  querying Cisco Bug API...",                    c:C.muted},
  {t:1800,s:"  ✓  47 bugs retrieved",                        c:C.green},
  {t:2200,s:"  running AI fabric analysis...",               c:C.muted},
  {t:3000,s:"  ✓  analysis complete",                        c:C.green},
  {t:3200,s:"",                                               c:C.muted},
  {t:3300,s:"  CRITICAL  CSCvz88341  ARP memory leak",       c:C.red},
  {t:3600,s:"  HIGH      CSCwb91234  BGP reset under ECMP",  c:C.orange},
  {t:3900,s:"  HIGH      CSCwc11872  VXLAN BUM >40Gbps",     c:C.orange},
  {t:4200,s:"",                                               c:C.muted},
  {t:4300,s:"  → upgrade LEAF-SW-02 to 9.3(7) immediately", c:C.amber},
  {t:4700,s:"  → upgrade spines to 10.3(1) before Q3",      c:C.amber},
  {t:5100,s:"$ _",                                            c:C.amber},
];

function Terminal() {
  const [n,setN]=useState(0);
  useEffect(()=>{
    if(n>=TL.length) return;
    const d = n===0?600 : TL[n].t-TL[n-1].t;
    const t=setTimeout(()=>setN(x=>x+1),d);
    return()=>clearTimeout(t);
  },[n]);
  return (
    <div style={{background:"#050503",border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",boxShadow:`0 0 50px ${C.amber}0D`}}>
      <MacBar label="netwrkr.ai — enterprise terminal"/>
      <div style={{padding:"18px 20px",minHeight:300,fontFamily:mono,fontSize:13,lineHeight:1.8}}>
        {TL.slice(0,n).map((l,i)=><div key={i} style={{color:l.c,whiteSpace:"pre"}}>{l.s}</div>)}
        {n<TL.length&&n>0&&<Cur/>}
      </div>
    </div>
  );
}

function HomeNav({ authed }) {
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 36px",background:`${C.bg}E8`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1140,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>window.location.href="/"}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontFamily:mono,fontWeight:700,fontSize:15}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          {[["analyse","/analyse"],["glossary","/glossary"],["security","/security"]].map(([label,path])=>(
            <button key={label} onClick={()=>window.location.href=path} style={{background:"none",border:"none",fontFamily:mono,fontSize:12,color:C.muted,cursor:"pointer",padding:"5px 10px",borderRadius:4,letterSpacing:"0.04em"}}>{label}</button>
          ))}
          <div style={{width:1,height:16,background:C.border,margin:"0 8px"}}/>
          {authed ? (
            <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
              dashboard →
            </button>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>window.location.href="/login"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 16px",cursor:"pointer"}}>
                sign_in()
              </button>
              <button onClick={()=>window.location.href="/signup"} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
                get_started →
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function Home({ authed }) {
  const [tab,setTab]=useState("ent");
  const [email,setEmail]=useState("");
  const [done,setDone]=useState(false);

  const Btn = ({label,active,onClick}) => (
    <button onClick={onClick} style={{background:active?C.amber:"transparent",color:active?"#000":C.muted,border:"none",borderRadius:5,fontFamily:mono,fontSize:12,fontWeight:active?700:400,padding:"8px 18px",cursor:"pointer",letterSpacing:"0.03em",transition:"all .15s"}}>{label}</button>
  );

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:${C.amber}30;color:${C.amberB};}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(11px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
      `}</style>
      <div style={{position:"fixed",inset:0,backgroundImage:`linear-gradient(${C.border}55 1px,transparent 1px),linear-gradient(90deg,${C.border}55 1px,transparent 1px)`,backgroundSize:"72px 72px",pointerEvents:"none",zIndex:0,opacity:.4}}/>
      <div style={{position:"fixed",top:"15%",left:"50%",transform:"translateX(-50%)",width:680,height:480,background:`radial-gradient(ellipse,${C.amber}06 0%,transparent 65%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"relative",zIndex:1}}>
        <HomeNav authed={authed}/>

        {/* Hero */}
        <div style={{maxWidth:1140,margin:"0 auto",padding:"80px 36px 64px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"center"}}>
          <div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 13px",marginBottom:22}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
              <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>open beta</span>
              <span style={{width:1,height:11,background:C.border}}/>
              <span style={{fontFamily:mono,fontSize:11,color:C.amber}}>self-hosted enterprise available</span>
            </div>
            <div style={{fontFamily:mono,fontSize:12,color:C.muted,marginBottom:8,letterSpacing:"0.06em"}}>// cisco dc risk analysis</div>
            <h1 style={{fontSize:48,fontWeight:300,letterSpacing:"-0.04em",lineHeight:1.08,marginBottom:18}}>
              Your network's<br/>bugs. Found.<br/><span style={{color:C.amber}}>Fixed.</span>
            </h1>
            <p style={{fontSize:15,color:C.dim,lineHeight:1.8,marginBottom:28,maxWidth:420}}>
              netwrkr.ai cross-references your Cisco DC fabric against live bug data and generates a sequenced remediation plan — free in your browser, or self-hosted behind your firewall.
            </p>
            <div style={{display:"flex",gap:12,marginBottom:32}}>
              <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px 26px",cursor:"pointer"}}>
                try_free() // no signup
              </button>
              <button style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:13,padding:"12px 20px",cursor:"pointer"}}>
                docker pull netwrkr/netwrkr-ai
              </button>
            </div>
            <div style={{display:"flex",borderTop:`1px solid ${C.border}`,paddingTop:22}}>
              {[["Free","browser-based"],["Self-hosted","enterprise docker"],["0 credentials","leave your network"]].map(([v,l],i)=>(
                <div key={i} style={{flex:1,paddingRight:18,borderRight:i<2?`1px solid ${C.border}`:"none",paddingLeft:i>0?18:0}}>
                  <div style={{fontFamily:mono,fontSize:17,fontWeight:700,color:C.amber}}>{v}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <Terminal/>
        </div>

        {/* Tier toggle */}
        <div style={{maxWidth:1140,margin:"0 auto",padding:"0 36px 72px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:36}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:4,display:"flex",gap:2}}>
              <Btn label="Enterprise // self-hosted" active={tab==="ent"} onClick={()=>setTab("ent")}/>
              <Btn label="Free // browser-based"     active={tab==="free"} onClick={()=>setTab("free")}/>
            </div>
          </div>
          {tab==="ent"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"start"}}>
              <div>
                <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// enterprise edition</div>
                <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:14}}>Runs inside your perimeter.</h2>
                <p style={{fontSize:14,color:C.dim,lineHeight:1.8,marginBottom:22}}>A Docker image you run on your own infrastructure. Credentials never leave your network — not even to us.</p>
                {[["🔐","Zero credential exposure","Cisco API calls from your server. We never see your credentials."],["🐳","One-command install","docker pull + docker run. Running in under 2 minutes."],["🔍","Fully auditable","Open source backend. Read every line before you run it."],["⚡","Live Cisco Bug API","Real-time authoritative data. Every CSC ID verified."]].map(([ic,t,d])=>(
                  <div key={t} style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
                    <span style={{fontSize:17,flexShrink:0,marginTop:1}}>{ic}</span>
                    <div><div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{t}</div><div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{d}</div></div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{background:"#050503",border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                  <MacBar label="terminal"/>
                  <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:9}}>
                    {[["01","docker pull netwrkr/netwrkr-ai"],["02","docker run -p 8080:8080 netwrkr/netwrkr-ai"],["03","open http://localhost:8080"]].map(([n,cmd])=>(
                      <div key={n} style={{display:"flex",gap:10}}>
                        <span style={{fontFamily:mono,fontSize:11,color:C.muted,width:22,flexShrink:0}}>{n}</span>
                        <span style={{fontFamily:mono,fontSize:13,color:C.text}}><span style={{color:C.muted}}>$ </span>{cmd}</span>
                      </div>
                    ))}
                    <div style={{marginTop:4,paddingTop:9,borderTop:`1px solid ${C.faint}`,fontFamily:mono,fontSize:11,color:C.green}}>✓  netwrkr.ai running at localhost:8080</div>
                  </div>
                </div>
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px"}}>
                  <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:8}}>// requirements</div>
                  {[["Docker","20.10+"],["RAM","2GB minimum"],["Disk","500MB"],["Network","Outbound HTTPS to apix.cisco.com"]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",fontFamily:mono,fontSize:12,marginBottom:5}}>
                      <span style={{color:C.muted}}>{k}</span><span style={{color:C.dim}}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>window.location.href="/signup"} style={{background:C.amber,color:"#000",border:"none",borderRadius:7,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px",cursor:"pointer",width:"100%"}}>contact_us() // enterprise pricing</button>
              </div>
            </div>
          )}
          {tab==="free"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"start"}}>
              <div>
                <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// free tier</div>
                <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:14}}>No signup. No credentials.<br/><span style={{color:C.amber}}>Just paste and go.</span></h2>
                <p style={{fontSize:14,color:C.dim,lineHeight:1.8,marginBottom:22}}>Paste your device inventory in any format. Claude analyzes it against known bug patterns instantly. Nothing sensitive required.</p>
                {[["📋","Paste anything","CSV, show version output, spreadsheet, free text."],["🤖","AI-powered analysis","Cross-referenced against bugs, advisories, and release notes."],["🔒","Nothing sensitive needed","Platform names and versions only. No hostnames, no IPs."],["⚡","10 analyses / month","Free forever. No credit card. No account needed to try."]].map(([ic,t,d])=>(
                  <div key={t} style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
                    <span style={{fontSize:17,flexShrink:0,marginTop:1}}>{ic}</span>
                    <div><div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{t}</div><div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{d}</div></div>
                  </div>
                ))}
                <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#000",border:"none",borderRadius:7,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px 24px",cursor:"pointer",marginTop:6}}>try_free() // no account needed</button>
              </div>
              <div style={{background:"#050503",border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                <MacBar label="fabric.csv"/>
                <div style={{padding:"18px 20px",fontFamily:mono,fontSize:12,lineHeight:1.9}}>
                  <div style={{color:C.muted}}># Platform, Version, Role</div>
                  {[["Nexus 9336C-FX2","10.2(3)","Spine",C.text],["Nexus 9336C-FX2","10.2(3)","Spine",C.text],["Nexus 93180YC-EX","9.3(8)","Leaf",C.text],["Nexus 93180YC-EX","9.3(5)","Leaf",C.orange],["Catalyst 9500","17.6.1","Distribution",C.text],["Firepower 4140","7.0.1","Firewall",C.text]].map(([p,v,r,col],i)=>(
                    <div key={i} style={{color:col}}>{p}, {v}, {r}{col===C.orange&&<span style={{color:C.orange,marginLeft:8}}>← version mismatch</span>}</div>
                  ))}
                  <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.faint}`,color:C.muted,fontSize:11}}>// no hostnames · no IPs · platform + version only</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security strip */}
        <div style={{borderTop:`1px solid ${C.border}`,background:C.surface}}>
          <div style={{maxWidth:1140,margin:"0 auto",padding:"56px 36px"}}>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:30}}>
              <div>
                <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>// security</div>
                <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em"}}>Built for engineers who don't trust anyone.</h2>
              </div>
              <button onClick={()=>window.location.href="/security"} style={{background:"none",border:`1px solid ${C.border}`,color:C.amber,fontFamily:mono,fontSize:12,padding:"8px 16px",borderRadius:6,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>full details →</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.border,borderRadius:10,overflow:"hidden"}}>
              {[["🔐","AES-256 encrypted","Credentials encrypted before storage."],["🚫","Never logged","Scrubbed from all logs at infrastructure level."],["👤","No human access","Technically impossible for our team to read your credentials."],["📦","Bug data never stored","Flows through and discarded after each analysis."],["⚙️","Server-side only","Your Secret never appears in browser code after setup."],["🔑","Revoke any time","Delete credentials instantly from Settings."]].map(([ic,t,d])=>(
                <div key={t} style={{background:C.surface,padding:"20px 22px"}}>
                  <div style={{fontSize:19,marginBottom:9}}>{ic}</div>
                  <div style={{fontFamily:mono,fontSize:12,fontWeight:600,color:C.amber,marginBottom:6}}>{t}</div>
                  <div style={{fontSize:13,color:C.dim,lineHeight:1.7}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{maxWidth:1140,margin:"0 auto",padding:"60px 36px 72px"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"52px 44px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"center"}}>
            <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// start now</div>
              <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:12}}>Know what's broken before it breaks you.</h2>
              <p style={{fontSize:14,color:C.dim,lineHeight:1.8}}>Free tier needs no account. Enterprise runs in your own infrastructure.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {!done?<>
                <div style={{fontFamily:mono,fontSize:11,color:C.muted}}>$ notify_me --on launch</div>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={{background:C.hi,border:`1px solid ${C.border}`,color:C.text,fontFamily:mono,fontSize:13,padding:"10px 13px",borderRadius:6,outline:"none"}}/>
                <button onClick={()=>email&&setDone(true)} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"11px",cursor:"pointer"}}>notify_me()</button>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>window.location.href="/analyse"} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"9px",cursor:"pointer"}}>try_free()</button>
                  <button style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"9px",cursor:"pointer"}}>docker_pull()</button>
                </div>
              </>:(
                <div style={{background:"#0A2A10",border:`1px solid ${C.green}44`,borderRadius:8,padding:22,textAlign:"center"}}>
                  <div style={{fontFamily:mono,fontSize:14,color:C.green,marginBottom:5}}>✓ notify_me() registered</div>
                  <div style={{fontSize:13,color:C.dim}}>We will email you when enterprise launches.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{borderTop:`1px solid ${C.border}`,padding:"22px 36px"}}>
          <div style={{maxWidth:1140,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:mono,fontSize:14,fontWeight:700}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
            <div style={{display:"flex",gap:18}}>
              {["privacy","terms","security","glossary","contact"].map(l=>(
                <button key={l} onClick={()=>window.location.href=`/${l}`} style={{background:"none",border:"none",color:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer",letterSpacing:"0.04em"}}>{l}</button>
              ))}
            </div>
            <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>// informational use only</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HISTORY STUB
// ─────────────────────────────────────────────
function HistoryStub() {
  return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.text,fontFamily:mono}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:16}}>// coming soon</div>
        <div style={{fontSize:24,fontWeight:300,marginBottom:12}}>Analysis history</div>
        <div style={{fontSize:13,color:C.dim,marginBottom:24}}>Full history with member attribution — Phase 2.</div>
        <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"9px 18px",cursor:"pointer"}}>
          ← back_to_dashboard()
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT — shows Home, redirects authenticated users to /app
// ─────────────────────────────────────────────
function RootPage() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      window.location.replace("/app");
    }
  }, [session, loading]);

  if (loading) return null;
  if (session) return null;

  return <Home authed={false}/>;
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────
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
      if (path === '/strategy')    return <StrategyPage />;
  if (path === '/history')                return <AuthGuard><HistoryStub /></AuthGuard>;

  if (path === '/' || path === '')        return <RootPage />;

  window.location.replace('/');
  return null;
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}