// App.js
// App v3.4 — headline refinement, Cisco removed, font size and spacing improved
// netwrkr.ai will autonomously monitor, diagnose and operate your data centre fabric.

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
  hi2:     "#E8E4DB",
  border:  "#DDD9CF",
  amber:   "#B8860B",
  amberB:  "#D4A000",
  amberG:  "#D4A00012",
  amberD:  "#8B6400",
  green:   "#1A7A3C",
  greenG:  "#1A7A3C12",
  red:     "#C0392B",
  orange:  "#C0620B",
  yellow:  "#8B7000",
  text:    "#1A1810",
  dim:     "#4A4438",
  muted:   "#7A7060",
  faint:   "#E8E4DB",
  shadow:  "rgba(0,0,0,0.06)",
};

const mono = "JetBrains Mono, Fira Code, monospace";
const sans = "'DM Sans', system-ui, sans-serif";

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
  {t:0,   s:"$ netwrkr monitor --fabric production",         c:C.amber},
  {t:600, s:"  connecting to fabric... 12 devices found",    c:C.muted},
  {t:1100,s:"  analysing version state...",                  c:C.muted},
  {t:1800,s:"  ✓  fabric inventory complete",                c:C.green},
  {t:2200,s:"  querying Cisco PSIRT API...",                 c:C.muted},
  {t:3000,s:"  ✓  47 advisories retrieved",                  c:C.green},
  {t:3200,s:"",                                               c:C.muted},
  {t:3300,s:"  P1  spine version drift detected",            c:C.red},
  {t:3600,s:"  P2  APIC 5.2(8e) — upgrade path constrained",c:C.orange},
  {t:3900,s:"  P3  border leaf BGP exposure — review",       c:C.orange},
  {t:4200,s:"",                                               c:C.muted},
  {t:4300,s:"  → safe upgrade sequence generated",           c:C.amber},
  {t:4700,s:"  → maintenance window scheduled autonomously", c:C.amber},
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
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",boxShadow:`0 4px 24px ${C.shadow}`}}>
      <MacBar label="netwrkr.ai — autonomous fabric operations"/>
      <div style={{padding:"18px 20px",minHeight:300,fontFamily:mono,fontSize:13,lineHeight:1.8,background:"#FAFAF7"}}>
        {TL.slice(0,n).map((l,i)=><div key={i} style={{color:l.c,whiteSpace:"pre"}}>{l.s}</div>)}
        {n<TL.length&&n>0&&<Cur/>}
      </div>
    </div>
  );
}

