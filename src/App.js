// v2.8 — glossary dark theme
import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#080806", surface:"#0E0D0A", hi:"#141310",
  border:"#272318", amber:"#D4A000", amberB:"#FFCA28",
  amberG:"#D4A00015", green:"#22C55E", greenG:"#22C55E15",
  red:"#EF4444", orange:"#F97316", yellow:"#EAB308",
  text:"#EDE8DC", dim:"#9C9278", muted:"#524B3A", faint:"#1A1810",
};

const SEV = {
  CRITICAL:{ color:C.red,    bg:"#2A0A0A", bd:"#5A1A1A" },
  HIGH:    { color:C.orange, bg:"#2A1400", bd:"#5A2A00" },
  MEDIUM:  { color:C.yellow, bg:"#2A2000", bd:"#5A4A00" },
  LOW:     { color:C.green,  bg:"#0A2A10", bd:"#1A4A20" },
};

const mono = "JetBrains Mono, Fira Code, monospace";

function Pill({ children, color=C.amber }) {
  return <span style={{fontFamily:mono,fontSize:10,color,background:color+"18",border:`1px solid ${color}30`,padding:"2px 8px",borderRadius:3,letterSpacing:"0.04em"}}>{children}</span>;
}

function Badge({ level, sm }) {
  const s = SEV[level]||SEV.LOW;
  return <span style={{fontFamily:mono,fontSize:sm?9:11,fontWeight:700,color:s.color,background:s.bg,border:`1px solid ${s.bd}`,padding:sm?"1px 6px":"2px 9px",borderRadius:3}}>{level}</span>;
}

function MacBar({ label }) {
  return (
    <div style={{background:C.hi,borderBottom:`1px solid ${C.border}`,padding:"8px 14px",display:"flex",alignItems:"center",gap:7}}>
      {["#FF5F56","#FFBD2E","#27C93F"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c,opacity:.8}}/>)}
      <span style={{marginLeft:8,fontFamily:mono,fontSize:11,color:C.muted}}>{label}</span>
    </div>
  );
}

function InfoIcon({ onClick }) {
  return (
    <svg onClick={onClick} width="13" height="13" viewBox="0 0 13 13" fill="none" style={{cursor:"pointer",opacity:0.5,flexShrink:0,marginLeft:4,verticalAlign:"middle"}}
      onMouseEnter={e=>e.currentTarget.style.opacity=1}
      onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>
      <circle cx="6.5" cy="6.5" r="5.5" stroke={C.amber} strokeWidth="1"/>
      <line x1="6.5" y1="5.5" x2="6.5" y2="9.5" stroke={C.amber} strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="6.5" cy="3.8" r="0.7" fill={C.amber}/>
    </svg>
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
      <MacBar label="netwrkr.ai — enterprise terminal" />
      <div style={{padding:"18px 20px",minHeight:300,fontFamily:mono,fontSize:13,lineHeight:1.8}}>
        {TL.slice(0,n).map((l,i)=><div key={i} style={{color:l.c,whiteSpace:"pre"}}>{l.s}</div>)}
        {n<TL.length&&n>0&&<Cur/>}
      </div>
    </div>
  );
}

