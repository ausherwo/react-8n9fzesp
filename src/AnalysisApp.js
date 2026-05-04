// AnalysisApp.js
// v2.0 — API calls moved server-side, prompt removed from client

import { useState, useRef } from "react";
import { useAuth } from './Auth';

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

function isAciFabric(devList) {
  return devList.some(d => d.name && d.name.toUpperCase().includes("APIC"));
}

function isAciManagedSwitch(device, aciFabric) {
  if (!aciFabric) return false;
  const upper = (device.name || "").toUpperCase();
  return upper.includes("NEXUS") || upper.includes("N9K") || upper.includes("N7K") || upper.includes("N5K") || upper.includes("N3K") || upper.includes("MDS");
}

function getCount() {
  try { return parseInt(localStorage.getItem("nw_count") || "0", 10); } catch { return 0; }
}
function incCount() {
  try { localStorage.setItem("nw_count", String(getCount() + 1)); } catch {}
}
function isRegistered() {
  try { return !!localStorage.getItem("nw_registered"); } catch { return false; }
}

const STEPS = [
  {l:"Parsing inventory",           d:600},
  {l:"Identifying platforms",        d:700},
  {l:"Checking bug patterns",        d:900},
  {l:"Cross-referencing advisories", d:800},
  {l:"Running AI analysis",          d:1200},
  {l:"Generating remediation plan",  d:700},
];

const SAMPLE = `APIC-01    Cisco APIC       6.0(3e)    APIC Controller
APIC-02    Cisco APIC       6.0(3e)    APIC Controller
APIC-03    Cisco APIC       6.0(3e)    APIC Controller
SP-01      Nexus 9336C-FX2  15.2(8e)   Spine
SP-02      Nexus 9336C-FX2  15.2(8e)   Spine
BL-01      Nexus 93180YC-EX  15.2(8e)   Border Leaf
BL-02      Nexus 93180YC-EX  15.2(7f)   Border Leaf
LEAF-01    Nexus 93180YC-EX  15.2(8e)   Leaf
LEAF-02    Nexus 93180YC-EX  15.2(8e)   Leaf
LEAF-03    Nexus 93180YC-EX  15.2(8e)   Leaf
LEAF-04    Nexus 93180YC-EX  15.2(8e)   Leaf
FTD-01     Firepower 2140    7.4(1)     Firewall
FTD-02     Firepower 2140    7.4(1)     Firewall`;

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

