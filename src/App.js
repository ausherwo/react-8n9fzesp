// v3.0 — Anthropic light mode (exact brand tokens)
import { useState, useEffect, useRef } from "react";

// Exact Anthropic design tokens from anthropic.com
const C = {
  bg:       "#faf9f5",
  bgAlt:    "#f0eee6",
  bgCard:   "#ffffff",
  border:   "#1414131a",
  borderMd: "#14141326",
  text:     "#141413",
  textMd:   "#3d3d3a",
  textDim:  "#5e5d59",
  textFaint:"#b0aea5",
  accent:   "#d97757",
  accentDk: "#c6613f",
  accentBg: "#d9775712",
  green:    "#3a7d5a",
  greenBg:  "#3a7d5a12",
  red:      "#c0392b",
  redBg:    "#c0392b12",
  orange:   "#c47830",
  orangeBg: "#c4783012",
  yellow:   "#8a6d00",
  yellowBg: "#8a6d0012",
};

const SEV = {
  CRITICAL:{ color:"#c0392b", bg:"#fdf0ee", bd:"#e8c5bf" },
  HIGH:    { color:"#c47830", bg:"#fdf5ec", bd:"#e8d5bf" },
  MEDIUM:  { color:"#8a6d00", bg:"#fdfaec", bd:"#e8e0bf" },
  LOW:     { color:"#3a7d5a", bg:"#eef5f1", bd:"#bfddcc" },
};

const serif = "'DM Serif Display', Georgia, serif";
const sans  = "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif";
const mono  = "'JetBrains Mono', 'Fira Code', monospace";

const getCount    = () => parseInt(localStorage.getItem("nw_count") || "0");
const incCount    = () => localStorage.setItem("nw_count", getCount() + 1);
const isRegistered= () => localStorage.getItem("nw_registered") === "true";
const setRegistered=() => localStorage.setItem("nw_registered", "true");

function Pill({ children, color = C.accent }) {
  return <span style={{fontFamily:mono,fontSize:10,color,background:color+"18",border:`1px solid ${color}33`,padding:"2px 8px",borderRadius:4,letterSpacing:"0.03em",fontWeight:500}}>{children}</span>;
}

function Badge({ level, sm }) {
  const s = SEV[level] || SEV.LOW;
  return <span style={{fontFamily:mono,fontSize:sm?9:11,fontWeight:700,color:s.color,background:s.bg,border:`1px solid ${s.bd}`,padding:sm?"1px 6px":"2px 9px",borderRadius:4}}>{level}</span>;
}

function InfoIcon({ onClick }) {
  return (
    <svg onClick={onClick} width="13" height="13" viewBox="0 0 13 13" fill="none"
      style={{cursor:"pointer",opacity:0.35,flexShrink:0,marginLeft:4,verticalAlign:"middle"}}
      onMouseEnter={e=>e.currentTarget.style.opacity=0.8}
      onMouseLeave={e=>e.currentTarget.style.opacity=0.35}>
      <circle cx="6.5" cy="6.5" r="5.5" stroke={C.text} strokeWidth="1"/>
      <line x1="6.5" y1="5.5" x2="6.5" y2="9.5" stroke={C.text} strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="6.5" cy="3.8" r="0.7" fill={C.text}/>
    </svg>
  );
}

function Cur() {
  const [v,setV]=useState(true);
  useEffect(()=>{const t=setInterval(()=>setV(x=>!x),530);return()=>clearInterval(t);},[]);
  return <span style={{color:C.accent,opacity:v?1:0}}>▌</span>;
}

const TL = [
  {t:0,   s:"$ netwrkr analyze --input fabric.csv",         c:"#d97757"},
  {t:600, s:"  parsing inventory... 7 devices found",       c:"#b0aea5"},
  {t:1100,s:"  querying Cisco Bug API...",                   c:"#b0aea5"},
  {t:1800,s:"  ✓  47 bugs retrieved",                       c:"#4ade80"},
  {t:2200,s:"  running AI fabric analysis...",              c:"#b0aea5"},
  {t:3000,s:"  ✓  analysis complete",                       c:"#4ade80"},
  {t:3200,s:"",                                              c:"#b0aea5"},
  {t:3300,s:"  CRITICAL  CSCvz88341  ARP memory leak",      c:"#f87171"},
  {t:3600,s:"  HIGH      CSCwb91234  BGP reset under ECMP", c:"#fb923c"},
  {t:3900,s:"  HIGH      CSCwc11872  VXLAN BUM >40Gbps",    c:"#fb923c"},
  {t:4200,s:"",                                              c:"#b0aea5"},
  {t:4300,s:"  → upgrade LEAF-SW-02 to 9.3(7)",            c:"#d97757"},
  {t:4700,s:"  → upgrade spines to 10.3(1) before Q3",     c:"#d97757"},
  {t:5100,s:"$ _",                                           c:"#d97757"},
];

function Terminal() {
  const [n,setN]=useState(0);
  useEffect(()=>{
    if(n>=TL.length)return;
    const d=n===0?600:TL[n].t-TL[n-1].t;
    const t=setTimeout(()=>setN(x=>x+1),d);
    return()=>clearTimeout(t);
  },[n]);
  return (
    <div style={{background:"#141413",borderRadius:12,overflow:"hidden",border:"1px solid #14141340",boxShadow:"0 4px 24px #14141318"}}>
      <div style={{background:"#1e1e1c",borderBottom:"1px solid #ffffff12",padding:"10px 16px",display:"flex",alignItems:"center",gap:7}}>
        {["#FF5F56","#FFBD2E","#27C93F"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c,opacity:.85}}/>)}
        <span style={{marginLeft:8,fontFamily:mono,fontSize:11,color:"#5e5d59"}}>netwrkr.ai — fabric analysis</span>
      </div>
      <div style={{padding:"18px 20px",minHeight:280,fontFamily:mono,fontSize:13,lineHeight:1.8}}>
        {TL.slice(0,n).map((l,i)=><div key={i} style={{color:l.c,whiteSpace:"pre"}}>{l.s}</div>)}
        {n<TL.length&&n>0&&<Cur/>}
      </div>
    </div>
  );
}