function Nav({page,go,authed,usage=7}) {
  const lnk = (p,label) => (
    <button onClick={()=>go(p)} style={{background:"none",border:"none",fontFamily:mono,fontSize:12,
      color:page===p?C.amber:C.muted,cursor:"pointer",padding:"5px 10px",borderRadius:4,letterSpacing:"0.04em"}}>
      {label}
    </button>
  );
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 36px",background:`${C.bg}E8`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1140,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>go("home")}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontFamily:mono,fontWeight:700,fontSize:15}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          {lnk("analyse","analyse")}
          {lnk("glossary","glossary")}
          {lnk("security","security")}
          <div style={{width:1,height:16,background:C.border,margin:"0 8px"}}/>
          {authed ? (
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",gap:2,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",alignItems:"center",gap:6}}>
                {[...Array(10)].map((_,i)=><div key={i} style={{width:5,height:5,borderRadius:1,background:i<usage?C.amber:C.border}}/>)}
                <span style={{fontFamily:mono,fontSize:11,color:C.muted,marginLeft:4}}>{usage}/10 free</span>
              </div>
              <button onClick={()=>go("analyse")} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
                analyze →
              </button>
            </div>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>go("login")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 16px",cursor:"pointer"}}>
                sign_in()
              </button>
              <button onClick={()=>go("signup")} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
                get_started →
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

const GLOSSARY = [
  { section:"Risk levels", terms:[
    { term:"Fabric risk", def:"A score reflecting how much a device's observed topology and version data contributes to instability in the fabric. Based only on facts from your submitted inventory — version mismatches, tier conflicts, consistency issues. Never includes bug or advisory data." },
    { term:"Intel risk", def:"A score reflecting the potential security and software risk for a device based on known advisories and AI training knowledge. May include unverified findings — always check the verified indicator on each card." },
    { term:"LOW / MEDIUM / HIGH", def:"The three risk levels used across fabric and intel scores. LOW means no significant issues found. MEDIUM means issues worth monitoring. HIGH means issues requiring attention before the next maintenance window. CRITICAL is only used for verified, confirmed fabric-impacting bugs in the enterprise tier." },
  ]},
  { section:"Finding labels", terms:[
    { term:"[observed]", def:"This finding comes directly from data you submitted. For example, two devices of the same platform running different versions — that is a fact from your inventory, not an inference." },
    { term:"[inferred]", def:"This finding is a logical conclusion drawn from observed data. For example, a version mismatch between spine and border leaf is observed — the potential routing instability that could result is inferred." },
    { term:"[assumed]", def:"This finding has limited evidence. It is included as a low-confidence advisory only. Treat assumed findings with caution and verify independently before acting." },
  ]},
  { section:"Netwrkr intel", terms:[
    { term:"Netwrkr intel", def:"The AI-powered intelligence stream. Netwrkr intel draws on known version history, Cisco security advisories, and training knowledge to surface potential software issues. Always shown separately from fabric analysis to make the confidence level clear." },
    { term:"Verified — Cisco PSIRT API", def:"This advisory has been confirmed against the live Cisco PSIRT security database. The CSC ID is real and the vulnerability exists for this platform and version. This does not confirm whether the bug affects your specific fabric — that requires enterprise fabric exposure analysis." },
    { term:"Unverified — AI knowledge only", def:"This advisory is based on AI training knowledge and has not been confirmed against the live Cisco database. It may be accurate but should be treated as a prompt to investigate, not a confirmed finding." },
    { term:"CSC ID", def:"A Cisco bug identifier, for example cisco-sa-apic-dos-rNus8EFw. CSC IDs on verified cards are real identifiers from Cisco's security advisory database. You can look them up directly on tools.cisco.com." },
    { term:"PSIRT", def:"Cisco Product Security Incident Response Team. The team responsible for publishing security advisories for Cisco products. netwrkr.ai queries the PSIRT openVuln API to retrieve verified advisory data." },
  ]},
  { section:"Infrastructure roles", terms:[
    { term:"Controller (Tier 1)", def:"A management and policy controller such as APIC, DNAC, or NSO. Controllers sit at the top of the infrastructure hierarchy because their software version shapes the upgrade path for the entire fabric. Always shown first in the device breakdown." },
    { term:"Spine (Tier 2)", def:"Core switching layer that connects all leaf devices. Spines carry all east-west and north-south traffic in the fabric. Version consistency across spines is critical for fabric stability." },
    { term:"Border leaf (Tier 2)", def:"A leaf switch that connects the fabric to external networks — WAN, internet, or other data centres. Border leafs handle BGP peering and external routing, making them more sensitive than standard leafs. netwrkr.ai applies a higher minimum intel risk to border leaf devices because of their external exposure." },
    { term:"Leaf (Tier 3)", def:"Access layer switches that connect servers, storage, and other endpoints to the fabric. Leafs form the forwarding plane of the network." },
    { term:"Distribution / firewall / edge (Tier 4)", def:"Devices at the edge of the fabric such as Catalyst switches, Firepower firewalls, or ASR routers. netwrkr.ai caps intel risk at MEDIUM for tier 4 devices — they are important but do not compete with tier 1 and 2 issues for priority." },
  ]},
  { section:"Priority assessment", terms:[
    { term:"P1", def:"The highest priority finding in this analysis. Typically the most structurally significant risk — a fabric-wide version mismatch, a border leaf exposure, or a high-severity verified advisory on a critical device. Address P1 findings before the next maintenance window." },
    { term:"P2", def:"A significant finding that requires planning but is not immediately critical. Often relates to controller compatibility, version inconsistency across a device tier, or an unverified advisory on a high-sensitivity device." },
    { term:"P3", def:"A monitoring item or low-urgency advisory. Worth tracking but does not require immediate action. Often relates to tier 4 devices or minor version inconsistencies." },
  ]},
  { section:"Fabric analysis", terms:[
    { term:"Fabric analysis", def:"The first results stream. Contains only facts derived from your submitted inventory — version mismatches, topology observations, missing data. Never includes bug knowledge or advisory data. Everything in fabric analysis is labelled [observed] or [inferred]." },
    { term:"Version mismatch", def:"Two or more devices of the same platform running different software versions. Version mismatches increase the risk of unexpected behaviour and complicate upgrade sequencing. netwrkr.ai detects mismatches only when version data is explicitly provided for multiple devices of the same type." },
    { term:"Fabric exposure analysis", def:"An enterprise-tier feature that confirms whether a known bug actually affects your specific fabric topology. A verified advisory tells you a bug exists — fabric exposure analysis tells you whether your fabric is affected. Available with enterprise credentials and SNTC data." },
  ]},
];

function GlossaryPage({go}) {
  const [query, setQuery] = useState("");

  const filtered = GLOSSARY.map(s=>({
    ...s,
    terms: s.terms.filter(t =>
      !query || t.term.toLowerCase().includes(query.toLowerCase()) || t.def.toLowerCase().includes(query.toLowerCase())
    )
  })).filter(s => s.terms.length > 0);

  return (
    <div>
      <div style={{maxWidth:780,margin:"0 auto",padding:"56px 36px 80px"}}>

        <div style={{marginBottom:40}}>
          <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>// glossary</div>
          <h1 style={{fontSize:36,fontWeight:300,letterSpacing:"-0.03em",marginBottom:12}}>Terms explained</h1>
          <p style={{fontSize:15,color:C.dim,lineHeight:1.7,marginBottom:28}}>Plain-English definitions for every term used in netwrkr.ai analysis results.</p>

          <div style={{position:"relative"}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",opacity:0.3}}>
              <circle cx="6.5" cy="6.5" r="5" stroke={C.amber} strokeWidth="1.3"/>
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke={C.amber} strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Search terms..."
              style={{width:"100%",boxSizing:"border-box",padding:"11px 13px 11px 38px",fontSize:14,fontFamily:"'DM Sans',system-ui,sans-serif",background:C.hi,border:`1px solid ${C.border}`,borderRadius:8,outline:"none",color:C.text}}
            />
            {query && <button onClick={()=>setQuery("")} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontFamily:mono,fontSize:11,color:C.muted,padding:0}}>clear</button>}
          </div>
        </div>

        {query && (
          <div style={{fontFamily:mono,fontSize:11,color:C.muted,marginBottom:24}}>
            // {filtered.reduce((a,s)=>a+s.terms.length,0)} result{filtered.reduce((a,s)=>a+s.terms.length,0)!==1?"s":""} for "{query}"
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{fontFamily:mono,fontSize:13,color:C.muted,padding:"40px 0",textAlign:"center"}}>// no results found</div>
        ) : (
          filtered.map((section,si)=>(
            <div key={si} style={{marginBottom:40}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
                // {section.section}
              </div>
              {section.terms.map((t,ti)=>(
                <div key={ti} style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:24,padding:"14px 0",borderBottom:`1px solid ${C.faint}`,alignItems:"start"}}>
                  <div style={{fontFamily:mono,fontSize:13,color:C.text,fontWeight:500,paddingTop:1}}>{t.term}</div>
                  <div style={{fontSize:14,color:C.dim,lineHeight:1.75}}>{t.def}</div>
                </div>
              ))}
            </div>
          ))
        )}

        <div style={{marginTop:40,paddingTop:32,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:13,color:C.muted}}>Something missing? A term you don't recognise?</div>
          <button onClick={()=>go("analyse")} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"8px 16px",cursor:"pointer"}}>
            try_analyse() →
          </button>
        </div>

      </div>
    </div>
  );
}