function Nav({go, authed}) {
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 36px",background:`${C.bg}E8`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1140,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>go("analyse")}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontFamily:mono,fontWeight:700,fontSize:15}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {authed && (
            <button onClick={()=>go("settings")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
              settings
            </button>
          )}
          <button onClick={()=>go("login")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 16px",cursor:"pointer"}}>
            sign_in()
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Results component (unchanged from v1)
function Results({data, advisoryMap, reset, go, onShowSignup, showNudge, onDismissNudge}) {
  const [exp, setExp] = useState(null);

  const riskColor = {LOW:C.green, MEDIUM:C.yellow, HIGH:C.orange, CRITICAL:C.red};
  const fabricRisk = data.fabricAnalysis?.risk || "LOW";

  return (
    <div style={{animation:"fadeUp 0.3s ease"}}>

      {showNudge && (
        <div style={{background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div>
            <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:4}}>// save your analysis history</div>
            <div style={{fontSize:13,color:C.dim}}>Create a free account to keep your analyses and access them later.</div>
          </div>
          <div style={{display:"flex",gap:9,flexShrink:0}}>
            <button onClick={onDismissNudge} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,fontFamily:mono,fontSize:11,padding:"7px 12px",borderRadius:6,cursor:"pointer"}}>dismiss</button>
            <button onClick={()=>go("signup")} style={{background:C.amber,border:"none",color:"#000",fontFamily:mono,fontSize:11,fontWeight:700,padding:"7px 14px",borderRadius:6,cursor:"pointer"}}>create_account()</button>
          </div>
        </div>
      )}

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.1em",textTransform:"uppercase"}}>// analysis complete</div>
        <div style={{display:"flex",gap:9}}>
          <button onClick={reset} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"7px 13px",borderRadius:6,cursor:"pointer"}}>← new_analysis()</button>
          <button style={{background:C.amber,border:"none",color:"#000",fontFamily:mono,fontSize:12,fontWeight:700,padding:"7px 13px",borderRadius:6,cursor:"pointer"}}>export_report()</button>
        </div>
      </div>

      {/* Priority Assessment */}
      {data.priorityAssessment?.items && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 20px",marginBottom:12}}>
          <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>// priority assessment</div>
          {data.priorityAssessment.items.map((item,i)=>(
            <div key={i} style={{display:"flex",gap:13,marginBottom:i<data.priorityAssessment.items.length-1?14:0,paddingBottom:i<data.priorityAssessment.items.length-1?14:0,borderBottom:i<data.priorityAssessment.items.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:28,height:28,borderRadius:6,background:i===0?C.red+"22":i===1?C.orange+"22":C.yellow+"22",border:`1px solid ${i===0?C.red:i===1?C.orange:C.yellow}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:11,fontWeight:700,color:i===0?C.red:i===1?C.orange:C.yellow,flexShrink:0}}>
                {item.priority}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{item.title}</div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:6}}>{item.reason}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {item.devices?.map((d,di)=><Pill key={di}>{d}</Pill>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fabric Analysis */}
      {data.fabricAnalysis && (
        <div style={{background:C.surface,border:`1px solid ${C.amber}33`,borderRadius:10,padding:"16px 20px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase"}}>// fabric analysis</div>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:riskColor[fabricRisk]||C.green,background:(riskColor[fabricRisk]||C.green)+"22",border:`1px solid ${(riskColor[fabricRisk]||C.green)}44`,padding:"2px 10px",borderRadius:3}}>{fabricRisk}</span>
          </div>
          <div style={{fontFamily:mono,fontSize:11,color:C.muted,fontStyle:"italic",marginBottom:10}}>Facts derived directly from your submitted inventory.</div>
          {data.fabricAnalysis.findings?.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:9,marginBottom:7}}>
              <span style={{color:C.amber,fontFamily:mono,fontSize:12,flexShrink:0}}>→</span>
              <span style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{f}</span>
            </div>
          ))}
          {data.fabricAnalysis.mismatches?.length>0 && (
            <div style={{background:"#2A1400",border:`1px solid ${C.orange}33`,borderRadius:8,padding:"12px 14px",marginTop:10}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.orange,marginBottom:7}}>// version mismatches detected</div>
              {data.fabricAnalysis.mismatches.map((m,i)=>(
                <div key={i} style={{fontSize:13,color:C.dim,marginBottom:4}}>{m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Netwrkr Intel */}
      {data.netwrkrIntel?.hasIntel && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 20px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase"}}>// netwrkr intel</div>
            {data.netwrkrIntel.items?.some(i=>i.verified) && (
              <span style={{fontFamily:mono,fontSize:10,color:C.green,background:C.greenG,border:`1px solid ${C.green}33`,padding:"2px 9px",borderRadius:3}}>✓ live PSIRT data</span>
            )}
          </div>
          <div style={{fontSize:13,color:C.dim,marginBottom:12,lineHeight:1.6}}>
            {data.netwrkrIntel.items?.some(i=>i.verified)
              ? <>Verified advisories sourced from the live Cisco PSIRT API. Unverified items are from AI training knowledge — <span style={{color:C.amber,cursor:"pointer"}} onClick={()=>go("signup")}>Upgrade to enterprise</span> for full fabric exposure analysis.</>
              : <>⚠ AI-powered intelligence from training knowledge — unverified. <span style={{color:C.amber,cursor:"pointer"}} onClick={()=>go("signup")}>Upgrade to enterprise</span> for verified Cisco Bug API data.</>
            }
          </div>
          {data.netwrkrIntel.items?.map((item,i)=>{
            const s=SEV[item.sev]||SEV.MEDIUM;
            return (
              <div key={i} style={{border:`1px solid ${s.bd}`,borderRadius:8,padding:"12px 14px",marginBottom:9,background:`${s.bg}88`}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6}}>
                  <Badge level={item.sev} sm/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                      <span style={{fontWeight:600,fontSize:13}}>{item.title}</span>
                      {item.id&&<span style={{fontFamily:mono,fontSize:10,color:C.amber,background:C.amberG,padding:"1px 7px",borderRadius:3}}>{item.id}</span>}
                      <span style={{fontFamily:mono,fontSize:10,color:C.muted}}>{item.platform} {item.version}</span>
                    </div>
                    <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{item.detail}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                  {item.verified
                    ? <span style={{fontFamily:mono,fontSize:10,color:C.green}}>✓ verified — Cisco PSIRT API</span>
                    : <span style={{fontFamily:mono,fontSize:10,color:C.orange}}>⚠ unverified — AI training knowledge</span>
                  }
                  {!item.verified && (
                    <button onClick={()=>go("signup")} style={{background:"none",border:`1px solid ${C.amber}44`,color:C.amber,fontFamily:mono,fontSize:10,padding:"3px 10px",borderRadius:4,cursor:"pointer"}}>verify with enterprise →</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Device Breakdown */}
      {data.devices?.length>0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontFamily:mono,fontSize:11,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:9}}>// device breakdown</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {data.devices.map((d,di)=>{
              const open=exp===di;
              const fRisk=SEV[d.fabricRisk]||SEV.LOW;
              const iRisk=SEV[d.intelRisk]||SEV.LOW;
              return (
                <div key={di} style={{background:C.surface,border:`1px solid ${open?C.amber+"44":C.border}`,borderRadius:10,overflow:"hidden"}}>
                  <div onClick={()=>setExp(open?null:di)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:SEV[d.fabricRisk]?.color||C.green,flexShrink:0}}/>
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
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontFamily:mono,fontSize:9,color:C.muted}}>fabric</span>
                          <Badge level={d.fabricRisk} sm/>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontFamily:mono,fontSize:9,color:C.muted}}>intel</span>
                          <Badge level={d.intelRisk} sm/>
                        </div>
                      </div>
                      <span style={{color:C.muted,fontFamily:mono,fontSize:11}}>{open?"▲":"▼"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enterprise upsell */}
      <div style={{background:C.amberG,border:`1px solid ${C.amber}33`,borderRadius:10,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18}}>
        <div>
          <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:4}}>// unlock verified fabric exposure analysis</div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>Enterprise adds live Cisco Bug API data — verified CSC IDs and confirmed fabric exposure analysis.</div>
        </div>
        <button onClick={()=>go("signup")} style={{background:C.amber,border:"none",color:"#000",fontFamily:mono,fontSize:12,fontWeight:700,padding:"9px 16px",borderRadius:6,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>get_enterprise()</button>
      </div>
    </div>
  );
}

// ── SignupGate stub
function SignupGate({onComplete, onDismiss}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#080806EE",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"36px 44px",width:420}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:12}}>// free analysis used</div>
        <h2 style={{fontSize:20,fontWeight:300,marginBottom:10}}>Create a free account to continue</h2>
        <p style={{fontSize:13,color:C.dim,marginBottom:20}}>Get 10 analyses/month free. No credit card required.</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onDismiss} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"10px",borderRadius:6,cursor:"pointer"}}>skip for now</button>
          <button onClick={onComplete} style={{flex:1,background:C.amber,border:"none",color:"#000",fontFamily:mono,fontWeight:700,fontSize:12,padding:"10px",borderRadius:6,cursor:"pointer"}}>create_account()</button>
        </div>
      </div>
    </div>
  );
}

function Analyse({go}) {
  const { session } = useAuth();
  const [screen,setScreen]           = useState("paste");
  const [rawInput,setRawInput]       = useState("");
  const [ctx,setCtx]                 = useState("");
  const [parsing,setParsing]         = useState(false);
  const [devices,setDevices]         = useState([]);
  const [step,setStep]               = useState(0);
  const [results,setResults]         = useState(null);
  const [advisoryMap,setAdvisoryMap] = useState({});
  const [showGate,setShowGate]       = useState(false);
  const [showNudge,setShowNudge]     = useState(false);
  const [pendingRun,setPendingRun]   = useState(false);
  const ref = useRef();

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
  });

  // ── Step 1: Extract devices via server
  const parseInput = async () => {
    if (!rawInput.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text: rawInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message || data.error);
      setDevices(data.devices.map(d => ({ ...d, verMissing: !d.ver?.trim() })));
      setScreen("review");
    } catch(e) {
      console.error("Extract error:", e);
    }
    setParsing(false);
  };

  const updateDevice = (i,field,val) => setDevices(prev=>prev.map((d,idx)=>idx===i?{...d,[field]:val,verMissing:field==="ver"?!val.trim():d.verMissing}:d));
  const removeDevice = (i) => setDevices(prev=>prev.filter((_,idx)=>idx!==i));
  const missingVersions = devices.filter(d=>d.verMissing).length;
  const canAnalyse = devices.length > 0;

  // ── Fetch PSIRT advisory data per device
  const fetchAdvisoriesForDevices = async (devList) => {
    const aciFabric = isAciFabric(devList);
    const resultMap = {};
    await Promise.all(devList.map(async (d) => {
      if (!d.ver || d.ver === "not provided") return;
      try {
        const aciSwitch = isAciManagedSwitch(d, aciFabric);
        const res = await fetch("/api/advisories", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ platform: d.name, version: d.ver, isAciSwitch: aciSwitch }),
        });
        const data = await res.json();
        resultMap[`${d.name}__${d.ver}`] = data;
      } catch(e) {
        console.error("Advisory fetch failed for", d.name, e);
      }
    }));
    return resultMap;
  };

  const attemptAnalysis = () => {
    const count = getCount();
    const registered = isRegistered();
    if (count >= 1 && !registered) {
      setPendingRun(true);
      setShowGate(true);
      return;
    }
    runAnalysis();
  };

  // ── Step 3: Run full analysis via server
  const runAnalysis = async () => {
    setShowGate(false);
    setPendingRun(false);
    setScreen("analysing");
    setStep(0);
    let s = 0;
    const timer = setInterval(() => { if (s < STEPS.length - 1) { s++; setStep(s); } }, 900);

    // Fetch PSIRT data first
    const advMap = await fetchAdvisoriesForDevices(devices);
    setAdvisoryMap(advMap);

    try {
      // Send devices + advisory map to server for analysis
      const res = await fetch("/api/advisories", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          runAnalysis: true,
          devices,
          ctx,
          advisoryMap: advMap,
        }),
      });

      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.message || parsed.error);

      incCount();
      const newCount = getCount();
      clearInterval(timer);
      setStep(STEPS.length);
      setResults(parsed);
      setScreen("results");

      if (newCount === 1 && !isRegistered()) {
        setShowNudge(true);
      }

    } catch(e) {
      clearInterval(timer);
      setResults(null);
      setScreen("results");
      console.error("Analysis error:", e);
    }
  };

  const reset = () => { setScreen("paste"); setRawInput(""); setDevices([]); setCtx(""); setResults(null); setStep(0); setShowNudge(false); setAdvisoryMap({}); };

  const inp = {fontFamily:mono,fontSize:13,background:C.hi,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"11px 13px",width:"100%",outline:"none",lineHeight:1.7};

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"34px 36px"}}>
      {screen==="analysing" && <Overlay step={step}/>}

      {showGate && (
        <SignupGate
          onComplete={()=>runAnalysis()}
          onDismiss={()=>{ setShowGate(false); setPendingRun(false); runAnalysis(); }}
        />
      )}

      {screen==="paste" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:20,alignItems:"start"}}>
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>// step 1 of 3</div>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:"-0.03em",marginBottom:4}}>Paste your inventory</h1>
              <p style={{fontSize:13,color:C.dim,lineHeight:1.7}}>Paste anything — a CSV, a spreadsheet column, show version output, or just type your devices. We will extract what we need and ask you to confirm before running.</p>
            </div>
            <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const r=new FileReader();r.onload=ev=>setRawInput(ev.target.result);r.readAsText(f);}}}
              style={{border:`1px dashed ${rawInput?C.amber:C.border}`,borderRadius:10,marginBottom:11,transition:"border-color 0.2s",padding:"6px"}}>
              <div style={{position:"relative"}}>
                <textarea value={rawInput} onChange={e=>setRawInput(e.target.value)} rows={12} placeholder="Paste anything — CSV, spreadsheet, show version output, or free text..." style={{...inp,borderRadius:8,resize:"vertical"}}/>
                {rawInput&&<button onClick={()=>setRawInput("")} style={{position:"absolute",top:9,right:9,background:C.surface,border:`1px solid ${C.border}`,color:C.muted,fontFamily:mono,fontSize:11,padding:"3px 9px",borderRadius:4,cursor:"pointer"}}>clear</button>}
              </div>
            </div>
            <input ref={ref} type="file" accept=".csv,.txt,.log" onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setRawInput(ev.target.result);r.readAsText(f);}}} style={{display:"none"}}/>
            <div style={{display:"flex",gap:9,marginBottom:11}}>
              <button onClick={()=>setRawInput(SAMPLE)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"8px",borderRadius:6,cursor:"pointer"}}>load_sample()</button>
              <button onClick={()=>ref.current?.click()} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"8px",borderRadius:6,cursor:"pointer"}}>upload_file()</button>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>CONTEXT <span style={{color:C.faint}}> // optional — improves accuracy</span></label>
              <textarea value={ctx} onChange={e=>setCtx(e.target.value)} rows={2} placeholder="e.g. ACI fabric, VXLAN/EVPN, vPC pairs on leaf layer, maintenance window Saturday 02:00 UTC" style={{...inp,resize:"none"}}/>
            </div>
            <button onClick={parseInput} disabled={!rawInput.trim()||parsing}
              style={{background:rawInput.trim()&&!parsing?C.amber:"#5A4800",color:"#000",border:"none",borderRadius:8,fontFamily:mono,fontWeight:700,fontSize:14,padding:"13px",cursor:rawInput.trim()&&!parsing?"pointer":"not-allowed",width:"100%",opacity:rawInput.trim()&&!parsing?1:.5,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {parsing?<><span style={{width:14,height:14,border:"2px solid #00000033",borderTopColor:"#000",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> extracting_devices()</>:"extract_devices() →"}
            </button>
            <div style={{fontFamily:mono,fontSize:11,color:C.muted,textAlign:"center",marginTop:7}}>// we will show you what we found before running</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>// works with anything</div>
              {[["CSV file","Platform, Version, Role columns"],["Spreadsheet paste","Any column order"],["show version output","Cisco CLI output"],["Free text","4 spines on 10.2(4)"],["DCIM export","Most formats supported"]].map(([t,s])=>(
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
          {isAciFabric(devices) && (
            <div style={{background:"#001A2A",border:`1px solid ${C.amber}44`,borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{color:C.amber,fontSize:16,flexShrink:0}}>ℹ</span>
              <div>
                <div style={{fontFamily:mono,fontSize:12,color:C.amber,marginBottom:3}}>// ACI fabric detected</div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>APIC found in inventory. Nexus switches will be queried using their ACI NX-OS version (APIC major version + 10). APIC advisory lookup uses ACI release versioning.</div>
              </div>
            </div>
          )}
          {missingVersions>0 && (
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
            <button onClick={()=>setScreen("paste")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:13,padding:"12px 20px",borderRadius:8,cursor:"pointer"}}>← back()</button>
            <button onClick={attemptAnalysis} disabled={!canAnalyse}
              style={{flex:1,background:canAnalyse?C.amber:"#5A4800",color:"#000",border:"none",borderRadius:8,fontFamily:mono,fontWeight:700,fontSize:14,padding:"13px",cursor:canAnalyse?"pointer":"not-allowed",opacity:canAnalyse?1:.5}}>
              run_analysis() →
            </button>
          </div>
          <div style={{fontFamily:mono,fontSize:11,color:C.muted,textAlign:"center",marginTop:7}}>
            {missingVersions>0?`// ${missingVersions} device${missingVersions!==1?"s":""} will be analysed for topology issues only`:"// all devices have version data — full analysis enabled"}
          </div>
        </div>
      )}

      {screen==="results" && results && (
        <Results
          data={results}
          advisoryMap={advisoryMap}
          reset={reset}
          go={go}
          onShowSignup={()=>setShowGate(true)}
          showNudge={showNudge}
          onDismissNudge={()=>setShowNudge(false)}
        />
      )}
    </div>
  );
}

export default function AnalysisApp() {
  const { session } = useAuth();

  const go = p => {
    if (p === "login")    { window.location.href = "/login";    return; }
    if (p === "signup")   { window.location.href = "/signup";   return; }
    if (p === "settings") { window.location.href = "/settings"; return; }
    window.scrollTo?.(0, 0);
  };

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
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <Nav go={go} authed={!!session}/>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <Analyse go={go}/>
        </div>
      </div>
    </div>
  );
}