function Nav({page,go,authed,usage=7}) {
  const lnk=(p,label)=>(
    <button onClick={()=>go(p)} style={{background:"none",border:"none",fontFamily:sans,fontSize:14,color:page===p?C.text:C.textDim,cursor:"pointer",padding:"6px 12px",borderRadius:6,fontWeight:page===p?600:400,letterSpacing:"-0.01em",transition:"color .15s"}}>{label}</button>
  );
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 40px",background:C.bg,position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1120,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>go("home")}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill={C.accent} stroke={C.accent} strokeWidth="0.5" strokeLinejoin="round"/>
          </svg>
          <span style={{fontFamily:sans,fontWeight:700,fontSize:16,color:C.text,letterSpacing:"-0.02em"}}>netwrkr.ai</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          {lnk("analyse","Analyse")}
          {lnk("glossary","Glossary")}
          {lnk("security","Security")}
          <div style={{width:1,height:16,background:C.borderMd,margin:"0 10px"}}/>
          {authed?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",gap:3,background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",alignItems:"center"}}>
                {[...Array(10)].map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:1,background:i<usage?C.accent:C.borderMd}}/>)}
                <span style={{fontFamily:mono,fontSize:11,color:C.textDim,marginLeft:6}}>{usage}/10</span>
              </div>
              <button onClick={()=>go("analyse")} style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:13,padding:"8px 16px",cursor:"pointer"}}>Analyse →</button>
            </div>
          ):(
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>go("login")} style={{background:"none",border:`1px solid ${C.borderMd}`,color:C.text,borderRadius:8,fontFamily:sans,fontSize:13,fontWeight:500,padding:"8px 16px",cursor:"pointer"}}>Sign in</button>
              <button onClick={()=>go("signup")} style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:13,padding:"8px 16px",cursor:"pointer"}}>Get started →</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function SignupGate({ onComplete, onDismiss }) {
  const [step,setStep]=useState("form");
  const [form,setForm]=useState({firstName:"",lastName:"",email:"",title:"",company:""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const valid=form.email.includes("@")&&form.firstName.trim()&&form.lastName.trim();
  const submit=async()=>{
    if(!valid)return;setLoading(true);setError("");
    try{
      const res=await fetch("/api/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,source:"gate"})});
      if(!res.ok)throw new Error();
      setRegistered();setStep("success");setTimeout(()=>onComplete(),1800);
    }catch(e){setError("Something went wrong — please try again.");}
    setLoading(false);
  };
  const inp={fontFamily:sans,fontSize:14,background:C.bgCard,border:`1px solid ${C.borderMd}`,color:C.text,borderRadius:8,padding:"10px 13px",width:"100%",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,background:"#faf9f5cc",backdropFilter:"blur(12px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{background:C.bgCard,border:`1px solid ${C.borderMd}`,borderRadius:16,padding:"36px 40px",width:"100%",maxWidth:440,boxShadow:"0 8px 40px #14141318"}}>
        {step==="form"&&<>
          <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Free account</div>
          <h2 style={{fontFamily:serif,fontSize:24,fontWeight:400,letterSpacing:"-0.02em",marginBottom:6,color:C.text}}>Create your free account</h2>
          <p style={{fontSize:14,color:C.textDim,lineHeight:1.6,marginBottom:24}}>10 analyses/month, no credit card required.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{fontFamily:sans,fontSize:12,color:C.textDim,display:"block",marginBottom:5,fontWeight:500}}>First name *</label><input value={form.firstName} onChange={e=>set("firstName",e.target.value)} placeholder="Andrew" style={inp}/></div>
            <div><label style={{fontFamily:sans,fontSize:12,color:C.textDim,display:"block",marginBottom:5,fontWeight:500}}>Last name *</label><input value={form.lastName} onChange={e=>set("lastName",e.target.value)} placeholder="Usherwood" style={inp}/></div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontFamily:sans,fontSize:12,color:C.textDim,display:"block",marginBottom:5,fontWeight:500}}>Work email *</label>
            <input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="engineer@yourcompany.com" style={inp}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:22}}>
            <div><label style={{fontFamily:sans,fontSize:12,color:C.textDim,display:"block",marginBottom:5,fontWeight:500}}>Title</label><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Network Architect" style={inp}/></div>
            <div><label style={{fontFamily:sans,fontSize:12,color:C.textDim,display:"block",marginBottom:5,fontWeight:500}}>Company</label><input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="Acme Corp" style={inp}/></div>
          </div>
          {error&&<div style={{fontSize:12,color:C.red,marginBottom:12}}>{error}</div>}
          <button onClick={submit} disabled={!valid||loading} style={{background:valid&&!loading?C.text:"#b0aea5",color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"12px",cursor:valid&&!loading?"pointer":"not-allowed",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
            {loading?<><span style={{width:13,height:13,border:`2px solid ${C.bg}44`,borderTopColor:C.bg,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Creating account…</>:"Create free account →"}
          </button>
          <button onClick={onDismiss} style={{background:"none",border:"none",color:C.textFaint,fontFamily:sans,fontSize:13,cursor:"pointer",width:"100%",padding:"4px"}}>Maybe later — use my last free analysis</button>
        </>}
        {step==="success"&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:C.greenBg,border:`1px solid ${C.green}44`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:20,color:C.green}}>✓</div>
            <div style={{fontFamily:serif,fontSize:18,color:C.text,marginBottom:8}}>Account created</div>
            <div style={{fontSize:14,color:C.textDim}}>Welcome to netwrkr.ai. Running your analysis now…</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SignupNudge({ onSignup, onDismiss }) {
  return (
    <div style={{background:C.bgAlt,border:`1px solid ${C.borderMd}`,borderRadius:10,padding:"16px 20px",marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
      <div>
        <div style={{fontFamily:sans,fontSize:13,color:C.text,fontWeight:600,marginBottom:3}}>1 free analysis remaining</div>
        <div style={{fontSize:13,color:C.textDim}}>Create a free account to get 10 analyses/month.</div>
      </div>
      <div style={{display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onDismiss} style={{background:"none",border:`1px solid ${C.borderMd}`,color:C.textDim,fontFamily:sans,fontSize:13,padding:"7px 13px",borderRadius:7,cursor:"pointer"}}>Later</button>
        <button onClick={onSignup} style={{background:C.text,border:"none",color:C.bg,fontFamily:sans,fontWeight:600,fontSize:13,padding:"7px 14px",borderRadius:7,cursor:"pointer"}}>Create account →</button>
      </div>
    </div>
  );
}

const GLOSSARY = [
  {section:"Risk levels",terms:[
    {term:"Fabric risk",def:"A score reflecting how much a device's observed topology and version data contributes to instability in the fabric. Based only on facts from your submitted inventory — version mismatches, tier conflicts, consistency issues. Never includes bug or advisory data."},
    {term:"Intel risk",def:"A score reflecting the potential security and software risk for a device based on known advisories and AI training knowledge. May include unverified findings — always check the verified indicator on each card."},
    {term:"LOW / MEDIUM / HIGH",def:"The three risk levels used across fabric and intel scores. LOW means no significant issues found. MEDIUM means issues worth monitoring. HIGH means issues requiring attention before the next maintenance window."},
  ]},
  {section:"Finding labels",terms:[
    {term:"[observed]",def:"This finding comes directly from data you submitted. For example, two devices of the same platform running different versions — that is a fact from your inventory, not an inference."},
    {term:"[inferred]",def:"This finding is a logical conclusion drawn from observed data."},
    {term:"[assumed]",def:"This finding has limited evidence. Treat assumed findings with caution and verify independently before acting."},
  ]},
  {section:"Netwrkr intel",terms:[
    {term:"Netwrkr intel",def:"The AI-powered intelligence stream. Draws on known version history, Cisco security advisories, and training knowledge to surface potential software issues."},
    {term:"Verified — Cisco PSIRT API",def:"Confirmed against the live Cisco PSIRT security database. The CSC ID is real and the vulnerability exists for this platform and version."},
    {term:"Unverified — AI knowledge only",def:"Based on AI training knowledge and not confirmed against the live Cisco database. Treat as a prompt to investigate, not a confirmed finding."},
    {term:"CSC ID",def:"A Cisco bug identifier, e.g. cisco-sa-apic-dos-rNus8EFw. Look them up directly on tools.cisco.com."},
    {term:"PSIRT",def:"Cisco Product Security Incident Response Team. netwrkr.ai queries the PSIRT openVuln API for verified advisory data."},
  ]},
  {section:"Infrastructure roles",terms:[
    {term:"Controller (Tier 1)",def:"APIC, DNAC, or NSO. Controllers shape the upgrade path for the entire fabric and always appear first."},
    {term:"Spine (Tier 2)",def:"Core switching layer. Version consistency across spines is critical for fabric stability."},
    {term:"Border leaf (Tier 2)",def:"Connects the fabric to external networks — BGP peering, WAN. More sensitive than standard leafs, minimum HIGH intel risk."},
    {term:"Leaf (Tier 3)",def:"Access layer switches connecting servers and storage to the fabric."},
    {term:"Distribution / firewall / edge (Tier 4)",def:"Edge devices. netwrkr.ai caps intel risk at MEDIUM for tier 4."},
  ]},
  {section:"Priority assessment",terms:[
    {term:"P1",def:"Highest priority — fabric-wide version mismatch, border leaf exposure, or high-severity verified advisory on a critical device."},
    {term:"P2",def:"Significant finding requiring planning. Often controller compatibility or version inconsistency across a device tier."},
    {term:"P3",def:"Monitoring item. Worth tracking but no immediate action required."},
  ]},
];

function GlossaryPage({go}) {
  const [query,setQuery]=useState("");
  const filtered=GLOSSARY.map(s=>({...s,terms:s.terms.filter(t=>!query||t.term.toLowerCase().includes(query.toLowerCase())||t.def.toLowerCase().includes(query.toLowerCase()))})).filter(s=>s.terms.length>0);
  return (
    <div style={{maxWidth:800,margin:"0 auto",padding:"56px 40px 80px"}}>
      <div style={{marginBottom:40}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Glossary</div>
        <h1 style={{fontFamily:serif,fontSize:40,fontWeight:400,letterSpacing:"-0.03em",marginBottom:12,color:C.text}}>Terms explained</h1>
        <p style={{fontSize:16,color:C.textDim,lineHeight:1.7,marginBottom:28}}>Plain-English definitions for every term used in netwrkr.ai analysis results.</p>
        <div style={{position:"relative"}}>
          <input type="text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search terms…"
            style={{width:"100%",boxSizing:"border-box",padding:"12px 16px",fontSize:14,fontFamily:sans,background:C.bgCard,border:`1px solid ${C.borderMd}`,borderRadius:10,outline:"none",color:C.text}}/>
          {query&&<button onClick={()=>setQuery("")} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.textFaint,padding:0}}>✕</button>}
        </div>
      </div>
      {filtered.length===0?(
        <div style={{fontSize:14,color:C.textDim,padding:"40px 0",textAlign:"center"}}>No results found</div>
      ):(
        filtered.map((section,si)=>(
          <div key={si} style={{marginBottom:40}}>
            <div style={{fontFamily:sans,fontSize:12,color:C.accent,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16,paddingBottom:10,borderBottom:`1px solid ${C.border}`}}>{section.section}</div>
            {section.terms.map((t,ti)=>(
              <div key={ti} style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:28,padding:"14px 0",borderBottom:`1px solid ${C.border}`,alignItems:"start"}}>
                <div style={{fontFamily:sans,fontSize:14,color:C.text,fontWeight:600,paddingTop:1}}>{t.term}</div>
                <div style={{fontSize:14,color:C.textDim,lineHeight:1.75}}>{t.def}</div>
              </div>
            ))}
          </div>
        ))
      )}
      <div style={{marginTop:40,paddingTop:32,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:14,color:C.textDim}}>Something missing or unclear?</div>
        <button onClick={()=>go("analyse")} style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:13,padding:"9px 18px",cursor:"pointer"}}>Try Analyse →</button>
      </div>
    </div>
  );
}

function Home({go}) {
  const [tab,setTab]=useState("ent");
  const [email,setEmail]=useState("");
  const [done,setDone]=useState(false);
  const TabBtn=({label,active,onClick})=>(
    <button onClick={onClick} style={{background:active?C.text:"transparent",color:active?C.bg:C.textDim,border:"none",borderRadius:6,fontFamily:sans,fontSize:13,fontWeight:active?600:400,padding:"8px 18px",cursor:"pointer",transition:"all .15s"}}>{label}</button>
  );
  return (
    <div>
      <div style={{maxWidth:1120,margin:"0 auto",padding:"80px 40px 64px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:64,alignItems:"center"}}>
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 14px",marginBottom:24}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#3a7d5a",animation:"pulse 2s infinite"}}/>
            <span style={{fontFamily:sans,fontSize:12,color:C.textDim}}>Open beta</span>
            <span style={{width:1,height:12,background:C.border}}/>
            <span style={{fontFamily:sans,fontSize:12,color:C.accent,fontWeight:500}}>Self-hosted enterprise available</span>
          </div>
          <div style={{fontFamily:mono,fontSize:12,color:C.textFaint,marginBottom:10,letterSpacing:"0.04em"}}>// Cisco DC risk analysis</div>
          <h1 style={{fontFamily:serif,fontSize:54,fontWeight:400,letterSpacing:"-0.04em",lineHeight:1.08,marginBottom:20,color:C.text}}>
            Your network's bugs.<br/><span style={{color:C.accent}}>Found. Fixed.</span>
          </h1>
          <p style={{fontSize:16,color:C.textDim,lineHeight:1.8,marginBottom:32,maxWidth:420}}>
            netwrkr.ai cross-references your Cisco DC fabric against live bug data and generates a sequenced remediation plan — free in your browser, or self-hosted behind your firewall.
          </p>
          <div style={{display:"flex",gap:12,marginBottom:36}}>
            <button onClick={()=>go("analyse")} style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"13px 28px",cursor:"pointer"}}>Try free — no signup</button>
            <button style={{background:"none",border:`1px solid ${C.borderMd}`,color:C.text,borderRadius:8,fontFamily:mono,fontSize:12,padding:"13px 18px",cursor:"pointer"}}>docker pull netwrkr/netwrkr-ai</button>
          </div>
          <div style={{display:"flex",borderTop:`1px solid ${C.border}`,paddingTop:24}}>
            {[["Free","Browser-based"],["Self-hosted","Enterprise Docker"],["No credentials","Stays in your network"]].map(([v,l],i)=>(
              <div key={i} style={{flex:1,paddingRight:20,borderRight:i<2?`1px solid ${C.border}`:"none",paddingLeft:i>0?20:0}}>
                <div style={{fontFamily:sans,fontSize:16,fontWeight:700,color:C.text,marginBottom:2}}>{v}</div>
                <div style={{fontSize:12,color:C.textFaint,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <Terminal/>
      </div>

      <div style={{background:C.bgAlt,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1120,margin:"0 auto",padding:"56px 40px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:40}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:4,display:"flex",gap:2}}>
              <TabBtn label="Enterprise — self-hosted" active={tab==="ent"} onClick={()=>setTab("ent")}/>
              <TabBtn label="Free — browser-based" active={tab==="free"} onClick={()=>setTab("free")}/>
            </div>
          </div>
          {tab==="ent"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"start"}}>
              <div>
                <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Enterprise edition</div>
                <h2 style={{fontFamily:serif,fontSize:32,fontWeight:400,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:14,color:C.text}}>Runs inside your perimeter.</h2>
                <p style={{fontSize:15,color:C.textDim,lineHeight:1.8,marginBottom:24}}>A Docker image you run on your own infrastructure. Credentials never leave your network — not even to us.</p>
                {[["🔐","Zero credential exposure","Cisco API calls from your server. We never see your credentials."],["🐳","One-command install","docker pull + docker run. Running in under 2 minutes."],["🔍","Fully auditable","Open source backend. Read every line before you run it."],["⚡","Live Cisco Bug API","Real-time authoritative data. Every CSC ID verified."]].map(([ic,t,d])=>(
                  <div key={t} style={{display:"flex",gap:14,marginBottom:16,alignItems:"flex-start"}}>
                    <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{ic}</span>
                    <div><div style={{fontWeight:600,fontSize:14,marginBottom:3,color:C.text}}>{t}</div><div style={{fontSize:13,color:C.textDim,lineHeight:1.6}}>{d}</div></div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{background:"#141413",border:"1px solid #ffffff12",borderRadius:10,overflow:"hidden"}}>
                  <div style={{background:"#1e1e1c",borderBottom:"1px solid #ffffff12",padding:"8px 14px",display:"flex",alignItems:"center",gap:7}}>
                    {["#FF5F56","#FFBD2E","#27C93F"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c,opacity:.8}}/>)}
                    <span style={{marginLeft:8,fontFamily:mono,fontSize:11,color:"#5e5d59"}}>terminal</span>
                  </div>
                  <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:9}}>
                    {[["01","docker pull netwrkr/netwrkr-ai"],["02","docker run -p 8080:8080 netwrkr/netwrkr-ai"],["03","open http://localhost:8080"]].map(([n,cmd])=>(
                      <div key={n} style={{display:"flex",gap:10}}>
                        <span style={{fontFamily:mono,fontSize:11,color:"#5e5d59",width:22,flexShrink:0}}>{n}</span>
                        <span style={{fontFamily:mono,fontSize:13,color:"#faf9f5"}}><span style={{color:"#5e5d59"}}>$ </span>{cmd}</span>
                      </div>
                    ))}
                    <div style={{marginTop:4,paddingTop:9,borderTop:"1px solid #ffffff12",fontFamily:mono,fontSize:11,color:"#4ade80"}}>✓  netwrkr.ai running at localhost:8080</div>
                  </div>
                </div>
                <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 18px"}}>
                  <div style={{fontFamily:mono,fontSize:11,color:C.accent,marginBottom:10}}>// requirements</div>
                  {[["Docker","20.10+"],["RAM","2 GB minimum"],["Disk","500 MB"],["Network","Outbound HTTPS to apix.cisco.com"]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                      <span style={{color:C.textDim}}>{k}</span><span style={{color:C.text,fontWeight:500}}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>go("signup")} style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"13px",cursor:"pointer",width:"100%"}}>Contact us — enterprise pricing →</button>
              </div>
            </div>
          )}
          {tab==="free"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"start"}}>
              <div>
                <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Free tier</div>
                <h2 style={{fontFamily:serif,fontSize:32,fontWeight:400,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:14,color:C.text}}>No signup. No credentials.<br/><span style={{color:C.accent}}>Just paste and go.</span></h2>
                <p style={{fontSize:15,color:C.textDim,lineHeight:1.8,marginBottom:24}}>Paste your device inventory in any format. Claude analyses it against known bug patterns instantly.</p>
                {[["📋","CSV upload only","Platform + version. No hostnames, IPs, or sensitive data."],["🤖","AI-powered analysis","Cross-referenced against bugs, advisories, and release notes."],["🔒","Nothing sensitive shared","You control exactly what you upload."],["⚡","10 analyses / month","Free forever. No credit card. No account needed to try."]].map(([ic,t,d])=>(
                  <div key={t} style={{display:"flex",gap:14,marginBottom:16,alignItems:"flex-start"}}>
                    <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{ic}</span>
                    <div><div style={{fontWeight:600,fontSize:14,marginBottom:3,color:C.text}}>{t}</div><div style={{fontSize:13,color:C.textDim,lineHeight:1.6}}>{d}</div></div>
                  </div>
                ))}
                <button onClick={()=>go("analyse")} style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"13px 24px",cursor:"pointer",marginTop:8}}>Try free — no account needed →</button>
              </div>
              <div style={{background:"#141413",border:"1px solid #ffffff12",borderRadius:12,overflow:"hidden"}}>
                <div style={{background:"#1e1e1c",borderBottom:"1px solid #ffffff12",padding:"8px 14px",display:"flex",alignItems:"center",gap:7}}>
                  {["#FF5F56","#FFBD2E","#27C93F"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c,opacity:.8}}/>)}
                  <span style={{marginLeft:8,fontFamily:mono,fontSize:11,color:"#5e5d59"}}>fabric.csv</span>
                </div>
                <div style={{padding:"18px 20px",fontFamily:mono,fontSize:12,lineHeight:1.9}}>
                  <div style={{color:"#5e5d59"}}># Platform, Version, Role</div>
                  {[["Nexus 9336C-FX2","10.2(3)","Spine","#faf9f5"],["Nexus 9336C-FX2","10.2(3)","Spine","#faf9f5"],["Nexus 93180YC-EX","9.3(8)","Leaf","#faf9f5"],["Nexus 93180YC-EX","9.3(5)","Leaf","#fb923c"],["Catalyst 9500","17.6.1","Distribution","#faf9f5"],["Firepower 4140","7.0.1","Firewall","#faf9f5"]].map(([p,v,r,col],i)=>(
                    <div key={i} style={{color:col}}>{p}, {v}, {r}{col==="#fb923c"&&<span style={{color:"#fb923c",marginLeft:8}}>← mismatch</span>}</div>
                  ))}
                  <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid #ffffff12",color:"#5e5d59",fontSize:11}}>// no hostnames · no IPs · platform + version only</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{maxWidth:1120,margin:"0 auto",padding:"56px 40px"}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:28}}>
          <div>
            <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Security</div>
            <h2 style={{fontFamily:serif,fontSize:32,fontWeight:400,letterSpacing:"-0.03em",color:C.text}}>Built for engineers who don't trust anyone.</h2>
          </div>
          <button onClick={()=>go("security")} style={{background:"none",border:`1px solid ${C.borderMd}`,color:C.text,fontFamily:sans,fontSize:13,padding:"9px 18px",borderRadius:8,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Full details →</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.border,borderRadius:12,overflow:"hidden"}}>
          {[["🔐","AES-256 encrypted","Credentials encrypted before storage."],["🚫","Never logged","Scrubbed from all logs at infrastructure level."],["👤","No human access","Technically impossible for our team to read your credentials."],["📦","Bug data never stored","Flows through and discarded after each analysis."],["⚙️","Server-side only","Your Secret never appears in browser code after setup."],["🔑","Revoke any time","Delete credentials instantly from Settings."]].map(([ic,t,d])=>(
            <div key={t} style={{background:C.bgCard,padding:"22px 24px"}}>
              <div style={{fontSize:20,marginBottom:10}}>{ic}</div>
              <div style={{fontFamily:sans,fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>{t}</div>
              <div style={{fontSize:13,color:C.textDim,lineHeight:1.7}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:C.bgAlt,borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1120,margin:"0 auto",padding:"64px 40px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"center"}}>
            <div>
              <h2 style={{fontFamily:serif,fontSize:34,fontWeight:400,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:12,color:C.text}}>Know what's broken before it breaks you.</h2>
              <p style={{fontSize:15,color:C.textDim,lineHeight:1.8}}>Free tier needs no account. Enterprise runs in your own infrastructure.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {!done?<>
                <label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500}}>Get notified on launch</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={{background:C.bgCard,border:`1px solid ${C.borderMd}`,color:C.text,fontFamily:sans,fontSize:14,padding:"11px 14px",borderRadius:8,outline:"none"}}/>
                <button onClick={()=>email&&setDone(true)} style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"12px",cursor:"pointer"}}>Notify me</button>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>go("analyse")} style={{flex:1,background:"none",border:`1px solid ${C.borderMd}`,color:C.text,borderRadius:8,fontFamily:sans,fontSize:13,padding:"10px",cursor:"pointer",fontWeight:500}}>Try free</button>
                  <button style={{flex:1,background:"none",border:`1px solid ${C.borderMd}`,color:C.text,borderRadius:8,fontFamily:mono,fontSize:12,padding:"10px",cursor:"pointer"}}>docker pull</button>
                </div>
              </>:(
                <div style={{background:C.greenBg,border:`1px solid ${C.green}44`,borderRadius:10,padding:22,textAlign:"center"}}>
                  <div style={{fontFamily:sans,fontSize:14,color:C.green,fontWeight:600,marginBottom:5}}>✓ You're on the list</div>
                  <div style={{fontSize:13,color:C.textDim}}>We'll email you when enterprise launches.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer style={{borderTop:`1px solid ${C.border}`,padding:"24px 40px"}}>
        <div style={{maxWidth:1120,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:sans,fontSize:15,fontWeight:700,color:C.text}}>netwrkr.ai</span>
          <div style={{display:"flex",gap:20}}>
            {["privacy","terms","security","glossary","contact"].map(l=>(
              <button key={l} style={{background:"none",border:"none",color:C.textFaint,fontFamily:sans,fontSize:13,cursor:"pointer",letterSpacing:"0.02em",textTransform:"capitalize"}}>{l}</button>
            ))}
          </div>
          <span style={{fontFamily:mono,fontSize:11,color:C.textFaint}}>// informational use only</span>
        </div>
      </footer>
    </div>
  );
}

const SAMPLE=`Platform, Version, Role
Nexus 9336C-FX2, 10.2(3), Spine
Nexus 9336C-FX2, 10.2(3), Spine
Nexus 93180YC-EX, 9.3(8), Leaf
Nexus 93180YC-EX, 9.3(5), Leaf
Nexus 9300-EX, 9.3(3), Leaf
Catalyst 9500, 17.6.1, Distribution
Firepower 4140, 7.0.1, Firewall`;

const STEPS=[
  {l:"Parsing inventory",d:600},{l:"Identifying platforms",d:700},
  {l:"Checking bug patterns",d:900},{l:"Cross-referencing advisories",d:800},
  {l:"Running AI analysis",d:1200},{l:"Generating remediation plan",d:700},
];

function Overlay({step}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#faf9f5cc",backdropFilter:"blur(10px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.bgCard,border:`1px solid ${C.borderMd}`,borderRadius:14,padding:"36px 44px",width:460,boxShadow:"0 8px 40px #14141312"}}>
        <div style={{fontFamily:sans,fontSize:13,color:C.accent,fontWeight:600,letterSpacing:"0.02em",textTransform:"uppercase",marginBottom:20}}>Analysing fabric</div>
        {STEPS.map((s,i)=>{
          const done=i<step,active=i===step;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,opacity:i>step?.3:1,transition:"opacity .3s"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:done?C.green:active?C.accent:C.bgAlt,border:`1px solid ${done?C.green:active?C.accent:C.borderMd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:done||active?"#fff":C.textFaint,flexShrink:0,transition:"all .3s"}}>
                {done?"✓":active?"●":""}
              </div>
              <span style={{fontFamily:sans,fontSize:14,color:done?C.textDim:active?C.text:C.textFaint}}>{s.l}{active?"…":""}</span>
              {done&&<span style={{fontFamily:sans,fontSize:12,color:C.green,marginLeft:"auto",fontWeight:500}}>Done</span>}
            </div>
          );
        })}
        <div style={{background:C.bgAlt,borderRadius:4,height:3,marginTop:16,overflow:"hidden"}}>
          <div style={{height:"100%",background:C.accent,width:`${(step/STEPS.length)*100}%`,transition:"width .5s",borderRadius:4}}/>
        </div>
        <div style={{fontFamily:sans,fontSize:12,color:C.textFaint,marginTop:8,textAlign:"right"}}>{Math.round((step/STEPS.length)*100)}%</div>
      </div>
    </div>
  );
}

function Results({data,reset,go,onShowSignup,showNudge,onDismissNudge}) {
  if(!data) return (
    <div style={{textAlign:"center",padding:"40px"}}>
      <div style={{fontFamily:serif,fontSize:18,color:C.red,marginBottom:12}}>Analysis error</div>
      <div style={{fontSize:14,color:C.textDim,marginBottom:20}}>Something went wrong. Please try again.</div>
      <button onClick={reset} style={{background:C.text,border:"none",color:C.bg,fontFamily:sans,fontWeight:600,fontSize:13,padding:"10px 20px",borderRadius:8,cursor:"pointer"}}>← Try again</button>
    </div>
  );
  const fa=data.fabricAnalysis||{};
  const ni=data.netwrkrIntel||{};
  const devices=data.devices||[];
  const faRisk=SEV[fa.risk]||SEV.LOW;
  const hasVerified=ni.items?.some(i=>i.verified);
  const GL=()=><InfoIcon onClick={()=>go("glossary")}/>;
  const Sec=({children,style={}})=>(
    <div style={{background:C.bgCard,border:`1px solid ${C.borderMd}`,borderRadius:12,padding:"20px 24px",marginBottom:12,...style}}>{children}</div>
  );
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500}}>Analysis complete</div>
        <div style={{display:"flex",gap:9}}>
          <button onClick={reset} style={{background:"none",border:`1px solid ${C.borderMd}`,color:C.text,fontFamily:sans,fontSize:13,fontWeight:500,padding:"8px 14px",borderRadius:8,cursor:"pointer"}}>← New analysis</button>
          <button style={{background:C.text,border:"none",color:C.bg,fontFamily:sans,fontSize:13,fontWeight:600,padding:"8px 14px",borderRadius:8,cursor:"pointer"}}>Export report</button>
        </div>
      </div>

      {data.priorityAssessment?.items?.length>0&&(
        <Sec>
          <div style={{fontFamily:sans,fontSize:12,color:C.accent,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:16,display:"flex",alignItems:"center"}}>Priority assessment <GL/></div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {data.priorityAssessment.items.map((item,i)=>{
              const pColor=item.priority==="P1"?C.red:item.priority==="P2"?C.orange:C.yellow;
              return (
                <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,borderRadius:7,background:`${pColor}14`,border:`1px solid ${pColor}33`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:11,fontWeight:700,color:pColor,flexShrink:0}}>{item.priority}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:3,color:C.text}}>{item.title}</div>
                    <div style={{fontSize:13,color:C.textDim,lineHeight:1.6,marginBottom:4}}>{item.reason}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{item.devices?.map((d,di)=><span key={di} style={{fontFamily:mono,fontSize:11,color:C.textDim,background:C.bgAlt,border:`1px solid ${C.border}`,padding:"1px 8px",borderRadius:4}}>{d}</span>)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Sec>
      )}

      <Sec style={{background:faRisk.bg,borderColor:faRisk.bd}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:faRisk.color}}/>
            <div style={{fontFamily:sans,fontSize:12,color:faRisk.color,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",display:"flex",alignItems:"center"}}>Fabric analysis <GL/></div>
          </div>
          <Badge level={fa.risk||"LOW"}/>
        </div>
        <div style={{fontSize:13,color:C.textDim,marginBottom:fa.findings?.length?12:0,fontStyle:"italic"}}>Facts derived directly from your submitted inventory.</div>
        {fa.findings?.map((f,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
            <span style={{color:faRisk.color,fontSize:12,flexShrink:0,marginTop:2}}>→</span>
            <span style={{fontSize:13,color:C.text,lineHeight:1.6}}>{f}</span>
          </div>
        ))}
        {fa.mismatches?.length>0&&(
          <div style={{marginTop:10,padding:"10px 14px",background:C.orangeBg,border:`1px solid ${C.orange}33`,borderRadius:8}}>
            <div style={{fontFamily:sans,fontSize:12,color:C.orange,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center"}}>Version mismatches detected <GL/></div>
            {fa.mismatches.map((m,i)=><div key={i} style={{fontSize:12,color:C.textDim,marginBottom:2}}>{m}</div>)}
          </div>
        )}
      </Sec>

      {ni.hasIntel&&ni.items?.length>0&&(
        <Sec>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontSize:14}}>🔍</span>
              <div style={{fontFamily:sans,fontSize:12,color:C.accent,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",display:"flex",alignItems:"center"}}>Netwrkr intel <GL/></div>
            </div>
            {hasVerified
              ?<span style={{fontFamily:mono,fontSize:10,color:C.green,background:C.greenBg,border:`1px solid ${C.green}44`,padding:"2px 8px",borderRadius:4}}>✓ Live PSIRT data</span>
              :<span style={{fontFamily:mono,fontSize:10,color:C.orange,background:C.orangeBg,border:`1px solid ${C.orange}44`,padding:"2px 8px",borderRadius:4}}>⚠ Unverified</span>
            }
          </div>
          <div style={{fontSize:13,color:C.textDim,marginBottom:14,lineHeight:1.6}}>
            {hasVerified
              ?<>Verified advisories from the live Cisco PSIRT API. Unverified items are from AI training knowledge — <span style={{color:C.accent,fontWeight:500}}>upgrade to enterprise</span> for full fabric exposure analysis.</>
              :<>Potential issues inferred from known version history. <span style={{color:C.accent,fontWeight:500}}>Upgrade to enterprise</span> for verified CSC data from the live Cisco Bug API.</>
            }
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ni.items.map((item,i)=>(
              <div key={i} style={{border:`1px solid ${item.verified?C.green+"44":C.borderMd}`,borderRadius:9,padding:"12px 15px",background:item.verified?C.greenBg:C.bgAlt}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <Badge level={item.sev} sm/>
                    <span style={{fontFamily:sans,fontSize:13,color:C.text,fontWeight:600}}>{item.title}</span>
                    {item.id&&<span style={{fontFamily:mono,fontSize:10,color:C.accent,background:C.accentBg,border:`1px solid ${C.accent}30`,padding:"1px 6px",borderRadius:4}}>{item.id}</span>}
                  </div>
                  <span style={{fontFamily:mono,fontSize:11,color:C.textFaint,flexShrink:0}}>{item.platform} v{item.version}</span>
                </div>
                <div style={{fontSize:13,color:C.textDim,lineHeight:1.6,marginBottom:8}}>{item.detail}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  {item.verified?<span style={{fontSize:12,color:C.green,fontWeight:500}}>✓ Verified — Cisco PSIRT API</span>:<span style={{fontSize:12,color:C.orange}}>⚠ Unverified — AI knowledge only</span>}
                  {!item.verified&&<button style={{background:"none",border:`1px solid ${C.borderMd}`,color:C.text,fontFamily:sans,fontSize:12,fontWeight:500,padding:"3px 10px",borderRadius:5,cursor:"pointer"}}>🔒 Verify with enterprise</button>}
                </div>
              </div>
            ))}
          </div>
        </Sec>
      )}

      <div style={{fontFamily:sans,fontSize:12,color:C.textDim,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center"}}>Device breakdown <GL/></div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {devices.map((d,di)=>{
          const fds=SEV[d.fabricRisk]||SEV.LOW;
          return (
            <div key={di} style={{background:C.bgCard,border:`1px solid ${C.borderMd}`,borderRadius:10,padding:"13px 18px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:fds.color,flexShrink:0}}/>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                      <span style={{fontWeight:600,fontSize:14,color:C.text}}>{d.name}</span>
                      <span style={{fontFamily:mono,fontSize:11,color:C.textFaint}}>v{d.ver}</span>
                      <span style={{fontFamily:sans,fontSize:11,color:C.textDim,background:C.bgAlt,border:`1px solid ${C.border}`,padding:"1px 8px",borderRadius:4}}>{d.role}</span>
                    </div>
                    <div style={{fontSize:12,color:C.textDim}}>{d.rec}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}><div style={{fontSize:10,color:C.textFaint,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.04em"}}>Fabric</div><Badge level={d.fabricRisk||"LOW"}/></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:10,color:C.textFaint,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.04em"}}>Intel</div><Badge level={d.intelRisk||"LOW"}/></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{background:C.accentBg,border:`1px solid ${C.accent}33`,borderRadius:10,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,marginBottom:12}}>
        <div>
          <div style={{fontFamily:sans,fontSize:13,color:C.accent,fontWeight:600,marginBottom:4,display:"flex",alignItems:"center"}}>Unlock verified fabric exposure analysis <GL/></div>
          <div style={{fontSize:13,color:C.textDim,lineHeight:1.6}}>Enterprise adds live Cisco Bug API data — verified CSC IDs and confirmed fabric exposure analysis.</div>
        </div>
        <button style={{background:C.text,border:"none",color:C.bg,fontFamily:sans,fontSize:13,fontWeight:600,padding:"10px 18px",borderRadius:8,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Get enterprise →</button>
      </div>

      {showNudge&&<SignupNudge onSignup={onShowSignup} onDismiss={onDismissNudge}/>}
    </div>
  );
}

function Analyse({go}) {
  const [screen,setScreen]=useState("paste");
  const [rawInput,setRawInput]=useState("");
  const [ctx,setCtx]=useState("");
  const [parsing,setParsing]=useState(false);
  const [devices,setDevices]=useState([]);
  const [step,setStep]=useState(0);
  const [results,setResults]=useState(null);
  const [showGate,setShowGate]=useState(false);
  const [showNudge,setShowNudge]=useState(false);
  const ref=useRef();
  const apiKey=()=>process.env.REACT_APP_ANTHROPIC_API_KEY||"";
  const callClaude=async(prompt,maxTokens=1000)=>{
    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,messages:[{role:"user",content:prompt}]})});
    const data=await res.json();
    return data.content[0].text;
  };
  const parseInput=async()=>{
    if(!rawInput.trim())return;setParsing(true);
    try{
      const text=await callClaude(`You are a data extraction engine for a Cisco network analysis tool.\n\nExtract all network devices from the text below. For each device return:\n- name: the Cisco platform name\n- ver: the exact software version string if explicitly present — if NOT present set to ""\n- role: the device role if present — if not present set to ""\n\nIMPORTANT: Only extract versions that are explicitly written in the text. Do not guess or infer versions from platform names.\n\nReturn ONLY a JSON array, no markdown:\n[{"name":"...","ver":"...","role":"..."}]\n\nText to parse:\n${rawInput}`);
      const clean=text.replace(/\`\`\`json|\`\`\`/g,"").trim();
      const parsed=JSON.parse(clean);
      setDevices(parsed.map(d=>({...d,verMissing:!d.ver.trim()})));
      setScreen("review");
    }catch(e){console.error(e);}
    setParsing(false);
  };
  const updateDevice=(i,field,val)=>setDevices(prev=>prev.map((d,idx)=>idx===i?{...d,[field]:val,verMissing:field==="ver"?!val.trim():d.verMissing}:d));
  const removeDevice=(i)=>setDevices(prev=>prev.filter((_,idx)=>idx!==i));
  const missingVersions=devices.filter(d=>d.verMissing).length;
  const canAnalyse=devices.length>0;
  const fetchAdvisories=async(devList)=>{
    const results={};
    await Promise.all(devList.map(async(d)=>{
      if(!d.ver||d.ver==="not provided")return;
      try{const res=await fetch("/api/advisories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform:d.name,version:d.ver,impact:""})});const data=await res.json();if(data.advisories?.length>0)results[`${d.name}__${d.ver}`]=data.advisories;}
      catch(e){console.error("Advisory fetch failed for",d.name,e);}
    }));
    return results;
  };
  const attemptAnalysis=()=>{if(getCount()>=1&&!isRegistered()){setShowGate(true);return;}runAnalysis();};
  const runAnalysis=async()=>{
    setShowGate(false);setScreen("analysing");setStep(0);
    let s=0;const timer=setInterval(()=>{if(s<STEPS.length-1){s++;setStep(s);}},900);
    const inventoryCsv="Platform, Version, Role\n"+devices.map(d=>`${d.name}, ${d.ver||"not provided"}, ${d.role||"unknown"}`).join("\n");
    const advisoryData=await fetchAdvisories(devices);
    const advisorySummary=Object.entries(advisoryData).map(([key,advisories])=>{
      const[platform,version]=key.split("__");const high=advisories.filter(a=>a.impact==="High");const med=advisories.filter(a=>a.impact==="Medium");
      return `${platform} v${version}: ${advisories.length} advisories (${high.length} High, ${med.length} Medium). Top: ${advisories.slice(0,3).map(a=>`${a.id} — ${a.title} [fixed ${a.firstFixed}]`).join("; ")}`;
    }).join("\n")||"No Cisco advisory data retrieved.";
    try{
      const text=await callClaude(`You are netwrkr.ai, an expert Cisco data centre network engineer.\n\nABSOLUTE RULES:\n1. ONLY report bug findings for devices where a version is EXPLICITLY provided. If ver is "not provided" set bugs to [].\n2. NEVER infer or guess software versions from platform names or roles.\n3. Version mismatches can ONLY be reported when multiple devices of the same type show DIFFERENT explicit versions.\n4. Every finding must end with [observed], [inferred], or [assumed].\n5. CRITICAL or HIGH severity requires explicit version evidence. No version = maximum MEDIUM risk.\n6. If any device has ver="not provided", include: "Software version not provided for X device(s) — bug and CVE analysis unavailable [observed]"\n7. NEVER add devices not in the submitted inventory. Every device must appear exactly once.\n8. Sort devices: Controllers (APIC, DNAC, NSO) → Spine → Border Leaf → Leaf → Distribution/Firewall/Edge.\n9. Border Leaf devices must have intelRisk "HIGH" minimum.\n10. Tier 4 devices (Distribution, Firewall, Catalyst, Firepower) must never exceed intelRisk "MEDIUM".\n11. APIC controllers always appear first.\n12. Controllers must have fabricRisk "LOW" unless there is a mismatch between controllers themselves.\n13. Border Leaf recommendations must use advisory language, never directive upgrade language.\n14. P1/P2/P3 titles must never contain the word "Critical".\n15. fabricAnalysis findings must never reference advisory counts, CVEs, or bug data.\n\nINFRASTRUCTURE TIER GUIDE:\n- Tier 1: Controllers — APIC, DNAC, NSO\n- Tier 2a: Spine\n- Tier 2b: Border Leaf — HIGH intel minimum\n- Tier 3: Leaf\n- Tier 4: Distribution, Firewall, Catalyst, Firepower (cap intel at MEDIUM)\n\nValidated device inventory:\n${inventoryCsv}\n\nAdditional context: ${ctx||"None provided"}\n\nVERIFIED CISCO SECURITY ADVISORIES:\n${advisorySummary}\n\nCRITICAL: For ANY platform in the advisory section above, set verified: true and use the exact advisory ID. Only set verified: false for platforms with NO advisory data.\n\nRespond ONLY with valid JSON (no markdown):\n{\n  "priorityAssessment": {"items": [{"priority":"P1","title":"","reason":"","devices":[""]},{"priority":"P2","title":"","reason":"","devices":[""]},{"priority":"P3","title":"","reason":"","devices":[""]}]},\n  "fabricAnalysis": {"risk":"LOW|MEDIUM|HIGH","consistent":false,"mismatches":[""],"missingVersions":[],"findings":[""]},\n  "netwrkrIntel": {"hasIntel":true,"summary":"","items":[{"platform":"","version":"","title":"","detail":"","id":"","verified":false,"sev":"MEDIUM"}]},\n  "devices": [{"name":"","ver":"","role":"","tier":1,"fabricRisk":"LOW","intelRisk":"LOW","rec":""}]\n}`,4000);
      const clean=text.replace(/\`\`\`json|\`\`\`/g,"").trim();
      const parsed=JSON.parse(clean);
      const realIds=new Set(Object.values(advisoryData).flat().map(a=>a.id).filter(Boolean));
      if(parsed.netwrkrIntel?.items)parsed.netwrkrIntel.items=parsed.netwrkrIntel.items.map(item=>({...item,verified:realIds.has(item.id)?true:item.verified}));
      incCount();const newCount=getCount();
      clearInterval(timer);setStep(STEPS.length);setResults(parsed);setScreen("results");
      if(newCount===1&&!isRegistered())setShowNudge(true);
    }catch(e){clearInterval(timer);setResults(null);setScreen("results");console.error(e);}
  };
  const reset=()=>{setScreen("paste");setRawInput("");setDevices([]);setCtx("");setResults(null);setStep(0);setShowNudge(false);};
  const inp={fontFamily:sans,fontSize:14,background:C.bgCard,border:`1px solid ${C.borderMd}`,color:C.text,borderRadius:8,padding:"11px 14px",width:"100%",outline:"none",lineHeight:1.7};
  return (
    <div style={{maxWidth:1060,margin:"0 auto",padding:"36px 40px"}}>
      {screen==="analysing"&&<Overlay step={step}/>}
      {showGate&&<SignupGate onComplete={()=>runAnalysis()} onDismiss={()=>{setShowGate(false);runAnalysis();}}/>}

      {screen==="paste"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:24,alignItems:"start"}}>
          <div>
            <div style={{marginBottom:22}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Step 1 of 3</div>
              <h1 style={{fontFamily:serif,fontSize:28,fontWeight:400,letterSpacing:"-0.03em",marginBottom:6,color:C.text}}>Paste your inventory</h1>
              <p style={{fontSize:14,color:C.textDim,lineHeight:1.7}}>Paste anything — CSV, spreadsheet, show version output, or free text. We'll extract what we need and ask you to confirm before running.</p>
            </div>
            <div style={{position:"relative",marginBottom:10}}>
              <textarea value={rawInput} onChange={e=>setRawInput(e.target.value)} rows={12} placeholder="Paste anything — CSV, spreadsheet, show version output, or free text…" style={{...inp,borderRadius:10,resize:"vertical"}}/>
              {rawInput&&<button onClick={()=>setRawInput("")} style={{position:"absolute",top:10,right:10,background:C.bgAlt,border:`1px solid ${C.border}`,color:C.textDim,fontFamily:sans,fontSize:12,padding:"3px 10px",borderRadius:5,cursor:"pointer"}}>Clear</button>}
            </div>
            <input ref={ref} type="file" accept=".csv,.txt,.log" onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setRawInput(ev.target.result);r.readAsText(f);}}} style={{display:"none"}}/>
            <div style={{display:"flex",gap:9,marginBottom:12}}>
              <button onClick={()=>setRawInput(SAMPLE)} style={{flex:1,background:"none",border:`1px solid ${C.borderMd}`,color:C.textDim,fontFamily:sans,fontSize:13,fontWeight:500,padding:"9px",borderRadius:7,cursor:"pointer"}}>Load sample</button>
              <button onClick={()=>ref.current?.click()} style={{flex:1,background:"none",border:`1px solid ${C.borderMd}`,color:C.textDim,fontFamily:sans,fontSize:13,fontWeight:500,padding:"9px",borderRadius:7,cursor:"pointer"}}>Upload file</button>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500,display:"block",marginBottom:6}}>Context <span style={{color:C.textFaint,fontWeight:400}}> — optional, improves accuracy</span></label>
              <textarea value={ctx} onChange={e=>setCtx(e.target.value)} rows={2} placeholder="e.g. VXLAN/EVPN fabric, vPC pairs on leaf layer, maintenance window Saturday 02:00 UTC" style={{...inp,resize:"none"}}/>
            </div>
            <button onClick={parseInput} disabled={!rawInput.trim()||parsing} style={{background:rawInput.trim()&&!parsing?C.text:"#b0aea5",color:C.bg,border:"none",borderRadius:9,fontFamily:sans,fontWeight:600,fontSize:15,padding:"13px",cursor:rawInput.trim()&&!parsing?"pointer":"not-allowed",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {parsing?<><span style={{width:14,height:14,border:`2px solid ${C.bg}44`,borderTopColor:C.bg,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Extracting devices…</>:"Extract devices →"}
            </button>
            <div style={{fontFamily:sans,fontSize:12,color:C.textFaint,textAlign:"center",marginTop:8}}>We'll show you what we found before running any analysis</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 18px"}}>
              <div style={{fontFamily:sans,fontSize:12,color:C.accent,fontWeight:600,marginBottom:12,letterSpacing:"0.04em",textTransform:"uppercase"}}>Works with anything</div>
              {[["CSV file","Platform, Version, Role columns"],["Spreadsheet paste","Any column order"],["show version output","Cisco CLI output"],["Free text","4 spines on 10.2(4)"],["DCIM export","Most formats supported"]].map(([t,s])=>(
                <div key={t} style={{display:"flex",gap:10,marginBottom:10}}>
                  <span style={{color:C.accent,flexShrink:0,fontSize:13,marginTop:1}}>→</span>
                  <div><div style={{fontSize:13,fontWeight:500,color:C.text}}>{t}</div><div style={{fontSize:12,color:C.textFaint}}>{s}</div></div>
                </div>
              ))}
            </div>
            <div style={{background:"#eef5f1",border:"1px solid #bfddcc",borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontFamily:sans,fontSize:12,color:C.green,fontWeight:600,marginBottom:4}}>Privacy</div>
              <div style={{fontSize:12,color:C.textDim,lineHeight:1.7}}>No hostnames, IPs, or credentials needed. Results are never stored.</div>
            </div>
          </div>
        </div>
      )}

      {screen==="review"&&(
        <div>
          <div style={{marginBottom:22}}>
            <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Step 2 of 3</div>
            <h1 style={{fontFamily:serif,fontSize:28,fontWeight:400,letterSpacing:"-0.03em",marginBottom:6,color:C.text}}>Confirm your devices</h1>
            <p style={{fontSize:14,color:C.textDim,lineHeight:1.7}}>We found {devices.length} device{devices.length!==1?"s":""}. Check the details — especially software versions — then run the analysis.</p>
          </div>
          {missingVersions>0&&(
            <div style={{background:C.orangeBg,border:`1px solid ${C.orange}44`,borderRadius:9,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{color:C.orange,fontSize:16,flexShrink:0}}>⚠</span>
              <div><div style={{fontFamily:sans,fontSize:13,color:C.orange,fontWeight:600,marginBottom:3}}>{missingVersions} device{missingVersions!==1?"s":""} missing version</div><div style={{fontSize:13,color:C.textDim,lineHeight:1.6}}>Bug and CVE analysis requires software version. Add versions below or run without them.</div></div>
            </div>
          )}
          <div style={{background:C.bgCard,border:`1px solid ${C.borderMd}`,borderRadius:10,overflow:"hidden",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 32px",background:C.bgAlt,padding:"10px 18px",borderBottom:`1px solid ${C.border}`}}>
              {["Platform","Version","Role",""].map(h=><div key={h} style={{fontFamily:sans,fontSize:11,color:C.textDim,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{h}</div>)}
            </div>
            {devices.map((d,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 32px",padding:"10px 18px",borderBottom:`1px solid ${C.border}`,alignItems:"center",background:d.verMissing?C.orangeBg:"transparent"}}>
                <div style={{fontFamily:sans,fontSize:13,color:C.text,fontWeight:500,paddingRight:8}}>{d.name}</div>
                <div style={{paddingRight:8}}><input value={d.ver} onChange={e=>updateDevice(i,"ver",e.target.value)} placeholder="e.g. 9.3(9)" style={{background:d.verMissing?C.bgCard:"transparent",border:`1px solid ${d.verMissing?C.orange:C.borderMd}`,color:d.verMissing?C.orange:C.text,fontFamily:mono,fontSize:12,padding:"4px 8px",borderRadius:5,outline:"none",width:"100%"}}/></div>
                <div style={{paddingRight:8}}><input value={d.role} onChange={e=>updateDevice(i,"role",e.target.value)} placeholder="e.g. Leaf" style={{background:"transparent",border:`1px solid ${C.borderMd}`,color:C.textDim,fontFamily:sans,fontSize:12,padding:"4px 8px",borderRadius:5,outline:"none",width:"100%"}}/></div>
                <button onClick={()=>removeDevice(i)} style={{background:"none",border:"none",color:C.textFaint,cursor:"pointer",fontSize:14,padding:"2px"}}>✕</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setScreen("paste")} style={{background:"none",border:`1px solid ${C.borderMd}`,color:C.text,fontFamily:sans,fontSize:14,fontWeight:500,padding:"12px 20px",borderRadius:8,cursor:"pointer"}}>← Back</button>
            <button onClick={attemptAnalysis} disabled={!canAnalyse} style={{flex:1,background:canAnalyse?C.text:"#b0aea5",color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:15,padding:"13px",cursor:canAnalyse?"pointer":"not-allowed"}}>Run analysis →</button>
          </div>
          <div style={{fontFamily:sans,fontSize:12,color:C.textFaint,textAlign:"center",marginTop:8}}>
            {missingVersions>0?`${missingVersions} device${missingVersions!==1?"s":""} will be analysed for topology issues only`:"All devices have version data — full analysis enabled"}
          </div>
        </div>
      )}

      {screen==="results"&&results&&<Results data={results} reset={reset} go={go} onShowSignup={()=>setShowGate(true)} showNudge={showNudge} onDismissNudge={()=>setShowNudge(false)}/>}
    </div>
  );
}

const SECS=[
  {ic:"🔐",t:"Encrypted at rest",tag:"AES-256",s:"AES-256-GCM encryption before storage.",d:["Encryption uses AES-256-GCM before any write to storage.","Key stored separately in a dedicated secrets management service.","Even in a breach, credentials are unreadable without the key.","Keys are rotated regularly."]},
  {ic:"🚫",t:"Never logged",tag:"zero logging",s:"Credential values scrubbed from all logs at infrastructure level.",d:["Authorization headers scrubbed before logs are written.","Applies to application, access, error logs, and third-party monitoring.","Enforced at infrastructure level — cannot be bypassed by a code change.","We retain anonymised request metadata only."]},
  {ic:"👤",t:"No human access",tag:"zero visibility",s:"Technically impossible for our team to read your credentials.",d:["Credentials encrypted using a key not accessible to engineering in normal operations.","No 'view credentials' admin function exists anywhere in our tooling.","Any key access attempt generates an alert and requires multi-party approval.","We cannot recover your credentials if lost."]},
  {ic:"📦",t:"Bug data never stored",tag:"minimal data",s:"Analysis results flow through and are discarded after each request.",d:["Bug API results, inventory, and analysis output never written to our database.","Data flows through the request lifecycle and is discarded on completion.","Only email, hashed password, and encrypted credentials are persisted.","Minimises exposure — no inventory or analysis history to exfiltrate."]},
  {ic:"⚙️",t:"Server-side only",tag:"credentials stay server-side",s:"All Cisco API calls originate from our servers.",d:["Credentials sent to our backend over HTTPS once, then immediately encrypted.","Never stored in your browser, localStorage, or any client-side state.","All Cisco API calls originate from our servers — never from your browser.","Your Secret never appears in network tabs or browser developer tools."]},
  {ic:"🔑",t:"Revoke any time",tag:"you are in control",s:"Delete credentials or your entire account from Settings at any time.",d:["Settings credentials deletion immediately removes the encrypted record.","Account deletion removes all data we hold, permanently and immediately.","We also recommend revoking the app registration on Cisco API Console.","Deletion is irreversible."]},
  {ic:"🛡️",t:"Never sold or shared",tag:"no third parties",s:"We do not sell, share, or license your data to any third party, ever.",d:["Your data is used solely to provide the netwrkr.ai service.","We do not share credentials or usage data with any third party except Cisco API itself.","Third-party infrastructure providers are contractually prohibited from accessing your data.","We only disclose data in response to a valid legal requirement."]},
];

function SecurityPage() {
  const [exp,setExp]=useState(null);
  return (
    <div style={{maxWidth:860,margin:"0 auto",padding:"0 40px"}}>
      <div style={{padding:"56px 0 40px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Security</div>
        <h1 style={{fontFamily:serif,fontSize:40,fontWeight:400,letterSpacing:"-0.04em",lineHeight:1.1,marginBottom:14,color:C.text}}>Your data.<br/><span style={{color:C.accent}}>Your control.</span></h1>
        <p style={{fontSize:15,color:C.textDim,lineHeight:1.8,maxWidth:520}}>The free tier needs nothing sensitive — just platform names and software versions. Here is exactly how we handle what you share with us.</p>
        <div style={{display:"flex",gap:8,marginTop:20,flexWrap:"wrap"}}>
          {["AES-256 encrypted","zero logging","server-side only","no human access","revoke anytime"].map(t=><Pill key={t}>{t}</Pill>)}
        </div>
      </div>
      <div style={{padding:"40px 0"}}>
        <div style={{fontFamily:sans,fontSize:12,color:C.textDim,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:20}}>Seven commitments — click any to expand</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {SECS.map(p=>{
            const open=exp===p.t;
            return (
              <div key={p.t} onClick={()=>setExp(open?null:p.t)} style={{background:C.bgCard,border:`1px solid ${open?C.borderMd:C.border}`,borderRadius:10,overflow:"hidden",cursor:"pointer",transition:"border-color .2s",boxShadow:open?"0 2px 12px #14141308":"none"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:38,height:38,borderRadius:9,background:C.bgAlt,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{p.ic}</div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:3}}><span style={{fontWeight:600,fontSize:14,color:C.text}}>{p.t}</span><Pill>{p.tag}</Pill></div>
                      <div style={{fontSize:13,color:C.textDim,lineHeight:1.5}}>{p.s}</div>
                    </div>
                  </div>
                  <span style={{fontFamily:sans,fontSize:13,color:C.textFaint,flexShrink:0,marginLeft:14}}>{open?"▲":"▼"}</span>
                </div>
                {open&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"16px 20px",background:C.bgAlt}}>
                    <div style={{fontFamily:sans,fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>Technical detail</div>
                    {p.d.map((d,i)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:9,alignItems:"flex-start"}}><span style={{color:C.accent,fontSize:12,flexShrink:0,marginTop:2}}>→</span><span style={{fontSize:13,color:C.textDim,lineHeight:1.7}}>{d}</span></div>))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,padding:"26px 32px",marginBottom:60,display:"flex",alignItems:"center",justifyContent:"space-between",gap:20}}>
        <div>
          <div style={{fontFamily:sans,fontSize:12,color:C.accent,fontWeight:600,marginBottom:7}}>Security concerns</div>
          <h3 style={{fontFamily:serif,fontSize:18,fontWeight:400,letterSpacing:"-0.02em",marginBottom:5,color:C.text}}>Found a security issue?</h3>
          <p style={{fontSize:13,color:C.textDim}}>We take all reports seriously and respond within 24 hours.</p>
        </div>
        <button style={{background:C.text,color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:13,padding:"10px 20px",cursor:"pointer",flexShrink:0}}>security@netwrkr.ai</button>
      </div>
    </div>
  );
}

function GHIcon(){return<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>;}
function GGIcon(){return<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;}

function Auth({mode:init,go,setAuthed}) {
  const [mode,setMode]=useState(init);
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(null);
  const [sent,setSent]=useState(false);
  const str=pw.length===0?0:pw.length<6?1:pw.length<8?2:pw.length<12?3:4;
  const strC=["",C.red,C.orange,C.accent,C.green][str];
  const strL=["","Weak","Fair","Good","Strong"][str];
  const match=pw&&pw2&&pw===pw2;
  const submit=p=>{setLoading(p);setTimeout(()=>{setLoading(null);setAuthed(true);go("analyse");},1500);};
  const inp={background:C.bgCard,border:`1px solid ${C.borderMd}`,color:C.text,fontFamily:sans,fontSize:14,padding:"11px 13px",borderRadius:8,outline:"none",width:"100%"};
  const sso=(p,icon,label)=>(
    <button onClick={()=>submit(p)} disabled={!!loading} style={{background:C.bgCard,border:`1px solid ${C.borderMd}`,color:C.text,borderRadius:8,fontFamily:sans,fontSize:13,fontWeight:500,padding:"11px",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
      {loading===p?<span style={{width:13,height:13,border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>:icon}{label}
    </button>
  );
  const divider=<div style={{display:"flex",alignItems:"center",gap:12,margin:"4px 0"}}><div style={{flex:1,height:1,background:C.border}}/><span style={{fontFamily:sans,fontSize:12,color:C.textFaint}}>or</span><div style={{flex:1,height:1,background:C.border}}/></div>;
  const lnk=(label,fn)=><button onClick={fn} style={{background:"none",border:"none",color:C.accent,fontFamily:sans,fontSize:13,fontWeight:500,cursor:"pointer",padding:0}}>{label}</button>;
  return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 20px"}}>
      <div style={{width:"100%",maxWidth:380}}>
        {mode==="login"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Sign in</div>
              <h1 style={{fontFamily:serif,fontSize:26,fontWeight:400,letterSpacing:"-0.03em",marginBottom:4,color:C.text}}>Welcome back</h1>
              <p style={{fontSize:14,color:C.textDim}}>Sign in to your netwrkr.ai account</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>{sso("google",<GGIcon/>,"Continue with Google")}{sso("github",<GHIcon/>,"Continue with GitHub")}</div>
            {divider}
            <div style={{display:"flex",flexDirection:"column",gap:12,margin:"14px 0"}}>
              <div><label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500,display:"block",marginBottom:5}}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={inp}/></div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500}}>Password</label>{lnk("Forgot password?",()=>setMode("forgot"))}</div>
                <div style={{position:"relative"}}><input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={inp}/><button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.textFaint,fontFamily:sans,fontSize:12,cursor:"pointer"}}>{show?"Hide":"Show"}</button></div>
              </div>
            </div>
            <button onClick={()=>submit("email")} disabled={!email||!pw||!!loading} style={{background:email&&pw&&!loading?C.text:"#b0aea5",color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"12px",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading==="email"?<><span style={{width:13,height:13,border:`2px solid ${C.bg}44`,borderTopColor:C.bg,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Signing in…</>:"Sign in →"}
            </button>
            <div style={{marginTop:14,textAlign:"center",fontSize:13,color:C.textDim}}>No account? {lnk("Create one",()=>setMode("signup"))}</div>
          </div>
        )}
        {mode==="signup"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Create account</div>
              <h1 style={{fontFamily:serif,fontSize:26,fontWeight:400,letterSpacing:"-0.03em",marginBottom:4,color:C.text}}>Get started free</h1>
              <p style={{fontSize:14,color:C.textDim}}>10 analyses/month. No credit card required.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>{sso("google",<GGIcon/>,"Continue with Google")}{sso("github",<GHIcon/>,"Continue with GitHub")}</div>
            {divider}
            <div style={{display:"flex",flexDirection:"column",gap:12,margin:"14px 0"}}>
              <div><label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500,display:"block",marginBottom:5}}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={inp}/></div>
              <div>
                <label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500,display:"block",marginBottom:5}}>Password</label>
                <div style={{position:"relative"}}><input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min. 8 characters" style={inp}/><button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.textFaint,fontFamily:sans,fontSize:12,cursor:"pointer"}}>{show?"Hide":"Show"}</button></div>
                {pw&&<div style={{marginTop:7,display:"flex",alignItems:"center",gap:5}}>{[1,2,3,4].map(i=><div key={i} style={{height:3,flex:1,borderRadius:2,background:i<=str?strC:C.border}}/>)}<span style={{fontFamily:sans,fontSize:11,color:strC,width:38}}>{strL}</span></div>}
              </div>
              <div><label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500,display:"block",marginBottom:5}}>Confirm password</label><input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" style={{...inp,borderColor:pw2&&!match?C.red:C.borderMd}}/>{pw2&&!match&&<div style={{fontSize:12,color:C.red,marginTop:4}}>Passwords do not match</div>}</div>
            </div>
            <button onClick={()=>submit("email")} disabled={!email||!match||pw.length<8||!!loading} style={{background:email&&match&&pw.length>=8&&!loading?C.text:"#b0aea5",color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"12px",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading==="email"?<><span style={{width:13,height:13,border:`2px solid ${C.bg}44`,borderTopColor:C.bg,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Creating account…</>:"Create account →"}
            </button>
            <div style={{marginTop:12,fontSize:12,color:C.textFaint,textAlign:"center",lineHeight:1.6}}>By signing up you agree to our {lnk("terms",()=>{})} and {lnk("privacy policy",()=>{})}</div>
            <div style={{marginTop:10,textAlign:"center",fontSize:13,color:C.textDim}}>Have an account? {lnk("Sign in",()=>setMode("login"))}</div>
          </div>
        )}
        {mode==="forgot"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.accent,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Reset password</div>
              <h1 style={{fontFamily:serif,fontSize:26,fontWeight:400,letterSpacing:"-0.03em",marginBottom:4,color:C.text}}>Reset your password</h1>
              <p style={{fontSize:14,color:C.textDim}}>Enter your email and we'll send a reset link.</p>
            </div>
            {!sent?(<>
              <label style={{fontFamily:sans,fontSize:13,color:C.textDim,fontWeight:500,display:"block",marginBottom:6}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={{...inp,marginBottom:12}}/>
              <button onClick={()=>{setLoading("r");setTimeout(()=>{setLoading(null);setSent(true);},1300);}} disabled={!email||!!loading} style={{background:email&&!loading?C.text:"#b0aea5",color:C.bg,border:"none",borderRadius:8,fontFamily:sans,fontWeight:600,fontSize:14,padding:"12px",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {loading==="r"?<><span style={{width:13,height:13,border:`2px solid ${C.bg}44`,borderTopColor:C.bg,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Sending…</>:"Send reset link →"}
              </button>
            </>):(
              <div style={{background:C.greenBg,border:`1px solid ${C.green}44`,borderRadius:9,padding:22,textAlign:"center"}}>
                <div style={{fontFamily:sans,fontSize:14,color:C.green,fontWeight:600,marginBottom:5}}>✓ Reset link sent</div>
                <div style={{fontSize:13,color:C.textDim}}>Check your inbox. Link expires in 30 minutes.</div>
              </div>
            )}
            <div style={{marginTop:16,textAlign:"center",fontSize:13,color:C.textDim}}>{lnk("← Back to sign in",()=>{setMode("login");setSent(false);})}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState("home");
  const [authed,setAuthed]=useState(false);
  const go=p=>{setPage(p);window.scrollTo?.(0,0);};
  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:sans,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{-webkit-font-smoothing:antialiased;}
        ::selection{background:#d9775730;color:#141413;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:#faf9f5;}
        ::-webkit-scrollbar-thumb{background:#14141326;border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
      `}</style>
      <Nav page={page} go={go} authed={authed}/>
      <div style={{flex:1,display:"flex",flexDirection:"column"}}>
        {page==="home"     && <Home go={go}/>}
        {page==="analyse"  && <Analyse go={go}/>}
        {page==="glossary" && <GlossaryPage go={go}/>}
        {page==="security" && <SecurityPage/>}
        {(page==="login"||page==="signup") && <Auth mode={page==="login"?"login":"signup"} go={go} setAuthed={setAuthed}/>}
      </div>
    </div>
  );
}