function Home({go}) {
  const [tab,setTab]=useState("ent");
  const [email,setEmail]=useState("");
  const [done,setDone]=useState(false);

  const Btn = ({label,active,onClick}) => (
    <button onClick={onClick} style={{background:active?C.amber:"transparent",color:active?"#000":C.muted,border:"none",borderRadius:5,fontFamily:mono,fontSize:12,fontWeight:active?700:400,padding:"8px 18px",cursor:"pointer",letterSpacing:"0.03em",transition:"all .15s"}}>
      {label}
    </button>
  );

  return (
    <div>
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
            <button onClick={()=>go("analyse")} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px 26px",cursor:"pointer"}}>
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

      <div style={{maxWidth:1140,margin:"0 auto",padding:"0 36px 72px"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:36}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:4,display:"flex",gap:2}}>
            <Btn label="Enterprise // self-hosted" active={tab==="ent"} onClick={()=>setTab("ent")}/>
            <Btn label="Free // browser-based"     active={tab==="free"} onClick={()=>setTab("free")}/>
          </div>
        </div>

        {tab==="ent" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"start"}}>
            <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// enterprise edition</div>
              <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:14}}>Runs inside your perimeter.</h2>
              <p style={{fontSize:14,color:C.dim,lineHeight:1.8,marginBottom:22}}>
                A Docker image you run on your own infrastructure. Credentials never leave your network — not even to us.
              </p>
              {[["🔐","Zero credential exposure","Cisco API calls from your server. We never see your credentials."],
                ["🐳","One-command install","docker pull + docker run. Running in under 2 minutes."],
                ["🔍","Fully auditable","Open source backend. Read every line before you run it."],
                ["⚡","Live Cisco Bug API","Real-time authoritative data. Every CSC ID verified."]
              ].map(([ic,t,d])=>(
                <div key={t} style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
                  <span style={{fontSize:17,flexShrink:0,marginTop:1}}>{ic}</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{t}</div>
                    <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{d}</div>
                  </div>
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
              <button onClick={()=>go("signup")} style={{background:C.amber,color:"#000",border:"none",borderRadius:7,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px",cursor:"pointer",width:"100%"}}>
                contact_us() // enterprise pricing
              </button>
            </div>
          </div>
        )}

        {tab==="free" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"start"}}>
            <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// free tier</div>
              <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:14}}>
                No signup. No credentials.<br/><span style={{color:C.amber}}>Just paste and go.</span>
              </h2>
              <p style={{fontSize:14,color:C.dim,lineHeight:1.8,marginBottom:22}}>
                Upload a CSV of platform names and versions. Claude analyzes it against known bug patterns instantly. Nothing sensitive required.
              </p>
              {[["📋","CSV upload only","Platform + version. No hostnames, IPs, or sensitive data."],
                ["🤖","AI-powered analysis","Cross-referenced against bugs, advisories, and release notes."],
                ["🔒","Nothing sensitive shared","You control exactly what you upload."],
                ["⚡","10 analyses / month","Free forever. No credit card. No account needed to try."]
              ].map(([ic,t,d])=>(
                <div key={t} style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
                  <span style={{fontSize:17,flexShrink:0,marginTop:1}}>{ic}</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{t}</div>
                    <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{d}</div>
                  </div>
                </div>
              ))}
              <button onClick={()=>go("analyse")} style={{background:C.amber,color:"#000",border:"none",borderRadius:7,fontFamily:mono,fontWeight:700,fontSize:13,padding:"12px 24px",cursor:"pointer",marginTop:6}}>
                try_free() // no account needed
              </button>
            </div>
            <div style={{background:"#050503",border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <MacBar label="fabric.csv"/>
              <div style={{padding:"18px 20px",fontFamily:mono,fontSize:12,lineHeight:1.9}}>
                <div style={{color:C.muted}}># Platform, Version, Role</div>
                {[["Nexus 9336C-FX2","10.2(3)","Spine",C.text],
                  ["Nexus 9336C-FX2","10.2(3)","Spine",C.text],
                  ["Nexus 93180YC-EX","9.3(8)","Leaf",C.text],
                  ["Nexus 93180YC-EX","9.3(5)","Leaf",C.orange],
                  ["Catalyst 9500","17.6.1","Distribution",C.text],
                  ["Firepower 4140","7.0.1","Firewall",C.text],
                ].map(([p,v,r,col],i)=>(
                  <div key={i} style={{color:col}}>
                    {p}, {v}, {r}
                    {col===C.orange&&<span style={{color:C.orange,marginLeft:8}}>← version mismatch</span>}
                  </div>
                ))}
                <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.faint}`,color:C.muted,fontSize:11}}>
                  // no hostnames · no IPs · platform + version only
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{borderTop:`1px solid ${C.border}`,background:C.surface}}>
        <div style={{maxWidth:1140,margin:"0 auto",padding:"56px 36px"}}>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:30}}>
            <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>// security</div>
              <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em"}}>Built for engineers who don't trust anyone.</h2>
            </div>
            <button onClick={()=>go("security")} style={{background:"none",border:`1px solid ${C.border}`,color:C.amber,fontFamily:mono,fontSize:12,padding:"8px 16px",borderRadius:6,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              full details →
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.border,borderRadius:10,overflow:"hidden"}}>
            {[["🔐","AES-256 encrypted","Credentials encrypted before storage."],
              ["🚫","Never logged","Scrubbed from all logs at infrastructure level."],
              ["👤","No human access","Technically impossible for our team to read your credentials."],
              ["📦","Bug data never stored","Flows through and discarded after each analysis."],
              ["⚙️","Server-side only","Your Secret never appears in browser code after setup."],
              ["🔑","Revoke any time","Delete credentials instantly from Settings."],
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

      <div style={{maxWidth:1140,margin:"0 auto",padding:"60px 36px 72px"}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"52px 44px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:44,alignItems:"center"}}>
          <div>
            <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12}}>// start now</div>
            <h2 style={{fontSize:30,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:12}}>Know what's broken before it breaks you.</h2>
            <p style={{fontSize:14,color:C.dim,lineHeight:1.8}}>Free tier needs no account. Enterprise runs in your own infrastructure.</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {!done ? <>
              <div style={{fontFamily:mono,fontSize:11,color:C.muted}}>$ notify_me --on launch</div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com"
                style={{background:C.hi,border:`1px solid ${C.border}`,color:C.text,fontFamily:mono,fontSize:13,padding:"10px 13px",borderRadius:6,outline:"none"}}/>
              <button onClick={()=>email&&setDone(true)} style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"11px",cursor:"pointer"}}>notify_me()</button>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>go("analyse")} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"9px",cursor:"pointer"}}>try_free()</button>
                <button style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"9px",cursor:"pointer"}}>docker_pull()</button>
              </div>
            </> : (
              <div style={{background:"#0A2A10",border:`1px solid ${C.green}44`,borderRadius:8,padding:22,textAlign:"center"}}>
                <div style={{fontFamily:mono,fontSize:14,color:C.green,marginBottom:5}}>✓ notify_me() registered</div>
                <div style={{fontSize:13,color:C.dim}}>We will email you when enterprise launches.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer style={{borderTop:`1px solid ${C.border}`,padding:"22px 36px"}}>
        <div style={{maxWidth:1140,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:mono,fontSize:14,fontWeight:700}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
          <div style={{display:"flex",gap:18}}>
            {["privacy","terms","security","glossary","contact"].map(l=>(
              <button key={l} style={{background:"none",border:"none",color:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer",letterSpacing:"0.04em"}}>{l}</button>
            ))}
          </div>
          <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>// informational use only</span>
        </div>
      </footer>
    </div>
  );
}

const SAMPLE = `Platform, Version, Role
Nexus 9336C-FX2, 10.2(3), Spine
Nexus 9336C-FX2, 10.2(3), Spine
Nexus 93180YC-EX, 9.3(8), Leaf
Nexus 93180YC-EX, 9.3(5), Leaf
Nexus 9300-EX, 9.3(3), Leaf
Catalyst 9500, 17.6.1, Distribution
Firepower 4140, 7.0.1, Firewall`;

const STEPS = [
  {l:"Parsing inventory",           d:600},
  {l:"Identifying platforms",        d:700},
  {l:"Checking bug patterns",        d:900},
  {l:"Cross-referencing advisories", d:800},
  {l:"Running AI analysis",          d:1200},
  {l:"Generating remediation plan",  d:700},
];

function Overlay({step}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#080806EE",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"36px 44px",width:460,boxShadow:`0 0 60px ${C.amber}12`}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:18}}>// analyzing fabric</div>
        {STEPS.map((s,i)=>{
          const done=i<step,active=i===step;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:11,marginBottom:11,opacity:i>step?.3:1,transition:"opacity .3s"}}>
              <div style={{width:19,height:19,borderRadius:"50%",background:done?C.green:active?C.amber:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:done||active?"#000":C.muted,flexShrink:0,transition:"all .3s"}}>
                {done?"✓":active?"●":""}
              </div>
              <span style={{fontFamily:mono,fontSize:13,color:done?C.dim:active?C.text:C.muted}}>{s.l}{active?"...":""}</span>
              {done&&<span style={{fontFamily:mono,fontSize:11,color:C.green,marginLeft:"auto"}}>done</span>}
            </div>
          );
        })}
        <div style={{background:C.faint,borderRadius:4,height:3,marginTop:14,overflow:"hidden"}}>
          <div style={{height:"100%",background:C.amber,width:`${(step/STEPS.length)*100}%`,transition:"width .5s",borderRadius:4}}/>
        </div>
        <div style={{fontFamily:mono,fontSize:11,color:C.muted,marginTop:7,textAlign:"right"}}>{Math.round((step/STEPS.length)*100)}% complete</div>
      </div>
    </div>
  );
}

function Results({data,reset,go}) {
  if(!data) return (
    <div style={{textAlign:"center",padding:"40px"}}>
      <div style={{fontFamily:mono,fontSize:14,color:C.red,marginBottom:12}}>// analysis error</div>
      <div style={{fontSize:13,color:C.dim,marginBottom:20}}>Something went wrong. Please try again.</div>
      <button onClick={reset} style={{background:C.amber,border:"none",color:"#000",fontFamily:mono,fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:6,cursor:"pointer"}}>← try_again()</button>
    </div>
  );

  const fa = data.fabricAnalysis || {};
  const ni = data.netwrkrIntel || {};
  const devices = data.devices || [];
  const faRisk = SEV[fa.risk]||SEV.LOW;
  const hasVerified = ni.items?.some(i=>i.verified);
  const GlossaryLink = () => <InfoIcon onClick={()=>go("glossary")}/>;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>// analysis complete</div>
        <div style={{display:"flex",gap:9}}>
          <button onClick={reset} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"7px 13px",borderRadius:6,cursor:"pointer"}}>← new_analysis()</button>
          <button style={{background:C.amber,border:"none",color:"#000",fontFamily:mono,fontSize:12,fontWeight:700,padding:"7px 13px",borderRadius:6,cursor:"pointer"}}>export_report()</button>
        </div>
      </div>

      {data.priorityAssessment?.items?.length>0&&(
        <div style={{background:C.surface,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"18px 22px",marginBottom:12}}>
          <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14,display:"flex",alignItems:"center"}}>
            // priority assessment <GlossaryLink/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {data.priorityAssessment.items.map((item,i)=>{
              const pColor = item.priority==="P1"?C.red:item.priority==="P2"?C.orange:C.yellow;
              return (
                <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:28,height:28,borderRadius:6,background:`${pColor}18`,border:`1px solid ${pColor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:11,fontWeight:700,color:pColor,flexShrink:0}}>{item.priority}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{item.title}</div>
                    <div style={{fontSize:12,color:C.dim,lineHeight:1.6,marginBottom:4}}>{item.reason}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {item.devices?.map((d,di)=>(
                        <span key={di} style={{fontFamily:mono,fontSize:10,color:C.muted,background:C.faint,padding:"1px 7px",borderRadius:3}}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{background:faRisk.bg,border:`1px solid ${faRisk.bd}`,borderRadius:10,padding:"18px 22px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:faRisk.color,boxShadow:`0 0 6px ${faRisk.color}`}}/>
            <div style={{fontFamily:mono,fontSize:11,color:faRisk.color,letterSpacing:"0.12em",textTransform:"uppercase",display:"flex",alignItems:"center"}}>
              // fabric analysis <GlossaryLink/>
            </div>
          </div>
          <Badge level={fa.risk||"LOW"}/>
        </div>
        <div style={{fontSize:13,color:C.dim,marginBottom:fa.findings?.length?12:0,fontStyle:"italic"}}>Facts derived directly from your submitted inventory.</div>
        {fa.findings?.map((f,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
            <span style={{color:faRisk.color,fontFamily:mono,fontSize:12,flexShrink:0,marginTop:1}}>→</span>
            <span style={{fontSize:13,color:C.text,lineHeight:1.6}}>{f}</span>
          </div>
        ))}
        {fa.mismatches?.length>0&&(
          <div style={{marginTop:10,padding:"10px 13px",background:"#2A140088",border:`1px solid ${C.orange}44`,borderRadius:6}}>
            <div style={{fontFamily:mono,fontSize:11,color:C.orange,marginBottom:6,display:"flex",alignItems:"center"}}>
              // version mismatches detected <GlossaryLink/>
            </div>
            {fa.mismatches.map((m,i)=><div key={i} style={{fontSize:12,color:C.dim}}>{m}</div>)}
          </div>
        )}
      </div>

      {ni.hasIntel&&ni.items?.length>0&&(
        <div style={{background:C.surface,border:`1px solid ${C.amber}33`,borderRadius:10,padding:"18px 22px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:14}}>🔍</span>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",display:"flex",alignItems:"center"}}>
                // netwrkr intel <GlossaryLink/>
              </div>
            </div>
            {hasVerified
              ? <span style={{fontFamily:mono,fontSize:10,color:C.green,background:"#0A2A1088",border:`1px solid ${C.green}44`,padding:"2px 8px",borderRadius:3}}>✓ live PSIRT data</span>
              : <span style={{fontFamily:mono,fontSize:10,color:C.orange,background:"#2A140088",border:`1px solid ${C.orange}44`,padding:"2px 8px",borderRadius:3}}>⚠ unverified</span>
            }
          </div>
          <div style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.6}}>
            {hasVerified
              ? <>Verified advisories sourced from the live Cisco PSIRT API. Unverified items are from AI training knowledge — <span style={{color:C.amber}}>Upgrade to enterprise</span> for full fabric exposure analysis.</>
              : <>Potential software issues inferred from known version history. <span style={{color:C.amber}}>Upgrade to enterprise</span> for verified CSC data from the live Cisco Bug API.</>
            }
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ni.items.map((item,i)=>(
              <div key={i} style={{border:`1px solid ${item.verified?C.green+"44":C.border}`,borderRadius:8,padding:"11px 14px",background:C.hi,opacity:item.verified?1:0.85}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <Badge level={item.sev} sm/>
                    <span style={{fontFamily:mono,fontSize:12,color:C.text,fontWeight:600}}>{item.title}</span>
                    {item.id&&<span style={{fontFamily:mono,fontSize:10,color:C.amber,background:C.amberG,border:`1px solid ${C.amber}30`,padding:"1px 6px",borderRadius:3}}>{item.id}</span>}
                  </div>
                  <span style={{fontFamily:mono,fontSize:10,color:C.muted,flexShrink:0}}>{item.platform} v{item.version}</span>
                </div>
                <div style={{fontSize:12,color:C.dim,lineHeight:1.6,marginBottom:8}}>{item.detail}</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  {item.verified
                    ? <span style={{fontFamily:mono,fontSize:10,color:C.green}}>✓ verified — Cisco PSIRT API</span>
                    : <span style={{fontFamily:mono,fontSize:10,color:C.orange}}>⚠ unverified — AI knowledge only</span>
                  }
                  {!item.verified &&
                    <button style={{background:"none",border:`1px solid ${C.amber}44`,color:C.amber,fontFamily:mono,fontSize:10,padding:"2px 8px",borderRadius:3,cursor:"pointer"}}>🔒 verify with enterprise</button>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{fontFamily:mono,fontSize:11,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:9,display:"flex",alignItems:"center"}}>
        // device breakdown <GlossaryLink/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:16}}>
        {devices.map((d,di)=>{
          const fds=SEV[d.fabricRisk]||SEV.LOW;
          return (
            <div key={di} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 18px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:fds.color,boxShadow:`0 0 5px ${fds.color}`,flexShrink:0}}/>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:600,fontSize:14}}>{d.name}</span>
                      <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>v{d.ver}</span>
                      <span style={{fontFamily:mono,fontSize:10,color:C.muted,background:C.faint,padding:"1px 7px",borderRadius:3}}>{d.role}</span>
                    </div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>{d.rec}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:3}}>fabric</div>
                    <Badge level={d.fabricRisk||"LOW"}/>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:3}}>intel</div>
                    <Badge level={d.intelRisk||"LOW"}/>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{background:C.amberG,border:`1px solid ${C.amber}33`,borderRadius:10,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18}}>
        <div>
          <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:4,display:"flex",alignItems:"center"}}>
            // unlock verified fabric exposure analysis <GlossaryLink/>
          </div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>Enterprise adds live Cisco Bug API data — verified CSC IDs and confirmed fabric exposure analysis.</div>
        </div>
        <button style={{background:C.amber,border:"none",color:"#000",fontFamily:mono,fontSize:12,fontWeight:700,padding:"9px 16px",borderRadius:6,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>get_enterprise()</button>
      </div>
    </div>
  );
}