function HomeNav({ authed }) {
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 36px",background:`${C.bg}F0`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1140,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>window.location.href="/"}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontFamily:mono,fontWeight:700,fontSize:15,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          {[["analyse","/analyse"],["security","/security"]].map(([label,path])=>(
            <button key={label} onClick={()=>window.location.href=path} style={{background:"none",border:"none",fontFamily:mono,fontSize:12,color:C.muted,cursor:"pointer",padding:"5px 10px",borderRadius:4,letterSpacing:"0.04em"}}>{label}</button>
          ))}
          <div style={{width:1,height:16,background:C.border,margin:"0 8px"}}/>
          {authed ? (
            <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
              dashboard →
            </button>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>window.location.href="/login"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 16px",cursor:"pointer"}}>
                sign_in()
              </button>
              <button onClick={()=>window.location.href="/signup"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
                get_started →
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const PHASES = [
  {
    code: "Cloudbreak",
    label: "Live now",
    title: "Analysis & Advisory Intelligence",
    desc: "Paste your device inventory. netwrkr.ai analyses your fabric, identifies risk, and tells you what to do about it. Free in your browser, no credentials required.",
    status: "live",
    color: C.green,
  },
  {
    code: "Desert Point",
    label: "Building",
    title: "Continuous Monitoring",
    desc: "netwrkr.ai connects directly to your fabric and monitors it continuously. Version drift, new advisories, and topology changes detected and surfaced automatically.",
    status: "building",
    color: C.amber,
  },
  {
    code: "Jaws",
    label: "Next",
    title: "Autonomous Remediation",
    desc: "netwrkr.ai generates and executes safe remediation sequences, coordinating maintenance windows and upgrade paths across your fabric without manual intervention.",
    status: "planned",
    color: C.orange,
  },
  {
    code: "Ghost Ships",
    label: "Destination",
    title: "Fully Autonomous Operations",
    desc: "The network runs itself. netwrkr.ai monitors, diagnoses, and operates your Cisco data centre fabric autonomously — without a human at the console.",
    status: "vision",
    color: C.red,
  },
];

function PhaseRoadmap() {
  return (
    <div style={{maxWidth:1140,margin:"0 auto",padding:"72px 36px"}}>
      <div style={{marginBottom:40}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// roadmap</div>
        <h2 style={{fontSize:32,fontWeight:300,letterSpacing:"-0.03em",color:C.text}}>From analysis today to autonomy tomorrow.</h2>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.border,borderRadius:10,overflow:"hidden",boxShadow:`0 2px 12px ${C.shadow}`}}>
        {PHASES.map((p,i)=>(
          <div key={p.code} style={{background:C.surface,padding:"24px 22px",position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontFamily:mono,fontSize:10,color:p.color,background:p.color+"15",border:`1px solid ${p.color}40`,padding:"2px 8px",letterSpacing:"0.06em"}}>{p.label}</span>
              {p.status==="live" && <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block",animation:"pulse 2s infinite"}}/>}
            </div>
            <div style={{fontFamily:mono,fontSize:13,fontWeight:700,color:p.color,marginBottom:6}}>{p.code}</div>
            <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:10,lineHeight:1.3}}>{p.title}</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:1.7}}>{p.desc}</div>
            {i < PHASES.length-1 && (
              <div style={{position:"absolute",right:-8,top:"50%",transform:"translateY(-50%)",fontFamily:mono,fontSize:12,color:C.muted,zIndex:2,background:C.surface,padding:"2px"}}>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Home({ authed }) {
  const [email,setEmail]=useState("");
  const [done,setDone]=useState(false);

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:sans}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:${C.amberB}40;color:${C.amberD};}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(11px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
      `}</style>

      <HomeNav authed={authed}/>

      {/* Hero */}
      <div style={{maxWidth:1140,margin:"0 auto",padding:"80px 36px 64px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"center"}}>
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:4,padding:"5px 13px",marginBottom:22,boxShadow:`0 1px 4px ${C.shadow}`}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
            <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>cloudbreak // live now</span>
            <span style={{width:1,height:11,background:C.border}}/>
            <span style={{fontFamily:mono,fontSize:11,color:C.amber}}>ghost ships // the destination</span>
          </div>
          <div style={{fontFamily:mono,fontSize:12,color:C.muted,marginBottom:8,letterSpacing:"0.06em"}}>// cisco dc network operations</div>
          <h1 style={{fontSize:34,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.25,marginBottom:20,color:C.text}}>
            netwrkr.ai will autonomously monitor, diagnose and operate your data centre fabric.
          </h1>
          <p style={{fontSize:15,color:C.dim,lineHeight:1.8,marginBottom:28,maxWidth:440}}>
            DC networks are complex to operate. They contain bugs, version drift, and risk that engineers spend their careers managing manually. netwrkr.ai is the AI layer that changes that — starting with intelligence today, fully autonomous tomorrow.
          </p>
          <div style={{display:"flex",gap:12,marginBottom:32}}>
            <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px 26px",cursor:"pointer",boxShadow:`0 2px 8px ${C.amber}40`}}>
              analyse_my_fabric() // free
            </button>
            <button onClick={()=>window.location.href="/signup"} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:13,padding:"12px 20px",cursor:"pointer"}}>
              get_started →
            </button>
          </div>
          <div style={{display:"flex",borderTop:`1px solid ${C.border}`,paddingTop:22}}>
            {[["Free","start today"],["Enterprise","full autonomy"],["AI-native","built for DC"]].map(([v,l],i)=>(
              <div key={i} style={{flex:1,paddingRight:18,borderRight:i<2?`1px solid ${C.border}`:"none",paddingLeft:i>0?18:0}}>
                <div style={{fontFamily:mono,fontSize:17,fontWeight:700,color:C.amber}}>{v}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <Terminal/>
      </div>

      {/* What netwrkr.ai does today */}
      <div style={{borderTop:`1px solid ${C.border}`,background:C.surface}}>
        <div style={{maxWidth:1140,margin:"0 auto",padding:"64px 36px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"start"}}>
            <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// today — cloudbreak</div>
              <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:16,color:C.text}}>Know exactly what's wrong with your fabric. Right now.</h2>
              <p style={{fontSize:14,color:C.dim,lineHeight:1.8,marginBottom:20}}>
                Paste your device inventory in any format. netwrkr.ai cross-references every device against live Cisco advisory data, detects version drift across your fabric tiers, and produces a prioritised risk assessment — in seconds.
              </p>
              <p style={{fontSize:14,color:C.dim,lineHeight:1.8,marginBottom:28}}>No credentials. No agents. No setup. Just paste and go.</p>
              {[
                ["P1 / P2 / P3 priority assessment","Structural risk ranked by fabric impact, not just severity score"],
                ["Version drift detection","Mismatches between spines, leaves, and controllers — observed from your actual inventory"],
                ["Live Cisco PSIRT data","Real advisory IDs cross-referenced against your specific platform and version"],
                ["Kelly — DC engineer assistant","Ask follow-up questions about your fabric in plain language"],
              ].map(([t,d])=>(
                <div key={t} style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
                  <span style={{color:C.amber,flexShrink:0,marginTop:2,fontFamily:mono,fontSize:12}}>→</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:2,color:C.text}}>{t}</div>
                    <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{d}</div>
                  </div>
                </div>
              ))}
              <button onClick={()=>window.location.href="/analyse"} style={{marginTop:8,background:C.amber,color:"#FFF",border:"none",borderRadius:7,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px 24px",cursor:"pointer",boxShadow:`0 2px 8px ${C.amber}40`}}>
                try_free() // no account needed
              </button>
            </div>
            <div style={{background:C.hi,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",boxShadow:`0 2px 12px ${C.shadow}`}}>
              <MacBar label="fabric inventory — paste anything"/>
              <div style={{padding:"18px 20px",fontFamily:mono,fontSize:12,lineHeight:1.9,background:"#FAFAF7"}}>
                <div style={{color:C.muted}}># Platform, Version, Role</div>
                {[
                  ["APIC-1","5.2(8e)","Controller",C.text],
                  ["APIC-2","5.2(8e)","Controller",C.text],
                  ["Nexus 9336C-FX2","14.2(7f)","Spine",C.text],
                  ["Nexus 9332C","14.2(5k)","Border Leaf",C.orange],
                  ["Nexus 93180YC-EX","14.2(7f)","Leaf",C.text],
                  ["Firepower 2140","6.6(0)","Firewall",C.text],
                ].map(([p,v,r,col],i)=>(
                  <div key={i} style={{color:col}}>{p}, {v}, {r}{col===C.orange&&<span style={{color:C.orange,marginLeft:8}}>← version drift</span>}</div>
                ))}
                <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border}`,color:C.amber,fontSize:11}}>→ P1: spine version inconsistency detected</div>
                <div style={{color:C.muted,fontSize:11,marginTop:4}}>// no hostnames · no IPs · no credentials</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Roadmap */}
      <PhaseRoadmap/>

      {/* The problem */}
      <div style={{borderTop:`1px solid ${C.border}`,background:C.surface}}>
        <div style={{maxWidth:1140,margin:"0 auto",padding:"64px 36px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:60}}>
            <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// the problem</div>
              <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:16,color:C.text}}>Cisco DC networks are complex to operate. They don't have to stay that way.</h2>
              <p style={{fontSize:14,color:C.dim,lineHeight:1.8,marginBottom:16}}>
                The operational complexity of running a Cisco data centre fabric isn't inevitable — it's accumulated. Version debt, manual processes, and the gap between what Cisco ships and what's actually running in production means DC engineers spend their careers managing risk that should be managed automatically.
              </p>
              <p style={{fontSize:14,color:C.dim,lineHeight:1.8}}>
                AI changes that equation. netwrkr.ai is building the layer that absorbs that complexity — starting with intelligence, ending with autonomy.
              </p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                [C.red,"The installed base problem","Hundreds of thousands of Cisco DC fabrics are running software that is years behind current releases. Enterprises don't upgrade because upgrading is risky and complex. That risk doesn't manage itself."],
                [C.orange,"The signal problem","PSIRT advisories are a firehose. There is no tool that takes your specific fabric and tells you what matters, in what order, based on your actual topology and version state."],
                [C.amber,"The autonomy gap","Every other critical infrastructure domain is moving toward AI-driven operations. The DC network is next."],
              ].map(([col,t,d])=>(
                <div key={t} style={{background:C.bg,border:`1px solid ${C.border}`,borderLeft:`3px solid ${col}`,padding:"16px 18px",borderRadius:"0 6px 6px 0"}}>
                  <div style={{fontFamily:mono,fontSize:11,color:col,marginBottom:6,fontWeight:600}}>{t}</div>
                  <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={{borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1140,margin:"0 auto",padding:"56px 36px"}}>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:30}}>
            <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>// security</div>
              <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",color:C.text}}>Built for engineers who don't trust anyone.</h2>
            </div>
            <button onClick={()=>window.location.href="/security"} style={{background:"none",border:`1px solid ${C.border}`,color:C.amber,fontFamily:mono,fontSize:12,padding:"8px 16px",borderRadius:6,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>full details →</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.border,borderRadius:10,overflow:"hidden",boxShadow:`0 2px 12px ${C.shadow}`}}>
            {[
              ["🔐","No credentials required","Platform names and versions only. No hostnames, no IPs, nothing sensitive."],
              ["🚫","Nothing stored","Your inventory flows through and is discarded after each analysis."],
              ["👤","No human access","Technically impossible for our team to read your fabric data."],
              ["📦","Two-stream architecture","Fabric Analysis is facts only. Netwrkr Intel is AI knowledge, clearly labelled."],
              ["⚙️","Self-hosted enterprise","Run entirely inside your own infrastructure. No phone home."],
              ["🔑","Open architecture","Auditable. Transparent. Built for engineers who read the code before they run it."],
            ].map(([ic,t,d])=>(
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
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"52px 44px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"center",boxShadow:`0 2px 16px ${C.shadow}`}}>
          <div>
            <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// start now</div>
            <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:12,color:C.text}}>Your fabric. Understood. Operated.</h2>
            <p style={{fontSize:14,color:C.dim,lineHeight:1.8}}>Free tier — no account needed. Enterprise — full autonomy on your own infrastructure.</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {!done?<>
              <div style={{fontFamily:mono,fontSize:11,color:C.muted}}>$ notify_me --on launch</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={{background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontFamily:mono,fontSize:13,padding:"10px 13px",borderRadius:6,outline:"none"}}/>
              <button onClick={()=>email&&setDone(true)} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"11px",cursor:"pointer",boxShadow:`0 2px 8px ${C.amber}40`}}>notify_me()</button>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>window.location.href="/analyse"} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"9px",cursor:"pointer"}}>analyse_my_fabric()</button>
                <button onClick={()=>window.location.href="/signup"} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"9px",cursor:"pointer"}}>get_started()</button>
              </div>
            </>:(
              <div style={{background:"#F0FAF4",border:`1px solid ${C.green}44`,borderRadius:8,padding:22,textAlign:"center"}}>
                <div style={{fontFamily:mono,fontSize:14,color:C.green,marginBottom:5}}>✓ notify_me() registered</div>
                <div style={{fontSize:13,color:C.dim}}>We will be in touch.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"22px 36px",background:C.surface}}>
        <div style={{maxWidth:1140,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:14,fontWeight:700,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
          <div style={{display:"flex",gap:18}}>
            {["privacy","terms","security","contact"].map(l=>(
              <button key={l} onClick={()=>window.location.href=`/${l}`} style={{background:"none",border:"none",color:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer",letterSpacing:"0.04em"}}>{l}</button>
            ))}
          </div>
          <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>// cloudbreak → desert point → jaws → ghost ships</span>
        </div>
      </footer>
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
        <button onClick={()=>window.location.href="/app"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"9px 18px",cursor:"pointer"}}>
          ← back_to_dashboard()
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
function RootPage() {
  const { session, loading } = useAuth();
  useEffect(() => {
    if (!loading && session) window.location.replace("/app");
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
  if (path === '/strategy')               return <StrategyPage />;
  if (path === '/model')                  return <ModelPage />;
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