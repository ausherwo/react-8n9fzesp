function Analyse({go}) {
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
  - name: the Cisco platform name (e.g. "Nexus 9336C-FX2", "Catalyst 9500", "APIC")
  - ver: the exact software version string if explicitly present (e.g. "9.3(9)", "17.9.4", "6.1(5e)") — if NOT present in the text set to ""
  - role: the device role if present (e.g. "Spine", "Leaf", "Border Leaf", "Distribution", "Controller") — if not present set to ""
  
  IMPORTANT: Only extract versions that are explicitly written in the text. Do not guess or infer versions from platform names.
  
  Return ONLY a JSON array, no markdown, no explanation:
  [{"name":"...","ver":"...","role":"..."}]
  
  Text to parse:
  ${rawInput}`);
        const clean = text.replace(/```json|```/g,"").trim();
        const parsed = JSON.parse(clean);
        setDevices(parsed.map(d=>({...d, verMissing:!d.ver.trim()})));
        setScreen("review");
      } catch(e) { console.error(e); }
      setParsing(false);
    };
  
    const updateDevice = (i,field,val) => setDevices(prev=>prev.map((d,idx)=>idx===i?{...d,[field]:val,verMissing:field==="ver"?!val.trim():d.verMissing}:d));
    const removeDevice = (i) => setDevices(prev=>prev.filter((_,idx)=>idx!==i));
    const missingVersions = devices.filter(d=>d.verMissing).length;
    const canAnalyse = devices.length > 0;
  
    const fetchAdvisoriesForDevices = async (devList) => {
      const aciFabric = isAciFabric(devList);
      const resultMap = {};
  
      await Promise.all(devList.map(async (d) => {
        if (!d.ver || d.ver === "not provided") return;
        try {
          const aciSwitch = isAciManagedSwitch(d, aciFabric);
          const res = await fetch("/api/advisories", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              platform: d.name,
              version: d.ver,
              isAciSwitch: aciSwitch,
            })
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
  
    const runAnalysis = async () => {
      setShowGate(false);
      setPendingRun(false);
      setScreen("analysing"); setStep(0);
      let s=0;
      const timer = setInterval(()=>{ if(s<STEPS.length-1){s++;setStep(s);} },900);
  
      const inventoryCsv = "Platform, Version, Role\n" + devices.map(d=>`${d.name}, ${d.ver||"not provided"}, ${d.role||"unknown"}`).join("\n");
  
      // Detect ACI fabric for context in prompt
      const aciFabric = isAciFabric(devices);
  
      // Fetch all advisory + EoL data
      const advMap = await fetchAdvisoriesForDevices(devices);
      setAdvisoryMap(advMap);
  
      // Build advisory summary for Claude prompt
      const advisorySummary = Object.entries(advMap).map(([key, data]) => {
        const [platform, version] = key.split("__");
        if (!data.advisories?.length) return null;
        const high = data.advisories.filter(a=>a.impact==="High");
        const med  = data.advisories.filter(a=>a.impact==="Medium");
        return `${platform} v${version} [${data.family||""}]: ${data.advisories.length} advisories (${high.length} High, ${med.length} Medium). Top issues: ${data.advisories.slice(0,3).map(a=>`${a.id} — ${a.title}`).join("; ")}${data.queryVersion !== version ? ` [ACI NX-OS version queried: ${data.queryVersion}]` : ""}`;
      }).filter(Boolean).join("\n") || "No Cisco advisory data retrieved.";
  
      // Build EoL summary for Claude prompt — disabled, requires enterprise SNTC credentials
      /* const eolSummary = Object.entries(advMap).map(([key, data]) => {
        const [platform] = key.split("__");
        if (!data.eol) return null;
        const eol = data.eol;
        return `${platform} (PID: ${data.pid||"unknown"}): EndOfSale=${eol.endOfSaleDate||"N/A"}, EndOfSwMaint=${eol.endOfSwMaintenanceDate||"N/A"}, EndOfSecuritySupport=${eol.endOfSecuritySupportDate||"N/A"}, LastDateOfSupport=${eol.endOfSupportDate||"N/A"}`;
      }).filter(Boolean).join("\n") || "No EoL data retrieved."; */
  
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
  8. NEVER add devices that are not in the submitted inventory. The devices array must contain EXACTLY the same devices as the submitted inventory — no additions, no omissions.
  9. Sort devices in the output by infrastructure tier in this strict order: Controllers (APIC, DNAC, NSO) → Spine → Border Leaf → Leaf → Distribution/Firewall/Edge.
  10. Identify Border Leaf from: device name or role containing "BORDER-LEAF", "BORDER_LEAF", "Border Leaf", "border-leaf", or "BL-". Assign tier:2 to Border Leaf.
  11. Border Leaf devices must have intelRisk "HIGH" minimum.
  12. Tier 4 devices (Distribution, Firewall, Catalyst, Firepower) must never exceed intelRisk "MEDIUM".
  13. APIC controllers always appear first in the devices array, before Spines.
  14. Controllers (APIC, DNAC, NSO) must have fabricRisk "LOW" unless there is a version mismatch between the controllers themselves.
  15. Border Leaf device recommendations must never use directive upgrade language. Use advisory language such as "Review upgrade target against current fabric baseline".
  16. P1/P2/P3 priority assessment titles must never contain the word "Critical".
  17. fabricAnalysis findings must never reference advisory counts, CVEs, or bug data — topology facts from the submitted inventory only.
  // 18. EoL findings disabled pending enterprise SNTC credentials
  ${aciFabric ? "19. This is an ACI fabric (APIC detected). APIC version uses ACI release numbering. Nexus switches in this fabric run NX-OS with major version = APIC major version + 10 (e.g. APIC 6.1(5e) → NX-OS 16.1(5e)). Note this version relationship in fabric analysis findings." : ""}
  
  INFRASTRUCTURE TIER GUIDE:
  - Tier 1: Controllers — APIC, DNAC, NSO
  - Tier 2a: Spine — core fabric stability
  - Tier 2b: Border Leaf — external routing, BGP, WAN-facing (HIGH intel minimum)
  - Tier 3: Leaf — forwarding fabric
  - Tier 4: Distribution, Firewall, Catalyst, Firepower (cap intel at MEDIUM)
  
  Validated device inventory (engineer-confirmed):
  ${inventoryCsv}
  
  ${aciFabric ? "FABRIC TYPE: ACI (APIC-managed fabric detected)\n" : "FABRIC TYPE: Standalone NX-OS or unknown\n"}
  Additional context: ${ctx||"None provided"}
  
  VERIFIED CISCO SECURITY ADVISORIES (live Cisco PSIRT API data):
  ${advisorySummary}
  
  // HARDWARE END OF LIFE DATA: disabled pending enterprise SNTC credentials
  
  CRITICAL: Use the VERIFIED CISCO SECURITY ADVISORIES above to populate netwrkrIntel items. For ANY platform that appears in that section, set verified: true and use the exact advisory ID provided. Setting verified: false for a platform that appears in the advisory data above is an error.
  
  // EoL fabric findings disabled pending enterprise SNTC credentials
  
  Respond ONLY with valid JSON (no markdown):
  {
    "priorityAssessment": {"items": [{"priority":"P1","title":"title","reason":"one line reason","devices":["device names"]},{"priority":"P2","title":"title","reason":"one line reason","devices":["device names"]},{"priority":"P3","title":"title","reason":"one line reason","devices":["device names"]}]},
    "fabricAnalysis": {"risk":"LOW|MEDIUM|HIGH","consistent":false,"mismatches":["Platform: version1 vs version2 — description [observed]"],"missingVersions":[],"findings":["finding [observed|inferred]"]},
    "netwrkrIntel": {"hasIntel":true,"summary":"brief summary","items":[{"platform":"","version":"","title":"","detail":"","id":"","verified":false,"sev":"MEDIUM"}]},
    "devices": [{"name":"","ver":"","role":"","tier":1,"fabricRisk":"LOW","intelRisk":"LOW","rec":""}]
  }`, 4000);
  
        const clean = text.replace(/```json|```/g,"").trim();
        const parsed = JSON.parse(clean);
  
        // Cross-check verified flags against real advisory IDs
        const realIds = new Set(Object.values(advMap).flatMap(d => (d.advisories||[]).map(a=>a.id)).filter(Boolean));
        if (parsed.netwrkrIntel?.items) {
          parsed.netwrkrIntel.items = parsed.netwrkrIntel.items.map(item=>({
            ...item,
            verified: realIds.has(item.id) ? true : item.verified
          }));
        }
  
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
        console.error(e);
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
            onDismiss={()=>{
              setShowGate(false);
              setPendingRun(false);
              runAnalysis();
            }}
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
            {missingVersions>0&&(
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
  
  const SECS = [
    {ic:"🔐",t:"Encrypted at rest",tag:"AES-256",s:"AES-256-GCM encryption before storage. Unreadable without a separately managed key.",d:["Encryption uses AES-256-GCM before any write to storage.","Key stored separately in a dedicated secrets management service.","Even in a breach, credentials are unreadable without the key.","Keys are rotated regularly using industry-standard practices."]},
    {ic:"🚫",t:"Never logged",tag:"zero logging",s:"Credential values are scrubbed from all logs at infrastructure level — not just application code.",d:["Authorization headers scrubbed before logs are written.","Applies to application, access, error logs, and third-party monitoring.","Enforced at infrastructure level — cannot be bypassed by a code change.","We retain anonymised request metadata only — never credential values."]},
    {ic:"👤",t:"No human access",tag:"zero visibility",s:"The encryption architecture makes it technically impossible for our team to read your credentials.",d:["Credentials encrypted using a key not accessible to engineering in normal operations.","No view credentials admin function exists anywhere in our tooling.","Any key access attempt generates an alert and requires multi-party approval.","We cannot recover your credentials if lost — you would regenerate on Cisco API Console."]},
    {ic:"📦",t:"Bug data never stored",tag:"minimal data",s:"Analysis results flow through and are discarded after each request. Only email and encrypted credentials persist.",d:["Bug API results, inventory, and analysis output never written to our database.","Data flows through the request lifecycle and is discarded on completion.","Only email, hashed password, and encrypted credentials are persisted.","Minimises exposure — no inventory or analysis history to exfiltrate."]},
    {ic:"⚙️",t:"Server-side only",tag:"credentials stay server-side",s:"All Cisco API calls originate from our servers. Your Client Secret never appears in browser code after setup.",d:["Credentials sent to our backend over HTTPS once, then immediately encrypted.","Never stored in your browser, localStorage, or any client-side state.","All Cisco API calls originate from our servers — never from your browser.","Your Secret never appears in network tabs or browser developer tools after setup."]},
    {ic:"🔑",t:"Revoke any time",tag:"you are in control",s:"Delete credentials or your entire account from Settings at any time. Takes effect immediately.",d:["Settings credentials deletion immediately removes the encrypted record.","Account deletion removes all data we hold, permanently and immediately.","We also recommend revoking the app registration on Cisco API Console.","Deletion is irreversible — we have no way to recover deleted data."]},
    {ic:"🛡️",t:"Never sold or shared",tag:"no third parties",s:"We do not sell, share, or license your data to any third party, ever.",d:["Your data is used solely to provide the netwrkr.ai service.","We do not share credentials or usage data with any third party except Cisco API itself.","Third-party infrastructure providers are contractually prohibited from accessing your data.","We only disclose data in response to a valid legal requirement."]},
  ];
  export default function AnalysisApp() {
    const go = p => {
      if (p === "login")    { window.location.href = "/login"; return; }
      if (p === "signup")   { window.location.href = "/signup"; return; }
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
          <Nav page="analyse" go={go} authed={true} />
          <div style={{flex:1,display:"flex",flexDirection:"column"}}>
            <Analyse go={go}/>
          </div>
        </div>
      </div>
    );
  }