function Analyse({go}) {
  const [screen,setScreen]       = useState("paste");
  const [rawInput,setRawInput]   = useState("");
  const [ctx,setCtx]             = useState("");
  const [parsing,setParsing]     = useState(false);
  const [devices,setDevices]     = useState([]);
  const [step,setStep]           = useState(0);
  const [results,setResults]     = useState(null);
  const ref                      = useRef();

  const apiKey = () => process.env.REACT_APP_ANTHROPIC_API_KEY || "";

  const callClaude = async (prompt, maxTokens=1000) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":apiKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,messages:[{role:"user",content:prompt}]})
    });
    const data = await res.json();
    return data.content[0].text;
  };

  const parseInput = async () => {
    if(!rawInput.trim()) return;
    setParsing(true);
    try {
      const text = await callClaude(`You are a data extraction engine for a Cisco network analysis tool.

Extract all network devices from the text below. For each device return:
- name: the Cisco platform name (e.g. "Nexus 9336C-FX2", "Catalyst 9500")
- ver: the exact software version string if explicitly present (e.g. "9.3(9)", "17.9.4") — if NOT present in the text set to ""
- role: the device role if present (e.g. "Spine", "Leaf", "Border Leaf", "Distribution") — if not present set to ""

IMPORTANT: Only extract versions that are explicitly written in the text. Do not guess or infer versions from platform names.

Return ONLY a JSON array, no markdown, no explanation:
[{"name":"...","ver":"...","role":"..."}]

Text to parse:
${rawInput}`);

      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      const withFlags = parsed.map(d=>({...d, verMissing:!d.ver.trim()}));
      setDevices(withFlags);
      setScreen("review");
    } catch(e) {
      console.error(e);
    }
    setParsing(false);
  };

  const updateDevice = (i, field, val) => {
    setDevices(prev => prev.map((d,idx) => idx===i ? {...d,[field]:val, verMissing:field==="ver"?!val.trim():d.verMissing} : d));
  };
  const removeDevice = (i) => setDevices(prev=>prev.filter((_,idx)=>idx!==i));

  const missingVersions = devices.filter(d=>d.verMissing).length;
  const canAnalyse = devices.length > 0;

  const fetchAdvisories = async (devList) => {
    const results = {};
    await Promise.all(devList.map(async (d) => {
      if (!d.ver || d.ver === "not provided") return;
      try {
        const res = await fetch("/api/advisories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: d.name, version: d.ver, impact: "" })
        });
        const data = await res.json();
        if (data.advisories?.length > 0) {
          results[`${d.name}__${d.ver}`] = data.advisories;
        }
      } catch(e) {
        console.error("Advisory fetch failed for", d.name, e);
      }
    }));
    return results;
  };

  const runAnalysis = async () => {
    setScreen("analysing"); setStep(0);
    let s=0;
    const timer = setInterval(()=>{ if(s<STEPS.length-1){s++;setStep(s);} },900);

    const inventoryCsv = "Platform, Version, Role\n" + devices.map(d=>`${d.name}, ${d.ver||"not provided"}, ${d.role||"unknown"}`).join("\n");

    const advisoryData = await fetchAdvisories(devices);
    const advisorySummary = Object.entries(advisoryData).map(([key, advisories]) => {
      const [platform, version] = key.split("__");
      const high = advisories.filter(a => a.impact === "High");
      const med = advisories.filter(a => a.impact === "Medium");
      return `${platform} v${version}: ${advisories.length} advisories (${high.length} High, ${med.length} Medium). Top issues: ${advisories.slice(0,3).map(a => `${a.id} — ${a.title} [fixed in ${a.firstFixed}]`).join("; ")}`;
    }).join("\n") || "No Cisco advisory data retrieved.";

    try {
      const text = await callClaude(`You are netwrkr.ai, an expert Cisco data centre network engineer.

ABSOLUTE RULES:
1. ONLY report bug findings for devices where a version is EXPLICITLY provided. If ver is "not provided" set bugs to [].
2. NEVER infer or guess software versions from platform names or roles.
3. Version mismatches can ONLY be reported when multiple devices of the same type show DIFFERENT explicit versions.
4. Every finding must end with [observed], [inferred], or [assumed].
5. [observed] = directly from the data. [inferred] = logical conclusion. [assumed] = no evidence, low confidence only.
6. CRITICAL or HIGH severity requires explicit version evidence. No version = maximum MEDIUM risk.
7. If any device has ver="not provided", include this finding: "Software version not provided for X device(s) — bug and CVE analysis unavailable for those devices [observed]"
8. NEVER add devices that are not in the submitted inventory. The devices array must contain EXACTLY the same devices as the submitted inventory — no additions, no omissions. Every device in the inventory must appear exactly once.
9. Sort devices in the output by infrastructure tier in this strict order: Controllers (APIC, DNAC, NSO) → Spine → Border Leaf → Leaf → Distribution/Firewall/Edge.
10. Identify Border Leaf from: device name or role containing "BORDER-LEAF", "BORDER_LEAF", "Border Leaf", "border-leaf", or "BL-". Border Leaf sits between Spine and regular Leaf in the sort order. Assign tier:2 to Border Leaf (same numeric tier as Spine but sort after Spine).
11. Border Leaf devices must have intelRisk "HIGH" minimum — they handle external routing, BGP adjacency, and WAN-facing traffic. Do not cap Border Leaf at MEDIUM.
12. Tier 4 devices (Distribution, Firewall, Catalyst, Firepower) must never exceed intelRisk "MEDIUM".
13. APIC controllers always appear first in the devices array, before Spines.
14. Controllers (APIC, DNAC, NSO) must have fabricRisk "LOW" unless there is a version mismatch between the controllers themselves. A version mismatch elsewhere in the fabric (e.g. spine vs leaf) does not elevate controller fabricRisk.
15. Border Leaf device recommendations must never use directive upgrade language (e.g. "Upgrade to match spine version"). Instead use advisory language such as "Review upgrade target against current fabric baseline" or "Assess version alignment before next maintenance window".
16. P1/P2/P3 priority assessment titles must never contain the word "Critical" — use "High priority", "Significant", "Security advisory", or similar instead.
17. fabricAnalysis findings must never reference advisory counts, CVEs, or bug data — topology facts from the submitted inventory only.

INFRASTRUCTURE TIER GUIDE:
- Tier 1: Controllers — APIC, DNAC, NSO (always first, shapes entire upgrade path)
- Tier 2a: Spine — core fabric stability
- Tier 2b: Border Leaf — external routing, BGP, WAN-facing (MORE sensitive than regular leaf, HIGH intel minimum)
- Tier 3: Leaf — forwarding fabric
- Tier 4: Distribution, Firewall, Catalyst, Firepower (cap intel at MEDIUM)

Validated device inventory (engineer-confirmed):
${inventoryCsv}

Additional context: ${ctx||"None provided"}

VERIFIED CISCO SECURITY ADVISORIES (real data from Cisco PSIRT API):
${advisorySummary}

CRITICAL: Use the VERIFIED CISCO SECURITY ADVISORIES above to populate netwrkrIntel items. For ANY platform that appears in that section, you MUST set verified: true and use the exact advisory ID provided. Only set verified: false for platforms where NO advisory data was retrieved. Setting verified: false for a platform that appears in the advisory data above is an error.

Respond ONLY with valid JSON (no markdown):
{
  "priorityAssessment": {
    "items": [
      {"priority": "P1", "title": "title", "reason": "one line reason", "devices": ["device names"]},
      {"priority": "P2", "title": "title", "reason": "one line reason", "devices": ["device names"]},
      {"priority": "P3", "title": "title", "reason": "one line reason", "devices": ["device names"]}
    ]
  },
  "fabricAnalysis": {
    "risk": "LOW|MEDIUM|HIGH",
    "consistent": false,
    "mismatches": ["Platform: version1 vs version2 — description [observed]"],
    "missingVersions": [],
    "findings": ["finding [observed|inferred]"]
  },
  "netwrkrIntel": {
    "hasIntel": true,
    "summary": "brief summary of intel available",
    "items": [{"platform":"","version":"","title":"","detail":"","id":"","verified":false,"sev":"MEDIUM"}]
  },
  "devices": [{"name":"","ver":"","role":"","tier":1,"fabricRisk":"LOW","intelRisk":"LOW","rec":""}]
}`, 4000);

      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);

      const realIds = new Set(
        Object.values(advisoryData).flat().map(a => a.id).filter(Boolean)
      );
      if (parsed.netwrkrIntel?.items) {
        parsed.netwrkrIntel.items = parsed.netwrkrIntel.items.map(item => ({
          ...item,
          verified: realIds.has(item.id) ? true : item.verified
        }));
      }

      clearInterval(timer);
      setStep(STEPS.length);
      setResults(parsed);
      setScreen("results");
    } catch(e) {
      clearInterval(timer);
      setResults(null);
      setScreen("results");
      console.error(e);
    }
  };

  const reset = () => { setScreen("paste"); setRawInput(""); setDevices([]); setCtx(""); setResults(null); setStep(0); };

  const inp = {fontFamily:mono,fontSize:13,background:C.hi,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"11px 13px",width:"100%",outline:"none",lineHeight:1.7};

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"34px 36px"}}>
      {screen==="analysing" && <Overlay step={step}/>}

      {screen==="paste" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:20,alignItems:"start"}}>
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>// step 1 of 3</div>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:"-0.03em",marginBottom:4}}>Paste your inventory</h1>
              <p style={{fontSize:13,color:C.dim,lineHeight:1.7}}>Paste anything — a CSV, a spreadsheet column, show version output, or just type your devices. We will extract what we need and ask you to confirm before running.</p>
            </div>

            <div
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const r=new FileReader();r.onload=ev=>setRawInput(ev.target.result);r.readAsText(f);}}}
              style={{border:`1px dashed ${rawInput?C.amber:C.border}`,borderRadius:10,marginBottom:11,transition:"border-color 0.2s",padding:"6px"}}>
              <div style={{position:"relative"}}>
                <textarea
                  value={rawInput}
                  onChange={e=>setRawInput(e.target.value)}
                  rows={12}
                  placeholder="Paste anything — CSV, spreadsheet, show version output, or free text..."
                  style={{...inp,borderRadius:8,resize:"vertical"}}
                />
                {rawInput && (
                  <button onClick={()=>setRawInput("")} style={{position:"absolute",top:9,right:9,background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontFamily:mono,fontSize:11,padding:"3px 9px",borderRadius:4,cursor:"pointer"}}>clear</button>
                )}
              </div>
            </div>

            <input ref={ref} type="file" accept=".csv,.txt,.log" onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setRawInput(ev.target.result);r.readAsText(f);}}} style={{display:"none"}}/>

            <div style={{display:"flex",gap:9,marginBottom:11}}>
              <button onClick={()=>setRawInput(SAMPLE)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"8px",borderRadius:6,cursor:"pointer"}}>load_sample()</button>
              <button onClick={()=>ref.current?.click()} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"8px",borderRadius:6,cursor:"pointer"}}>upload_file()</button>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>CONTEXT <span style={{color:C.faint}}> // optional — improves accuracy</span></label>
              <textarea value={ctx} onChange={e=>setCtx(e.target.value)} rows={2} placeholder="e.g. VXLAN/EVPN fabric, vPC pairs on leaf layer, maintenance window Saturday 02:00 UTC" style={{...inp,resize:"none"}}/>
            </div>

            <button onClick={parseInput} disabled={!rawInput.trim()||parsing}
              style={{background:rawInput.trim()&&!parsing?C.amber:"#5A4800",color:"#000",border:"none",borderRadius:8,fontFamily:mono,fontWeight:700,fontSize:14,padding:"13px",cursor:rawInput.trim()&&!parsing?"pointer":"not-allowed",width:"100%",opacity:rawInput.trim()&&!parsing?1:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {parsing
                ? <><span style={{width:14,height:14,border:"2px solid #00000033",borderTopColor:"#000",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> extracting_devices()</>
                : "extract_devices() →"}
            </button>
            <div style={{fontFamily:mono,fontSize:11,color:C.muted,textAlign:"center",marginTop:7}}>// we will show you what we found before running</div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>// works with anything</div>
              {[
                ["CSV file","Platform, Version, Role columns"],
                ["Spreadsheet paste","Any column order"],
                ["show version output","Cisco CLI output"],
                ["Free text","4 spines on 10.2(4)"],
                ["DCIM export","Most formats supported"],
              ].map(([t,s])=>(
                <div key={t} style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{color:C.amber,flexShrink:0,fontFamily:mono,fontSize:11}}>→</span>
                  <div><div style={{fontSize:13,fontWeight:500}}>{t}</div><div style={{fontSize:11,color:C.muted}}>{s}</div></div>
                </div>
              ))}
            </div>
            <div style={{background:C.greenG,border:`1px solid ${C.green}30`,borderRadius:10,padding:"11px 13px"}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.green,marginBottom:5}}>// privacy</div>
              <div style={{fontSize:12,color:C.dim,lineHeight:1.7}}>No hostnames, IPs, or credentials needed. Results are never stored.</div>
            </div>
          </div>
        </div>
      )}

      {screen==="review" && (
        <div style={{animation:"fadeUp 0.3s ease"}}>
          <div style={{marginBottom:22}}>
            <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>// step 2 of 3</div>
            <h1 style={{fontSize:24,fontWeight:300,letterSpacing:"-0.03em",marginBottom:4}}>Confirm your devices</h1>
            <p style={{fontSize:13,color:C.dim,lineHeight:1.7}}>We found {devices.length} device{devices.length!==1?"s":""}. Check the details are correct — especially software versions — then run the analysis.</p>
          </div>

          {missingVersions > 0 && (
            <div style={{background:"#2A1400",border:`1px solid ${C.orange}44`,borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{color:C.orange,fontSize:16,flexShrink:0}}>⚠</span>
              <div>
                <div style={{fontFamily:mono,fontSize:12,color:C.orange,marginBottom:3}}>// {missingVersions} device{missingVersions!==1?"s":""} missing version</div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>Bug and CVE analysis requires software version. Add versions below or run without them — missing versions will be clearly flagged in results.</div>
              </div>
            </div>
          )}

          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 32px",gap:0,background:C.hi,padding:"10px 16px",borderBottom:`1px solid ${C.border}`}}>
              {["PLATFORM","VERSION","ROLE",""].map(h=><div key={h} style={{fontFamily:mono,fontSize:10,color:C.muted,letterSpacing:"0.1em"}}>{h}</div>)}
            </div>
            {devices.map((d,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 32px",gap:0,padding:"10px 16px",borderBottom:`1px solid ${C.border}`,alignItems:"center",background:d.verMissing?"#2A140022":"transparent"}}>
                <div style={{fontFamily:mono,fontSize:13,color:C.text,paddingRight:8}}>{d.name}</div>
                <div style={{paddingRight:8}}>
                  <input value={d.ver} onChange={e=>updateDevice(i,"ver",e.target.value)} placeholder="e.g. 9.3(9)"
                    style={{background:d.verMissing?C.hi:"transparent",border:`1px solid ${d.verMissing?C.orange:C.border}`,color:d.verMissing?C.orange:C.text,fontFamily:mono,fontSize:12,padding:"4px 8px",borderRadius:4,outline:"none",width:"100%"}}/>
                </div>
                <div style={{paddingRight:8}}>
                  <input value={d.role} onChange={e=>updateDevice(i,"role",e.target.value)} placeholder="e.g. Leaf"
                    style={{background:"transparent",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"4px 8px",borderRadius:4,outline:"none",width:"100%"}}/>
                </div>
                <button onClick={()=>removeDevice(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:"2px"}}>✕</button>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setScreen("paste")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:13,padding:"12px 20px",borderRadius:8,cursor:"pointer"}}>
              ← back()
            </button>
            <button onClick={runAnalysis} disabled={!canAnalyse}
              style={{flex:1,background:canAnalyse?C.amber:"#5A4800",color:"#000",border:"none",borderRadius:8,fontFamily:mono,fontWeight:700,fontSize:14,padding:"13px",cursor:canAnalyse?"pointer":"not-allowed",opacity:canAnalyse?1:.5}}>
              run_analysis() →
            </button>
          </div>
          <div style={{fontFamily:mono,fontSize:11,color:C.muted,textAlign:"center",marginTop:7}}>
            {missingVersions>0 ? `// ${missingVersions} device${missingVersions!==1?"s":""} will be analysed for topology issues only` : "// all devices have version data — full analysis enabled"}
          </div>
        </div>
      )}

      {screen==="results" && results && (
        <Results data={results} reset={reset} go={go}/>
      )}
    </div>
  );
}

const SECS = [
  {ic:"🔐",t:"Encrypted at rest",      tag:"AES-256",         s:"AES-256-GCM encryption before storage. Unreadable without a separately managed key.",    d:["Encryption uses AES-256-GCM before any write to storage.","Key stored separately in a dedicated secrets management service.","Even in a breach, credentials are unreadable without the key.","Keys are rotated regularly using industry-standard practices."]},
  {ic:"🚫",t:"Never logged",           tag:"zero logging",    s:"Credential values are scrubbed from all logs at infrastructure level — not just application code.",    d:["Authorization headers scrubbed before logs are written.","Applies to application, access, error logs, and third-party monitoring.","Enforced at infrastructure level — cannot be bypassed by a code change.","We retain anonymised request metadata only — never credential values."]},
  {ic:"👤",t:"No human access",        tag:"zero visibility", s:"The encryption architecture makes it technically impossible for our team to read your credentials.",    d:["Credentials encrypted using a key not accessible to engineering in normal operations.","No view credentials admin function exists anywhere in our tooling.","Any key access attempt generates an alert and requires multi-party approval.","We cannot recover your credentials if lost — you would regenerate on Cisco API Console."]},
  {ic:"📦",t:"Bug data never stored",  tag:"minimal data",    s:"Analysis results flow through and are discarded after each request. Only email and encrypted credentials persist.",    d:["Bug API results, inventory, and analysis output never written to our database.","Data flows through the request lifecycle and is discarded on completion.","Only email, hashed password, and encrypted credentials are persisted.","Minimises exposure — no inventory or analysis history to exfiltrate."]},
  {ic:"⚙️",t:"Server-side only",       tag:"credentials stay server-side", s:"All Cisco API calls originate from our servers. Your Client Secret never appears in browser code after setup.",    d:["Credentials sent to our backend over HTTPS once, then immediately encrypted.","Never stored in your browser, localStorage, or any client-side state.","All Cisco API calls originate from our servers — never from your browser.","Your Secret never appears in network tabs or browser developer tools after setup."]},
  {ic:"🔑",t:"Revoke any time",        tag:"you are in control",s:"Delete credentials or your entire account from Settings at any time. Takes effect immediately.",    d:["Settings credentials deletion immediately removes the encrypted record.","Account deletion removes all data we hold, permanently and immediately.","We also recommend revoking the app registration on Cisco API Console.","Deletion is irreversible — we have no way to recover deleted data."]},
  {ic:"🛡️",t:"Never sold or shared",  tag:"no third parties", s:"We do not sell, share, or license your data to any third party, ever.",    d:["Your data is used solely to provide the netwrkr.ai service.","We do not share credentials or usage data with any third party except Cisco API itself.","Third-party infrastructure providers are contractually prohibited from accessing your data.","We only disclose data in response to a valid legal requirement."]},
];

function SecurityPage() {
  const [exp,setExp]=useState(null);
  return (
    <div style={{maxWidth:860,margin:"0 auto",padding:"0 36px"}}>
      <div style={{padding:"56px 0 40px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:12}}>// security.md</div>
        <h1 style={{fontSize:38,fontWeight:300,letterSpacing:"-0.04em",lineHeight:1.1,marginBottom:14}}>Your data.<br/><span style={{color:C.amber}}>Your control.</span></h1>
        <p style={{fontSize:15,color:C.dim,lineHeight:1.8,maxWidth:520}}>The free tier needs nothing sensitive — just platform names and software versions. No credentials, no hostnames, no IP addresses. Here is exactly how we handle what you share with us.</p>
        <div style={{display:"flex",gap:7,marginTop:20,flexWrap:"wrap"}}>
          {["AES-256 encrypted","zero logging","server-side only","no human access","revoke anytime"].map(t=><Pill key={t}>{t}</Pill>)}
        </div>
      </div>
      <div style={{padding:"40px 0"}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:20}}>// seven commitments — click any to expand</div>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {SECS.map(p=>{
            const open=exp===p.t;
            return (
              <div key={p.t} onClick={()=>setExp(open?null:p.t)}
                style={{background:C.surface,border:`1px solid ${open?C.amber+"44":C.border}`,borderRadius:10,overflow:"hidden",cursor:"pointer",transition:"border-color .2s"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:13}}>
                    <div style={{width:36,height:36,borderRadius:8,background:C.amberG,border:`1px solid ${C.amber}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{p.ic}</div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:3}}>
                        <span style={{fontWeight:600,fontSize:14}}>{p.t}</span>
                        <Pill>{p.tag}</Pill>
                      </div>
                      <div style={{fontSize:13,color:C.dim,lineHeight:1.5}}>{p.s}</div>
                    </div>
                  </div>
                  <span style={{fontFamily:mono,fontSize:11,color:C.muted,flexShrink:0,marginLeft:14}}>{open?"▲":"▼"}</span>
                </div>
                {open&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"16px 20px",background:C.hi}}>
                    <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:10}}>// technical detail</div>
                    {p.d.map((d,i)=>(
                      <div key={i} style={{display:"flex",gap:9,marginBottom:9,alignItems:"flex-start"}}>
                        <span style={{color:C.amber,fontFamily:mono,fontSize:12,flexShrink:0,marginTop:1}}>→</span>
                        <span style={{fontSize:13,color:C.dim,lineHeight:1.7}}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"26px 32px",marginBottom:60,display:"flex",alignItems:"center",justifyContent:"space-between",gap:20}}>
        <div>
          <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:7}}>// security concerns</div>
          <h3 style={{fontSize:16,fontWeight:600,letterSpacing:"-0.02em",marginBottom:5}}>Found a security issue?</h3>
          <p style={{fontSize:13,color:C.dim}}>We take all reports seriously and respond within 24 hours.</p>
        </div>
        <button style={{background:C.amber,color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"10px 20px",cursor:"pointer",flexShrink:0}}>security@netwrkr.ai</button>
      </div>
    </div>
  );
}

function GHIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>;
}
function GGIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;
}

function Auth({mode:init,go,setAuthed}) {
  const [mode,setMode]=useState(init);
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(null);
  const [sent,setSent]=useState(false);

  const str = pw.length===0?0:pw.length<6?1:pw.length<8?2:pw.length<12?3:4;
  const strC = ["",C.red,"#EAB308",C.amber,C.green][str];
  const strL = ["","weak","fair","good","strong"][str];
  const match = pw&&pw2&&pw===pw2;

  const submit=p=>{
    setLoading(p);
    setTimeout(()=>{setLoading(null);setAuthed(true);go("analyse");},1500);
  };

  const inp = {background:C.hi,border:`1px solid ${C.border}`,color:C.text,fontFamily:mono,fontSize:13,padding:"10px 13px",borderRadius:6,outline:"none",width:"100%"};
  const sso = (p,icon,label) => (
    <button onClick={()=>submit(p)} disabled={!!loading}
      style={{background:C.hi,border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"10px",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
      {loading===p?<span style={{width:12,height:12,border:`2px solid ${C.border}`,borderTopColor:C.amber,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>:icon}
      {label}
    </button>
  );
  const divider = <div style={{display:"flex",alignItems:"center",gap:10,margin:"2px 0"}}>
    <div style={{flex:1,height:1,background:C.border}}/><span style={{fontFamily:mono,fontSize:11,color:C.muted}}>or</span><div style={{flex:1,height:1,background:C.border}}/>
  </div>;
  const lnk=(label,fn)=><button onClick={fn} style={{background:"none",border:"none",color:C.amber,fontFamily:mono,fontSize:11,cursor:"pointer",padding:0}}>{label}</button>;

  return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"44px 20px"}}>
      <div style={{width:"100%",maxWidth:370}}>
        {mode==="login"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:26}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:7}}>// sign_in()</div>
              <h1 style={{fontSize:23,fontWeight:300,letterSpacing:"-0.03em",marginBottom:3}}>Welcome back</h1>
              <p style={{fontSize:13,color:C.dim}}>Sign in to your netwrkr.ai account</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
              {sso("google",<GGIcon/>,"continue_with_google()")}
              {sso("github",<GHIcon/>,"continue_with_github()")}
            </div>
            {divider}
            <div style={{display:"flex",flexDirection:"column",gap:11,margin:"14px 0"}}>
              <div>
                <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>EMAIL</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={inp}/>
              </div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <label style={{fontFamily:mono,fontSize:11,color:C.muted,letterSpacing:"0.08em"}}>PASSWORD</label>
                  {lnk("forgot_password()",()=>setMode("forgot"))}
                </div>
                <div style={{position:"relative"}}>
                  <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={inp}/>
                  <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer"}}>{show?"hide":"show"}</button>
                </div>
              </div>
            </div>
            <button onClick={()=>submit("email")} disabled={!email||!pw||!!loading}
              style={{background:email&&pw&&!loading?C.amber:"#5A4800",color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"11px",cursor:"pointer",width:"100%",opacity:email&&pw&&!loading?1:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading==="email"?<><span style={{width:12,height:12,border:"2px solid #00000033",borderTopColor:"#000",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>signing_in()</>:"sign_in()"}
            </button>
            <div style={{marginTop:13,textAlign:"center",fontFamily:mono,fontSize:11,color:C.muted}}>
              no account? {lnk("create_account()",()=>setMode("signup"))}
            </div>
          </div>
        )}

        {mode==="signup"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:26}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:7}}>// create_account()</div>
              <h1 style={{fontSize:23,fontWeight:300,letterSpacing:"-0.03em",marginBottom:3}}>Get started free</h1>
              <p style={{fontSize:13,color:C.dim}}>10 analyses/month. No credit card required.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
              {sso("google",<GGIcon/>,"continue_with_google()")}
              {sso("github",<GHIcon/>,"continue_with_github()")}
            </div>
            {divider}
            <div style={{display:"flex",flexDirection:"column",gap:11,margin:"14px 0"}}>
              <div>
                <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>EMAIL</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={inp}/>
              </div>
              <div>
                <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>PASSWORD</label>
                <div style={{position:"relative"}}>
                  <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="min. 8 characters" style={inp}/>
                  <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer"}}>{show?"hide":"show"}</button>
                </div>
                {pw&&<div style={{marginTop:6,display:"flex",alignItems:"center",gap:5}}>{[1,2,3,4].map(i=><div key={i} style={{height:3,flex:1,borderRadius:2,background:i<=str?strC:C.border,transition:"background .2s"}}/>)}<span style={{fontFamily:mono,fontSize:10,color:strC,width:34}}>{strL}</span></div>}
              </div>
              <div>
                <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>CONFIRM PASSWORD</label>
                <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" style={{...inp,borderColor:pw2&&!match?C.red:C.border}}/>
                {pw2&&!match&&<div style={{fontFamily:mono,fontSize:11,color:C.red,marginTop:4}}>// passwords do not match</div>}
              </div>
            </div>
            <button onClick={()=>submit("email")} disabled={!email||!match||pw.length<8||!!loading}
              style={{background:email&&match&&pw.length>=8&&!loading?C.amber:"#5A4800",color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"11px",cursor:"pointer",width:"100%",opacity:email&&match&&pw.length>=8&&!loading?1:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading==="email"?<><span style={{width:12,height:12,border:"2px solid #00000033",borderTopColor:"#000",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>creating_account()</>:"create_account()"}
            </button>
            <div style={{marginTop:11,background:C.hi,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 11px",fontFamily:mono,fontSize:11,color:C.muted}}>
              // by signing up you agree to our {lnk("terms",()=>{})} and {lnk("privacy policy",()=>{})}
            </div>
            <div style={{marginTop:12,textAlign:"center",fontFamily:mono,fontSize:11,color:C.muted}}>
              have an account? {lnk("sign_in()",()=>setMode("login"))}
            </div>
          </div>
        )}

        {mode==="forgot"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:26}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:7}}>// reset_password()</div>
              <h1 style={{fontSize:23,fontWeight:300,letterSpacing:"-0.03em",marginBottom:3}}>Reset your password</h1>
              <p style={{fontSize:13,color:C.dim}}>Enter your email and we will send a reset link.</p>
            </div>
            {!sent?(
              <>
                <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>EMAIL</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="engineer@yourcompany.com" style={{...inp,marginBottom:11}}/>
                <button onClick={()=>{setLoading("r");setTimeout(()=>{setLoading(null);setSent(true);},1300);}} disabled={!email||!!loading}
                  style={{background:email&&!loading?C.amber:"#5A4800",color:"#000",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:13,padding:"11px",cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:email&&!loading?1:.5}}>
                  {loading==="r"?<><span style={{width:12,height:12,border:"2px solid #00000033",borderTopColor:"#000",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>sending_link()</>:"send_reset_link()"}
                </button>
              </>
            ):(
              <div style={{background:"#0A2A10",border:`1px solid ${C.green}44`,borderRadius:8,padding:22,textAlign:"center"}}>
                <div style={{fontFamily:mono,fontSize:14,color:C.green,marginBottom:5}}>✓ reset_link_sent()</div>
                <div style={{fontSize:13,color:C.dim}}>Check your inbox. Link expires in 30 minutes.</div>
              </div>
            )}
            <div style={{marginTop:14,textAlign:"center",fontFamily:mono,fontSize:11,color:C.muted}}>
              {lnk("← back_to_login()",()=>{setMode("login");setSent(false);})}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState("home");
  const [authed,setAuthed]=useState(false);

  const go = p => { setPage(p); window.scrollTo?.(0,0); };

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
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
      <div style={{position:"fixed",inset:0,background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.012) 2px,rgba(0,0,0,.012) 4px)",pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <Nav page={page} go={go} authed={authed}/>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          {page==="home"     && <Home go={go}/>}
          {page==="analyse"  && <Analyse go={go}/>}
          {page==="glossary" && <GlossaryPage go={go}/>}
          {page==="security" && <SecurityPage/>}
          {(page==="login"||page==="signup") && <Auth mode={page==="login"?"login":"signup"} go={go} setAuthed={setAuthed}/>}
        </div>
      </div>
    </div>
  );
}