// AnalysisApp.js
// v3.9 — Kelly streams: briefing and chat replies now render token-by-token as they arrive from /api/chat, with a live cursor

import { useState, useRef, useEffect } from "react";
import { useAuth } from './Auth';
import posthog from 'posthog-js';

const C = {
    bg:      "#F7F5F0",
    surface: "#FFFFFF",
    hi:      "#F0EDE6",
    hi2:     "#E8E4DB",
    border:  "#DDD9CF",
    amber:   "#B8860B",
    amberB:  "#D4A000",
    amberG:  "#D4A00012",
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
    blue:    "#1A5C9C",
    blueG:   "#1A5C9C12",
    blueBd:  "#2A6CAC",
};

const SEV = {
    CRITICAL:{ color:"#C0392B", bg:"#FDF0EE", bd:"#E8A09A" },
    HIGH:    { color:"#C0620B", bg:"#FDF4EE", bd:"#E8B48A" },
    MEDIUM:  { color:"#8B7000", bg:"#FDF9EE", bd:"#D4C060" },
    LOW:     { color:"#1A7A3C", bg:"#EEF7F2", bd:"#8AC4A4" },
};

const mono = "JetBrains Mono, Fira Code, monospace";
const sans = "'DM Sans', system-ui, sans-serif";

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
    const isNexus = upper.includes("NEXUS")||upper.includes("N9K")||upper.includes("N7K")||upper.includes("N5K")||upper.includes("N3K")||upper.includes("MDS");
    if (!isNexus) return false;
    const ver = device.ver || "";
    const majorMatch = ver.match(/^(\d+)[\.(]/);
    if (!majorMatch) return true;
    const major = parseInt(majorMatch[1], 10);
    return major >= 11;
}

// ----
// BUILD PSIRT CONTEXT STRING
// Converts the advMap (keyed by "name__ver") into the same
// plain-text format that buildKellyPrompt() in chat.js expects.
// ----
function buildPsirtContext(advMap, devices) {
    if (!advMap || Object.keys(advMap).length === 0) return null;
    const timestamp = new Date().toUTCString();
    const lines = [
          `PSIRT check ran: ${timestamp}`,
          `Devices queried: ${devices.length}`,
          "PSIRT ADVISORY RESULTS (live Cisco PSIRT API):",
        ];
    let totalAdvisories = 0;
    for (const device of devices) {
          const key = `${device.name}__${device.ver}`;
          const data = advMap[key];
          if (!data) continue;
          if (!data.verified) {
                  lines.push(`${device.name} v${device.ver}: API query failed or not supported`);
                  continue;
          }
          const count = data.advisories?.length || 0;
          totalAdvisories += count;
          if (count === 0) {
                  lines.push(`${device.name} v${device.ver} [${data.family||""}]: No advisories found — VERIFIED CLEAN`);
          } else {
                  lines.push(`${device.name} v${device.ver} [${data.family||""}]: ${count} advisories`);
                  const sorted = [...(data.advisories||[])].sort(
                            (a,b)=>({Critical:4,High:3,Medium:2,Low:1}[b.impact]||0)-({Critical:4,High:3,Medium:2,Low:1}[a.impact]||0)
                          );
                  for (const adv of sorted.slice(0,5)) {
                            lines.push(`  - [${adv.impact?.toUpperCase()||"UNKNOWN"}] ${adv.id} — ${adv.title}${adv.firstFixed?` | Fixed: ${adv.firstFixed}`:""}`);
                  }
                  if (count > 5) lines.push(`  - ... and ${count-5} more`);
          }
    }
    const queried = devices.filter(d => advMap[`${d.name}__${d.ver}`]?.verified).length;
    lines.push(`SUMMARY: ${totalAdvisories} total advisories across ${queried} devices queried`);
    return lines.join("\n");
}

function buildReportText(data) {
    const d = data || {};
    const L = [];
    const rule = () => L.push("=".repeat(60));
    const fa = d.fabricAnalysis || {};
    const pa = d.priorityAssessment || {};
    const intel = d.netwrkrIntel || {};
    const devices = d.devices || [];

    L.push("netwrkr.ai — Fabric Analysis Report");
    L.push("Generated: " + new Date().toISOString().replace("T"," ").slice(0,19) + " UTC");
    rule();
    L.push("");
    L.push("FABRIC RISK: " + (fa.risk || "—"));
    L.push("Devices analysed: " + devices.length);
    const verified = (intel.items || []).filter(i => i.verified);
    if (verified.length) L.push("Cisco-verified advisories: " + verified.length);
    L.push("");

    if ((pa.items || []).length) {
        L.push("PRIORITY ASSESSMENT");
        rule();
        pa.items.forEach(p => {
            L.push(`[${p.priority || "P?"}] ${p.title || ""}`);
            if (p.reason) L.push("      " + p.reason);
            if ((p.devices || []).length) L.push("      Devices: " + p.devices.join(", "));
            L.push("");
        });
    }

    if (verified.length) {
        L.push("CISCO-VERIFIED ADVISORIES (live PSIRT)");
        rule();
        verified.forEach(it => {
            L.push(`${it.id || ""} [${it.sev || "—"}] ${it.title || ""}`);
            if (it.platform || it.version) L.push("      " + [it.platform, it.version].filter(Boolean).join(" · "));
            if (it.detail) L.push("      " + it.detail);
            L.push("");
        });
    }

    L.push("FABRIC ANALYSIS");
    rule();
    L.push("Consistent: " + (fa.consistent === false ? "NO" : fa.consistent === true ? "yes" : "—"));
    (fa.mismatches || []).forEach(m => L.push("  • MISMATCH: " + m));
    (fa.missingVersions || []).forEach(m => L.push("  • MISSING VERSION: " + m));
    (fa.findings || []).forEach(f => L.push("  • " + f));
    L.push("");

    const unverified = (intel.items || []).filter(i => !i.verified);
    if (unverified.length) {
        L.push("NETWRKR INTEL (unverified — verify before acting)");
        rule();
        unverified.forEach(it => {
            L.push(`[${it.sev || "—"}] ${it.title || ""}`);
            if (it.platform || it.version) L.push("      " + [it.platform, it.version].filter(Boolean).join(" · "));
            if (it.detail) L.push("      " + it.detail);
            L.push("");
        });
    }

    if (devices.length) {
        L.push("DEVICE BREAKDOWN");
        rule();
        devices.forEach(dev => {
            L.push(`${dev.name || ""}  ${dev.ver || ""}  [${dev.role || ""}]  fabric:${dev.fabricRisk || "—"} intel:${dev.intelRisk || "—"}`);
            if (dev.rec) L.push("      → " + dev.rec);
        });
        L.push("");
    }

    rule();
    L.push("netwrkr.ai · Unverified intel is AI-generated and must be verified against Cisco PSIRT before action.");
    return L.join("\n");
}

function exportReport(data) {
    try {
        const text = buildReportText(data);
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `netwrkr-analysis-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
        console.error("Export failed:", e);
        alert("Export failed — please try again.");
    }
}

function getCount() { try { return parseInt(localStorage.getItem("nw_count")||"0",10); } catch { return 0; } }
function incCount() { try { localStorage.setItem("nw_count",String(getCount()+1)); } catch {} }
function isRegistered() { try { return !!localStorage.getItem("nw_registered"); } catch { return false; } }

const ANALYSE_PHASES = ["psirt", "analysing"]; // real async phases, not a timed sequence

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

function Overlay({progress}) {
    const p = progress || {};
    const phase = p.phase || "psirt";
    const ticks = p.ticks || [];
    const analysing = phase === "analysing";

    const [elapsed, setElapsed] = useState(0);
    const [frame, setFrame] = useState(0);
    useEffect(() => {
        if (!analysing) { setElapsed(0); setFrame(0); return; }
        const t0 = Date.now();
        const id = setInterval(() => {
            const ms = Date.now() - t0;
            setElapsed(Math.floor(ms / 1000));
            setFrame(Math.floor(ms / 110));
        }, 110);
        return () => clearInterval(id);
    }, [analysing]);
    const mmss = `${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;
    const SPIN = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
    const SUBS = [
        "correlating advisories with fabric topology",
        "weighting exposure by device tier",
        "checking ACI upgrade-path constraints",
        "ranking priorities P1–P3",
        "composing remediation guidance",
    ];
    const spin = SPIN[frame % SPIN.length];
    const subIdx = Math.floor(frame / 32) % SUBS.length;

    const T = {
        bg:"#0C0E12", bar:"#171A20", border:"#23262E",
        host:"#3DD68C", path:"#56B6C2", cmd:"#E6E8EC", prefix:"#E0A82E",
        label:"#C6CAD2", dim:"#6B7280", ok:"#3DD68C", tick:"#56B6C2",
        cursor:"#E0A82E", err:"#E06C55", title:"#7A8290",
    };
    const dot = (c) => <span style={{width:11,height:11,borderRadius:"50%",background:c,display:"inline-block"}}/>;
    const anim = (i) => ({ animation:"termline .22s ease both", animationDelay:`${Math.min(i,8)*0.05}s` });
    const animNow = { animation:"termline .2s ease both" };
    const blinkCursor = (h) => <span style={{display:"inline-block",width:8,height:h,background:T.cursor,animation:"blink 1.05s step-end infinite"}}/>;

    const rows = [];
    rows.push(
        <div key="cmd" style={{...anim(0), marginBottom:10}}>
            <span style={{color:T.host}}>netwrkr@fabric</span><span style={{color:T.dim}}>:</span><span style={{color:T.path}}>~</span><span style={{color:T.dim}}> $ </span><span style={{color:T.cmd}}>analyse</span>
        </div>
    );
    rows.push(
        <div key="parsed" style={{...anim(1), display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
            <span style={{color:T.prefix,flexShrink:0}}>›</span>
            <span style={{color:T.label}}>parsed inventory{p.devices!=null?<span style={{color:T.dim}}> · {p.devices} devices · {p.groups} platform groups</span>:null}</span>
            <span style={{color:T.ok,marginLeft:"auto",flexShrink:0}}>✓</span>
        </div>
    );
    rows.push(
        <div key="psirt" style={{...anim(2), display:"flex", alignItems:"center", gap:8, marginBottom:6}}>
            <span style={{color:T.prefix,flexShrink:0}}>›</span>
            <span style={{color:T.label}}>querying Cisco PSIRT{p.platforms!=null?<span style={{color:T.dim}}> · {p.platforms} platforms</span>:null}</span>
            {analysing
                ? <span style={{color:T.ok,marginLeft:"auto",flexShrink:0}}>✓</span>
                : <span style={{marginLeft:"auto",flexShrink:0}}>{blinkCursor(14)}</span>}
        </div>
    );
    ticks.forEach((t,i)=> rows.push(
        <div key={`tick-${t.name}-${t.ver}-${i}`} style={{...animNow, display:"flex", gap:8, paddingLeft:22, marginBottom:4, fontSize:12}}>
            <span style={{color:t.error?T.err:T.ok,flexShrink:0}}>{t.error?"✕":"✓"}</span>
            <span style={{color:T.tick}}>{t.name} <span style={{color:T.dim}}>{t.ver}</span>{t.error?<span style={{color:T.err}}> · lookup failed</span>:t.count>0?<span style={{color:T.dim}}> · {t.count} adv</span>:<span style={{color:T.dim}}> · clean</span>}</span>
        </div>
    ));
    rows.push(
        <div key="run" style={{...animNow, marginTop:8, opacity:analysing?1:.4}}>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span style={{color:T.prefix,flexShrink:0}}>›</span>
                <span style={{color:analysing?T.label:T.dim}}>running fabric analysis</span>
                {analysing&&<span style={{color:T.prefix, width:10, display:"inline-block"}}>{spin}</span>}
                {analysing&&<span style={{color:T.dim, marginLeft:"auto"}}>{mmss}</span>}
            </div>
            {analysing&&<div key={subIdx} style={{...animNow, paddingLeft:22, marginTop:5, fontSize:12, color:T.dim}}>{SUBS[subIdx]}…</div>}
        </div>
    );

    return (
          <div style={{position:"fixed",inset:0,background:"rgba(8,9,12,0.55)",backdropFilter:"blur(4px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:520,maxWidth:"92vw",background:T.bg,border:`1px solid ${T.border}`,borderRadius:11,boxShadow:"0 24px 70px rgba(0,0,0,0.5)",overflow:"hidden",fontFamily:mono}}>
        <div style={{display:"flex",alignItems:"center",gap:7,padding:"11px 14px",background:T.bar,borderBottom:`1px solid ${T.border}`}}>
          {dot("#FF5F56")}{dot("#FFBD2E")}{dot("#27C93F")}
          <span style={{marginLeft:8,fontSize:11,color:T.title,letterSpacing:"0.04em"}}>netwrkr — analysing fabric</span>
        </div>
        <div style={{padding:"18px 20px",fontSize:13,lineHeight:1.65,color:T.label}}>
          {rows}
        </div>
      </div>
          </div>
  );
}

function Nav({go, authed}) {
    return (
          <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 36px",background:`${C.bg}F0`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1140,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>window.location.href="/"}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </div>
          <span style={{fontFamily:mono,fontWeight:700,fontSize:15,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
  </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
{authed && (
              <button onClick={()=>go("settings")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>settings</button>
          )}
          <button onClick={()=>go("login")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,borderRadius:6,fontFamily:mono,fontSize:12,padding:"7px 16px",cursor:"pointer"}}>sign_in()</button>
            </div>
            </div>
            </nav>
  );
}

function renderMarkdown(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
          if (line.trim() === '') return <div key={i} style={{height:'0.5em'}}/>;
                                    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (numMatch) return (
              <div key={i} style={{display:'flex',gap:8,marginBottom:4}}>
        <span style={{fontFamily:mono,fontSize:12,color:C.amber,flexShrink:0,minWidth:18}}>{numMatch[1]}.</span>
        <span>{renderInline(numMatch[2])}</span>
  </div>
    );
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) return (
            <div key={i} style={{display:'flex',gap:8,marginBottom:4}}>
        <span style={{color:C.amber,flexShrink:0}}>→</span>
        <span>{renderInline(bulletMatch[1])}</span>
      </div>
    );
    return <div key={i} style={{marginBottom:2}}>{renderInline(line)}</div>;
});
}
function renderInline(text) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part,j) => {
          if (part.startsWith('**')&&part.endsWith('**')) return <strong key={j} style={{color:C.amber,fontWeight:600}}>{part.slice(2,-2)}</strong>;
    return <span key={j}>{part}</span>;
});
}

// ----
// KELLY PANEL
// psirtContext prop — the plain-text PSIRT string from buildPsirtContext().
// Passed to /api/chat so buildKellyPrompt() injects it into the system prompt.
// ----
function KellyPanel({data, go, psirtContext}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [briefing, setBriefing] = useState(null);
    const [briefingLoading, setBriefingLoading] = useState(true);
    const [streaming, setStreaming] = useState(false);

  const fabricRisk = data.fabricAnalysis?.risk || "LOW";
    const p1 = data.priorityAssessment?.items?.[0];
    const mismatch = data.fabricAnalysis?.mismatches?.[0];
    const verifiedItems = data.netwrkrIntel?.items?.filter(i=>i.verified) || [];
    const verifiedCount = verifiedItems.length;

  // Fabric context string for /api/chat — structured summary of the analysis results
  const fabricContextStr = JSON.stringify({
        priorityAssessment: data.priorityAssessment,
        fabricAnalysis:     data.fabricAnalysis,
        devices:            data.devices,
        netwrkrIntel:       data.netwrkrIntel,
  });

  useEffect(() => {
        const generateBriefing = async () => {
                try {
                          const cscIds = verifiedItems.map(i=>i.id).filter(Boolean).join(", ");
                          const summary = `${verifiedCount > 0 ? verifiedCount + " verified advisories: " + cscIds + "." : "No verified advisories."} Priority: ${p1?.title || "no critical issues"}. Fabric risk: ${fabricRisk}. ${mismatch ? "Mismatch: " + mismatch : "No version mismatches."}`;
                          const hasVerifiedHigh = verifiedItems.some(i => i.sev === "HIGH" || i.sev === "CRITICAL");
                          // Language tier instruction moves into the user message so we can drop the system override
                  // and let buildKellyPrompt() in chat.js run with full psirtContext injected.
                  const languageInstruction = hasVerifiedHigh
                            ? `A verified HIGH severity Cisco advisory is present — use strong, direct language about the risk.`
                              : `The risk here is version drift, a best-practice violation not a verified outage cause. Use measured language only: "bad practice", "should be resolved before the next change window". Do not say: critical, severe, split-brain, blackholing, cascades, showstopper, or immediately (unless a verified CVE requires it).`;

                  await streamChat(
                            { fabricContext: fabricContextStr, psirtContext: psirtContext || null, messages: [{
                                            role: "user",
                                            content: `Give me a direct engineer's briefing on this fabric: ${summary}. Lead with the most urgent issue. Max 3 sentences, then a single concrete next action on a new line prefixed with →. ${languageInstruction}`,
                            }] },
                            (acc) => { setBriefingLoading(false); setBriefing(acc); }
                  );
                } catch {
                          setBriefing("Analysis complete. Ask me anything about your fabric.");
                } finally {
                          setBriefingLoading(false);
                }
        };
        generateBriefing();
  }, []);

  // Reads /api/chat as a plain-text token stream. Errors come back as JSON before the
  // stream starts (response not ok), so we surface those; otherwise we append tokens live.
  const streamChat = async (body, onText) => {
        const res = await fetch("/api/chat", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify(body),
        });
        if (!res.ok) {
                let msg = "Something went wrong. Please try again.";
                try { const e = await res.json(); if (e.message) msg = e.message; } catch {}
                throw new Error(msg);
        }
        if (!res.body || !res.body.getReader) {           // fallback if streaming unsupported
                const t = await res.text();
                onText(t);
                return t;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                if (chunk) { acc += chunk; onText(acc); }
        }
        return acc;
  };

  const sendMessage = async (text) => {
        if (!text.trim()) return;
        const userMsg = {role:"user", content:text};
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);
        try {
                await streamChat(
                        { fabricContext: fabricContextStr, psirtContext: psirtContext || null, messages: newMessages },
                        (acc) => { setLoading(false); setStreaming(true); setMessages([...newMessages, {role:"assistant", content: acc}]); }
                );
        } catch (e) {
                setMessages([...newMessages, {role:"assistant", content: e.message || "Something went wrong. Please try again."}]);
        } finally {
                setLoading(false);
                setStreaming(false);
        }
  };

  const suggestions = verifiedCount > 0 ? [
        "What is the safe upgrade sequence?",
        "Write a manager summary with CSC IDs",
        "What validation steps after upgrade?",
        "Draft a change request for the P1",
      ] : [
        "What is the safe upgrade sequence?",
        "Write a manager summary",
        "How urgent is the P1?",
        "What validation steps after upgrade?",
      ];

  return (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 20px",display:"flex",flexDirection:"column",gap:14,boxShadow:`0 2px 12px ${C.shadow}`}}>
      <div style={{display:"flex",alignItems:"center",gap:9,paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
        <div style={{width:28,height:28,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:11,fontWeight:700,color:C.amber,flexShrink:0}}>K</div>
        <div>
            <div style={{fontFamily:mono,fontSize:13,fontWeight:600,color:C.text}}>Kelly</div>
          <div style={{fontSize:11,color:C.muted}}>DC engineer assistant</div>
  </div>
        <span style={{marginLeft:"auto",fontFamily:mono,fontSize:10,color:C.green,background:C.greenG,border:`1px solid ${C.green}33`,padding:"2px 8px",borderRadius:3}}>● online</span>
  </div>

      <div>
          <div style={{fontFamily:mono,fontSize:10,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>// briefing</div>
        <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
          <div style={{width:26,height:26,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:10,fontWeight:700,color:C.amber,flexShrink:0,marginTop:2}}>K</div>
          <div style={{background:C.hi,border:`1px solid ${C.border}`,borderRadius:"0 8px 8px 8px",padding:"12px 14px",fontSize:13,lineHeight:1.7,color:C.text,flex:1}}>
{briefingLoading
              ? <span style={{color:C.muted,fontFamily:mono,fontSize:12}}>analysing your fabric▌</span>
              : renderMarkdown(briefing)
}
</div>
  </div>
  </div>

{messages.length === 0 && (
          <div>
            <div style={{fontFamily:mono,fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>// ask kelly</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
{suggestions.map((s,i)=>(
                <button key={i} onClick={()=>sendMessage(s)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:11,padding:"5px 11px",borderRadius:20,cursor:"pointer"}}>
{s} →
  </button>
            ))}
              </div>
              </div>
      )}

{messages.length > 0 && (
          <div ref={el=>{if(el)el.scrollTop=el.scrollHeight;}} style={{display:"flex",flexDirection:"column",gap:10}}>
{messages.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row"}}>
              {m.role==="assistant"&&<div style={{width:24,height:24,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:10,fontWeight:700,color:C.amber,flexShrink:0,marginTop:2}}>K</div>}
              <div style={{
                                background:m.role==="user"?C.amberG:C.hi,
                                border:`1px solid ${m.role==="user"?C.amber+"44":C.border}`,
                                borderRadius:m.role==="user"?"8px 0 8px 8px":"0 8px 8px 8px",
                                padding:"10px 13px",fontSize:13,lineHeight:1.7,
                                color:C.text,maxWidth:"85%"
              }}>
{m.role==="user" ? m.content : <>{renderMarkdown(m.content)}{streaming && i===messages.length-1 && <span style={{display:"inline-block",width:7,height:13,background:C.amber,marginLeft:3,verticalAlign:"middle",animation:"blink 1.05s step-end infinite"}}/>}</>}
</div>
  </div>
          ))}
{loading&&(
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <div style={{width:24,height:24,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:10,fontWeight:700,color:C.amber,flexShrink:0}}>K</div>
              <div style={{background:C.hi,border:`1px solid ${C.border}`,borderRadius:"0 8px 8px 8px",padding:"10px 13px",fontFamily:mono,fontSize:12,color:C.muted}}>thinking▌</div>
  </div>
          )}
</div>
      )}

      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage(input)}
                    placeholder="Ask Kelly about your fabric..."
            style={{flex:1,background:C.hi,border:`1px solid ${C.border}`,color:C.text,fontFamily:mono,fontSize:12,padding:"9px 13px",borderRadius:6,outline:"none"}}/>
          <button onClick={()=>sendMessage(input)} style={{background:C.amber,border:"none",color:"#FFF",fontFamily:mono,fontSize:12,fontWeight:700,padding:"9px 13px",borderRadius:6,cursor:"pointer",flexShrink:0}}>→</button>
              </div>
        <div style={{fontSize:11,color:C.muted,marginTop:7,textAlign:"center"}}>
          <span style={{color:C.amber,cursor:"pointer"}} onClick={()=>go("signup")}>upgrade to Desert Point for real SNTC data →</span>
              </div>
              </div>
              </div>
  );
}

function VerifiedAdvisoryCard({item}) {
    const [open, setOpen] = useState(false);
    const sev = SEV[item.sev]||SEV.MEDIUM;
    return (
          <div style={{marginBottom:8}}>
      <div onClick={()=>setOpen(!open)} style={{background:C.blueG,border:`1.5px solid ${C.blueBd}`,borderRadius:open?"8px 8px 0 0":8,padding:"12px 14px",cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>{item.title}</span>
{item.id&&<span style={{fontFamily:mono,fontSize:10,color:C.blue,background:C.blueG,border:`1px solid ${C.blueBd}`,padding:"1px 7px",borderRadius:3}}>{item.id}</span>}
              <Badge level={item.sev} sm/>
  </div>
            <div style={{fontSize:12,color:C.muted}}>{item.platform} · {item.version}</div>
  </div>
          <span style={{fontFamily:mono,fontSize:11,color:C.blue,flexShrink:0}}>{open?"▲":"details ↓"}</span>
  </div>
  </div>
{open&&(
          <div style={{background:C.surface,border:`1.5px solid ${C.blueBd}`,borderTop:"none",borderRadius:"0 0 8px 8px",padding:"14px 16px"}}>
          <div style={{background:C.hi,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 16px",marginBottom:10}}>
{item.cvss&&<div><div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:2}}>CVSS SCORE</div><div style={{fontFamily:mono,fontSize:13,fontWeight:600,color:sev.color}}>{item.cvss}</div></div>}
{item.fixedVersion&&<div><div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:2}}>FIXED VERSION</div><div style={{fontFamily:mono,fontSize:13,fontWeight:600,color:C.green}}>{item.fixedVersion}</div></div>}
{item.affectedVersions&&<div><div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:2}}>AFFECTED</div><div style={{fontFamily:mono,fontSize:12,color:C.dim}}>{item.affectedVersions}</div></div>}
{item.published&&<div><div style={{fontFamily:mono,fontSize:10,color:C.muted,marginBottom:2}}>PUBLISHED</div><div style={{fontFamily:mono,fontSize:12,color:C.dim}}>{item.published}</div></div>}
  </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:`1px solid ${C.border}`}}>
              <span style={{fontFamily:mono,fontSize:10,color:C.green}}>✓ verified — Cisco PSIRT API</span>
{item.id&&<a onClick={()=>posthog.capture('intel_card_verify_clicked')} href={`https://tools.cisco.com/security/center/content/CiscoSecurityAdvisory/${item.id}`} target="_blank" rel="noreferrer" style={{fontFamily:mono,fontSize:11,color:C.blue,textDecoration:"none"}}>view on cisco.com →</a>}
  </div>
  </div>
          <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{item.detail}</div>
  </div>
      )}
</div>
  );
}

function Results({data, reset, go, showNudge, onDismissNudge, psirtContext}) {
    const riskColor = {LOW:C.green, MEDIUM:C.yellow, HIGH:C.orange, CRITICAL:C.red};
    const fabricRisk = data.fabricAnalysis?.risk || "LOW";
    const verifiedItems = (data.netwrkrIntel?.items||[]).filter(i=>i.verified);
    const unverifiedItems = (data.netwrkrIntel?.items||[]).filter(i=>!i.verified);
    const verifiedCount = verifiedItems.length;
    const mismatchCount = data.fabricAnalysis?.mismatches?.length||0;

  return (
        <div style={{animation:"fadeUp 0.3s ease"}}>
{showNudge&&(
          <div style={{background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:4}}>// save your analysis history</div>
            <div style={{fontSize:13,color:C.dim}}>Create a free account to keep your analyses.</div>
  </div>
          <div style={{display:"flex",gap:9,flexShrink:0}}>
            <button onClick={onDismissNudge} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,fontFamily:mono,fontSize:11,padding:"7px 12px",borderRadius:6,cursor:"pointer"}}>dismiss</button>
            <button onClick={()=>go("signup")} style={{background:C.amber,border:"none",color:"#FFF",fontFamily:mono,fontSize:11,fontWeight:700,padding:"7px 14px",borderRadius:6,cursor:"pointer"}}>create_account()</button>
  </div>
  </div>
      )}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.1em",textTransform:"uppercase"}}>// analysis complete</span>
{verifiedCount>0&&<span style={{fontFamily:mono,fontSize:10,color:C.blue,background:C.blueG,border:`1px solid ${C.blueBd}`,padding:"2px 8px",borderRadius:3}}>{verifiedCount} cisco verified</span>}
{mismatchCount>0&&<span style={{fontFamily:mono,fontSize:10,color:C.red,background:SEV.CRITICAL.bg,border:`1px solid ${SEV.CRITICAL.bd}`,padding:"2px 8px",borderRadius:3}}>{mismatchCount} mismatch{mismatchCount!==1?"es":""}</span>}
          <span style={{fontFamily:mono,fontSize:10,color:C.muted,background:C.hi,border:`1px solid ${C.border}`,padding:"2px 8px",borderRadius:3}}>{data.devices?.length||0} devices</span>
  </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={reset} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"7px 13px",borderRadius:6,cursor:"pointer"}}>← new_analysis()</button>
          <button style={{background:C.amber,border:"none",color:"#FFF",fontFamily:mono,fontSize:12,fontWeight:700,padding:"7px 13px",borderRadius:6,cursor:"pointer"}} onClick={()=>{ try{posthog.capture('export_clicked');}catch{} exportReport(data); }}>export_report()</button>
  </div>
  </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,alignItems:"start"}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 20px",display:"flex",flexDirection:"column",gap:16,boxShadow:`0 2px 12px ${C.shadow}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:12,borderBottom:`1px solid ${C.border}`}}>
            <span style={{fontFamily:mono,fontSize:12,fontWeight:600,color:C.text}}>Fabric analysis</span>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:riskColor[fabricRisk]||C.green,background:(riskColor[fabricRisk]||C.green)+"18",border:`1px solid ${(riskColor[fabricRisk]||C.green)}40`,padding:"2px 10px",borderRadius:3}}>{fabricRisk} RISK</span>
  </div>

          <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.blueBd}44`}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:C.blue}}/>
              <span style={{fontFamily:mono,fontSize:11,fontWeight:600,color:C.blue,letterSpacing:"0.1em",textTransform:"uppercase"}}>cisco verified advisories</span>
              <span style={{marginLeft:"auto",fontFamily:mono,fontSize:10,color:C.blue,background:C.blueG,border:`1px solid ${C.blueBd}`,padding:"1px 8px",borderRadius:3}}>live PSIRT</span>
  </div>
{verifiedItems.length>0
               ? verifiedItems.map((item,i)=><VerifiedAdvisoryCard key={i} item={item}/>)
                : <div style={{background:C.greenG,border:`1px solid ${C.green}30`,borderRadius:6,padding:"10px 13px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:C.green,fontSize:14,flexShrink:0}}>✓</span>
                                                     <div>
                                                       <div style={{fontFamily:mono,fontSize:12,color:C.green,marginBottom:2}}>No advisories found</div>
                                                       <div style={{fontSize:12,color:C.dim}}>Cisco PSIRT returned no known advisories for the versions in this fabric.</div>
  </div>
  </div>
}
</div>

{data.priorityAssessment?.items&&(
              <div>
                <div style={{fontFamily:mono,fontSize:10,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10,paddingBottom:7,borderBottom:`1px solid ${C.border}`}}>// priorities</div>
{data.priorityAssessment.items.map((item,i)=>{
                  const pColor=i===0?C.red:i===1?C.orange:C.yellow;
                  return (
                                      <div key={i} style={{background:C.hi,border:`1px solid ${C.border}`,borderLeft:`2px solid ${pColor}`,borderRadius:"0 6px 6px 0",padding:"10px 13px",marginBottom:7}}>
                                                       <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:pColor,background:pColor+"18",border:`1px solid ${pColor}40`,padding:"1px 7px",borderRadius:3}}>{item.priority}</span>
                      <span style={{fontSize:13,fontWeight:500,color:C.text}}>{item.title}</span>
  </div>
                    <div style={{fontSize:12,color:C.dim,marginLeft:36,lineHeight:1.5}}>{item.reason}</div>
  </div>
                );
})}
  </div>
          )}

{data.fabricAnalysis?.mismatches?.length>0&&(
              <div>
                <div style={{fontFamily:mono,fontSize:10,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10,paddingBottom:7,borderBottom:`1px solid ${C.border}`}}>// fabric risk</div>
              <div style={{background:SEV.HIGH.bg,border:`1px solid ${SEV.HIGH.bd}`,borderRadius:6,padding:"10px 13px"}}>
                <div style={{fontFamily:mono,fontSize:10,color:C.orange,marginBottom:5}}>// version mismatch</div>
{data.fabricAnalysis.mismatches.map((m,i)=><div key={i} style={{fontSize:12,color:C.dim}}>{m}</div>)}
                                    </div>
                                    </div>
                                              )}

{unverifiedItems.length>0&&(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:7,borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontFamily:mono,fontSize:10,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase"}}>// netwrkr intel</span>
                <span style={{marginLeft:"auto",fontFamily:mono,fontSize:10,color:C.orange,background:SEV.HIGH.bg,border:`1px solid ${SEV.HIGH.bd}`,padding:"1px 8px",borderRadius:3}}>⚠ unverified</span>
  </div>
{unverifiedItems.map((item,i)=>{
                  const s=SEV[item.sev]||SEV.MEDIUM;
                  return (
                                      <div key={i} style={{border:`1px solid ${s.bd}`,borderRadius:6,padding:"9px 12px",marginBottom:7,background:s.bg}}>
                                         <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                      <Badge level={item.sev} sm/>
                        <span style={{fontSize:12,fontWeight:500,color:C.text}}>{item.title}</span>
                      <span style={{fontFamily:mono,fontSize:10,color:C.muted}}>{item.platform}</span>
  </div>
                    <div style={{fontSize:12,color:C.dim,lineHeight:1.5,marginBottom:6}}>{item.detail}</div>
                    <button onClick={()=>go("signup")} style={{background:"none",border:`1px solid ${C.amber}44`,color:C.amber,fontFamily:mono,fontSize:10,padding:"2px 9px",borderRadius:3,cursor:"pointer"}}>verify with enterprise →</button>
  </div>
                );
})}
</div>
          )}

{data.devices?.length>0&&(
              <div>
                <div style={{fontFamily:mono,fontSize:10,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10,paddingBottom:7,borderBottom:`1px solid ${C.border}`}}>// devices</div>
              <div style={{background:C.hi,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden"}}>
{data.devices.map((d,di)=>{
                    const dotColor=SEV[d.fabricRisk]?.color||C.green;
                    const countMatch = d.name?.match(/\(x(\d+)\)$/);
                    const count = countMatch ? parseInt(countMatch[1], 10) : (d.count || 1);
                    const cleanName = countMatch ? d.name.replace(/\s*\(x\d+\)$/, "") : d.name;
                    return (
                                          <div key={di} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:di<data.devices.length-1?`1px solid ${C.border}`:"none",fontSize:12}}>
                                        <div style={{width:7,height:7,borderRadius:"50%",background:dotColor,flexShrink:0}}/>
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                        <span style={{fontWeight:500,color:C.text}}>{cleanName}</span>
                        <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>v{d.ver}</span>
                        <span style={{fontFamily:mono,fontSize:9,color:C.muted,background:C.faint,padding:"1px 5px",borderRadius:2}}>{d.role}</span>
{count > 1 && <span style={{fontFamily:mono,fontSize:10,fontWeight:700,color:C.amber,background:C.amberG,border:`1px solid ${C.amber}44`,padding:"1px 7px",borderRadius:3}}>x{count}</span>}
  </div>
                      <Badge level={d.fabricRisk} sm/>
  </div>
                  );
})}
  </div>
  </div>
          )}
</div>

        <div style={{alignSelf:"flex-start"}}>
          <KellyPanel data={data} go={go} psirtContext={psirtContext}/>
            </div>
            </div>
            </div>
  );
}

function SignupGate({onComplete, onDismiss}) {
    return (
          <div style={{position:"fixed",inset:0,background:"rgba(247,245,240,0.92)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"36px 44px",width:420,boxShadow:`0 8px 40px ${C.shadow}`}}>
        <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:12}}>// free analysis used</div>
        <h2 style={{fontSize:20,fontWeight:300,marginBottom:10,color:C.text}}>Create a free account to continue</h2>
        <p style={{fontSize:13,color:C.dim,marginBottom:20}}>Get 5 analyses/month free. No credit card required.</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onDismiss} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:12,padding:"10px",borderRadius:6,cursor:"pointer"}}>skip for now</button>
          <button onClick={onComplete} style={{flex:1,background:C.amber,border:"none",color:"#FFF",fontFamily:mono,fontWeight:700,fontSize:12,padding:"10px",borderRadius:6,cursor:"pointer"}}>create_account()</button>
  </div>
  </div>
  </div>
  );
}

function Analyse({go}) {
    const { session } = useAuth();
    const [screen,setScreen]             = useState("paste");
    const [rawInput,setRawInput]         = useState("");
    const [ctx,setCtx]                   = useState("");
    const [parsing,setParsing]           = useState(false);
    const [devices,setDevices]           = useState([]);
    const [progress,setProgress]         = useState(null);
    const [results,setResults]           = useState(null);
    const [advisoryMap,setAdvisoryMap]   = useState({});
    const [psirtContext,setPsirtContext] = useState(null); // ← threaded to KellyPanel
  const [showGate,setShowGate]         = useState(false);
    const [showNudge,setShowNudge]       = useState(false);
    const [reviewFilter,setReviewFilter] = useState("all");
    const [extractError,setExtractError] = useState(null);
    const [analysisError,setAnalysisError] = useState(null);
    const ref = useRef();

  const authHeaders = () => ({
        "Content-Type": "application/json",
        ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
  });

  const groupDevices = (rawDevices) => {
        const map = new Map();
        rawDevices.forEach(d => {
                const key = `${d.name}__${d.ver || ""}__${d.role || ""}`;
                if (map.has(key)) { map.get(key).count += 1; }
                else { map.set(key, { ...d, verMissing: !d.ver?.trim(), count: 1 }); }
        });
        return Array.from(map.values());
  };

  const expandGroups = (groupedDevices) => {
        return groupedDevices.flatMap(d => Array(d.count).fill(null).map(() => ({ ...d })));
  };

  const parseInput = async () => {
        if (!rawInput.trim()) return;
        setParsing(true);
        setExtractError(null);
        try {
                const res = await fetch("/api/extract", { method:"POST", headers:authHeaders(), body:JSON.stringify({text:rawInput}) });
                const data = await res.json();
                if (data.error) throw new Error(data.message||data.error);
                setDevices(groupDevices(data.devices));
                posthog.capture('paste_submitted');
                setScreen("review");
        } catch(e) {
                console.error("Extract error:",e);
                setExtractError(e.message || "Extraction failed — try again, or contact support if this keeps happening.");
                posthog.capture('extract_failed', { error: e.message });
        }
        setParsing(false);
  };

  const updateDevice = (i, field, val) => setDevices(prev => prev.map((d, idx) => {
        if (idx !== i) return d;
        return { ...d, [field]: val, verMissing: field === "ver" ? !val.trim() : d.verMissing, modified: { ...d.modified, [field]: true } };
  }));
    const removeDevice = (i) => setDevices(prev => prev.filter((_, idx) => idx !== i));
    const totalDeviceCount = devices.reduce((sum, d) => sum + (d.count || 1), 0);
    const missingVersions = devices.filter(d=>d.verMissing).length;
    const canAnalyse = devices.length > 0;

  const fetchAdvisoriesForDevices = async (devList, onResult) => {
        const aciFabric = isAciFabric(devList);
        const resultMap = {};
        const seen = new Set();
        const uniqueDevices = devList.filter(d => {
                if (!d.ver || d.ver === "not provided") return false;
                const key = `${d.name}__${d.ver}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
        });
        await Promise.all(uniqueDevices.map(async (d) => {
                try {
                          const aciSwitch = isAciManagedSwitch(d, aciFabric);
                          const res = await fetch("/api/advisories", { method:"POST", headers:authHeaders(), body:JSON.stringify({platform:d.name,version:d.ver,isAciSwitch:aciSwitch}) });
                          const data = await res.json();
                          resultMap[`${d.name}__${d.ver}`] = data;
                          if (onResult) onResult({ name: d.name, ver: d.ver, count: Array.isArray(data.advisories) ? data.advisories.length : 0 });
                } catch(e) { console.error("Advisory fetch failed for",d.name,e); if (onResult) onResult({ name: d.name, ver: d.ver, count: 0, error: true }); }
        }));
        return resultMap;
  };

  const attemptAnalysis = () => {
        const count = getCount();
        posthog.capture('extraction_confirmed', { device_count: devices.length });
        const registered = isRegistered();
        if (count >= 3 && !registered) {
                posthog.capture('quota_gate_hit', { analyses_used: count, analyses_limit: 3 });
                setShowGate(true); return;
        }
        runAnalysis();
  };

  const runAnalysis = async () => {
        setShowGate(false);
        setAnalysisError(null);
        posthog.capture('analysis_run', { device_count: devices.length, preflight_status: missingVersions > 0 ? 'has_missing' : 'clean' });
        setScreen("analysing");

        const groups = devices.length;
        const totalDevices = devices.reduce((sum, d) => sum + (d.count || 1), 0);
        const platforms = new Set(
                devices.filter(d => d.ver && d.ver.trim() && d.ver !== "not provided").map(d => `${d.name}__${d.ver}`)
        ).size;
        setProgress({ phase: "psirt", devices: totalDevices, groups, platforms, advisories: null, ticks: [] });

        const advMap = await fetchAdvisoriesForDevices(devices, (t) => setProgress(prev => prev ? ({ ...prev, ticks: [...(prev.ticks || []), t] }) : prev));
        setAdvisoryMap(advMap);
        const advisoryCount = Object.values(advMap).reduce((n, r) => n + ((r && Array.isArray(r.advisories)) ? r.advisories.length : 0), 0);

        // Build psirtContext string from raw advisory results — threaded to KellyPanel
        const devicesWithVersions = devices.filter(d => d.ver && d.ver.trim() && d.ver !== "not provided");
        const builtPsirtContext = buildPsirtContext(advMap, devicesWithVersions);
        setPsirtContext(builtPsirtContext);

        setProgress(prev => ({ ...(prev || {}), phase: "analysing", advisories: advisoryCount }));

        try {
                const dedupedDevices = devices.map(d =>
                          (d.count || 1) > 1 ? { ...d, name: `${d.name} (x${d.count})` } : d
                                                         );
                const res = await fetch("/api/advisories", { method:"POST", headers:authHeaders(), body:JSON.stringify({runAnalysis:true,devices:dedupedDevices,ctx,advisoryMap:advMap}) });
                const parsed = await res.json();
                if (parsed.error) throw new Error(parsed.message||parsed.error);
                incCount();
                setResults(parsed);
                setScreen("results");
                setProgress(null);
                if (getCount()===3&&!isRegistered()) setShowNudge(true);
        } catch(e) {
                setResults(null);
                setProgress(null);
                setAnalysisError(e.message || "Analysis failed — try again, or contact support if this keeps happening.");
                setScreen("review");
                console.error("Analysis error:",e);
                posthog.capture('analysis_failed', { error: e.message, device_count: devices.length });
        }
  };

  const reset = () => {
        setScreen("paste"); setRawInput(""); setDevices([]); setCtx(""); setResults(null);
        setProgress(null); setShowNudge(false); setAdvisoryMap({}); setReviewFilter("all");
        setPsirtContext(null); setExtractError(null); setAnalysisError(null);
  };

  const inp = {fontFamily:mono,fontSize:13,background:C.hi,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"11px 13px",width:"100%",outline:"none",lineHeight:1.7};

  return (
        <div style={{maxWidth:1100,margin:"0 auto",padding:"34px 36px"}}>
{screen==="analysing"&&<Overlay progress={progress}/>}
{showGate&&<SignupGate onComplete={()=>go("signup")} onDismiss={()=>{ setShowGate(false); runAnalysis(); }}/>}

{screen==="paste"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:20,alignItems:"start"}}>
          <div>
              <div style={{marginBottom:20}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>// step 1 of 3</div>
              <h1 style={{fontSize:24,fontWeight:300,letterSpacing:"-0.03em",marginBottom:4,color:C.text}}>Paste your inventory</h1>
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
              <label style={{fontFamily:mono,fontSize:11,color:C.muted,display:"block",marginBottom:6,letterSpacing:"0.08em"}}>CONTEXT <span style={{color:C.border}}> // optional</span></label>
              <textarea value={ctx} onChange={e=>setCtx(e.target.value)} rows={2} placeholder="e.g. ACI fabric, VXLAN/EVPN, vPC pairs on leaf layer" style={{...inp,resize:"none"}}/>
                </div>
            <button onClick={parseInput} disabled={!rawInput.trim()||parsing}
              style={{background:rawInput.trim()&&!parsing?C.amber:C.hi,color:rawInput.trim()&&!parsing?"#FFF":C.muted,border:`1px solid ${rawInput.trim()&&!parsing?C.amber:C.border}`,borderRadius:8,fontFamily:mono,fontWeight:700,fontSize:14,padding:"13px",cursor:rawInput.trim()&&!parsing?"pointer":"not-allowed",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
{parsing?<><span style={{width:14,height:14,border:`2px solid ${C.amber}33`,borderTopColor:C.amber,borderRadius:"50%",animation:"spin .7s linear infinite"}}/> extracting_devices()</>:"extract_devices() →"}
</button>
{extractError&&(
                <div style={{background:SEV.CRITICAL.bg,border:`1px solid ${SEV.CRITICAL.bd}`,borderRadius:6,padding:"9px 12px",marginTop:9,fontSize:12,color:C.red,fontFamily:mono}}>
                ⚠ {extractError}
</div>
            )}
            <div style={{fontFamily:mono,fontSize:11,color:C.muted,textAlign:"center",marginTop:7}}>// we will show you what we found before running</div>
</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",boxShadow:`0 1px 6px ${C.shadow}`}}>
              <div style={{fontFamily:mono,fontSize:11,color:C.amber,marginBottom:10,letterSpacing:"0.1em",textTransform:"uppercase"}}>// works with anything</div>
{[["CSV file","Platform, Version, Role columns"],["Spreadsheet paste","Any column order"],["show version output","Cisco CLI output"],["Free text","4 spines on 10.2(4)"],["DCIM export","Most formats supported"]].map(([t,s])=>(
                  <div key={t} style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{color:C.amber,flexShrink:0,fontFamily:mono,fontSize:11}}>→</span>
                  <div><div style={{fontSize:13,fontWeight:500,color:C.text}}>{t}</div><div style={{fontSize:11,color:C.muted}}>{s}</div></div>
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

{screen==="review"&&(
          <div style={{animation:"fadeUp 0.3s ease"}}>
          <div style={{marginBottom:22}}>
            <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>// step 2 of 3</div>
            <h1 style={{fontSize:24,fontWeight:300,letterSpacing:"-0.03em",marginBottom:4,color:C.text}}>Confirm your devices</h1>
            <p style={{fontSize:13,color:C.dim,lineHeight:1.7}}>We found {totalDeviceCount} device{totalDeviceCount!==1?"s":""} across {devices.length} unique platform group{devices.length!==1?"s":""}. Check the details are correct — especially software versions — then run the analysis.</p>
  </div>

{devices.length > 8 && (() => {
              const mismatchCount = (() => {
                              const byRole = {};
                              devices.forEach(d => { if (!byRole[d.role]) byRole[d.role]=[]; byRole[d.role].push(d.ver); });
                              return devices.filter(d => {
                                                const versions = byRole[d.role] || [];
                                                const unique = [...new Set(versions.filter(Boolean))];
                                                return unique.length > 1;
                              }).length;
              })();
              const missingCount = devices.filter(d=>d.verMissing).length;
              const modifiedCount = devices.filter(d=>d.modified?.ver||d.modified?.role).length;
              const issueCount = mismatchCount + missingCount;
              return (
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                                        <span style={{fontFamily:mono,fontSize:10,color:C.muted,letterSpacing:"0.08em"}}>// show:</span>
{[
                    ["all",`all ${devices.length}`],
                    ["issues", issueCount > 0 ? `issues (${issueCount})` : "issues"],
                    ["missing", missingCount > 0 ? `missing version (${missingCount})` : "missing version"],
                    ["modified", modifiedCount > 0 ? `modified (${modifiedCount})` : "modified"],
                  ].map(([key,label])=>(
                                      <button key={key} onClick={()=>setReviewFilter(key)}
                      style={{background:reviewFilter===key?C.amber:"none",color:reviewFilter===key?"#FFF":C.muted,border:`1px solid ${reviewFilter===key?C.amber:C.border}`,fontFamily:mono,fontSize:10,padding:"4px 10px",borderRadius:4,cursor:"pointer"}}>
{label}
</button>
                ))}
                  </div>
            );
})()}

  {isAciFabric(devices)&&(
              <div style={{background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{color:C.amber,fontSize:16,flexShrink:0}}>ℹ</span>
              <div>
                  <div style={{fontFamily:mono,fontSize:12,color:C.amber,marginBottom:3}}>// ACI fabric detected</div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>APIC found in inventory. Nexus switches will be queried using their ACI NX-OS version (APIC major version + 10).</div>
  </div>
  </div>
          )}
{missingVersions>0&&(
              <div style={{background:SEV.HIGH.bg,border:`1px solid ${SEV.HIGH.bd}`,borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{color:C.orange,fontSize:16,flexShrink:0}}>⚠</span>
              <div>
                  <div style={{fontFamily:mono,fontSize:12,color:C.orange,marginBottom:3}}>// {missingVersions} device{missingVersions!==1?"s":""} missing version</div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>Bug analysis requires software version. Add versions below or run without them.</div>
  </div>
  </div>
          )}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:16,boxShadow:`0 1px 6px ${C.shadow}`}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 60px 32px",gap:0,background:C.hi,padding:"10px 16px",borderBottom:`1px solid ${C.border}`}}>
{["PLATFORM","VERSION","ROLE","COUNT",""].map(h=><div key={h} style={{fontFamily:mono,fontSize:10,color:C.muted,letterSpacing:"0.1em"}}>{h}</div>)}
                                              </div>
                                              {(() => {
                const byRole = {};
                devices.forEach(d => { if (!byRole[d.role]) byRole[d.role]=[]; byRole[d.role].push(d.ver); });
                const filteredDevices = devices.filter((d) => {
                                  if (reviewFilter === "all") return true;
                                  const roleVersions = [...new Set((byRole[d.role]||[]).filter(Boolean))];
                                  const hasMismatch = roleVersions.length > 1;
                                  if (reviewFilter === "issues") return d.verMissing || hasMismatch || d.modified?.ver || d.modified?.role;
                                  if (reviewFilter === "missing") return d.verMissing;
                                  if (reviewFilter === "modified") return d.modified?.ver || d.modified?.role;
                                  return true;
                });
                const hidden = devices.length - filteredDevices.length;
                return (<>
                {filteredDevices.map((d)=>{
                                    const originalIdx = devices.indexOf(d);
                                    const count = d.count || 1;
                                    return (
                                                          <div key={originalIdx} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 60px 32px",gap:0,padding:"10px 16px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                                                           <div style={{fontFamily:mono,fontSize:13,color:C.text,paddingRight:8}}>{d.name}</div>
                                                                      <div style={{paddingRight:8}}>
                                                                        <input value={d.ver} onChange={e=>updateDevice(originalIdx,"ver",e.target.value)} placeholder="e.g. 9.3(9)"
                                                                          style={{background:d.verMissing?SEV.HIGH.bg:d.modified?.ver?"#FFFBF0":"transparent",border:`1px solid ${d.verMissing?SEV.HIGH.bd:d.modified?.ver?C.amber:C.border}`,color:d.verMissing?C.orange:d.modified?.ver?C.amber:C.text,fontFamily:mono,fontSize:12,padding:"4px 8px",borderRadius:4,outline:"none",width:"100%"}}/>
 {d.modified?.ver&&<div style={{fontFamily:mono,fontSize:9,color:C.amber,marginTop:2,letterSpacing:"0.04em"}}>// modified — applies to all {count} device{count!==1?"s":""}</div>}
   </div>
                       <div style={{paddingRight:8}}>
                        <input value={d.role} onChange={e=>updateDevice(originalIdx,"role",e.target.value)} placeholder="e.g. Leaf"
                          style={{background:d.modified?.role?"#FFFBF0":"transparent",border:`1px solid ${d.modified?.role?C.amber:C.border}`,color:d.modified?.role?C.amber:C.dim,fontFamily:mono,fontSize:12,padding:"4px 8px",borderRadius:4,outline:"none",width:"100%"}}/>
{d.modified?.role&&<div style={{fontFamily:mono,fontSize:9,color:C.amber,marginTop:2,letterSpacing:"0.04em"}}>// modified</div>}
</div>
                      <div style={{paddingRight:8}}>
{count > 1
                           ? <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:C.amber,background:C.amberG,border:`1px solid ${C.amber}44`,padding:"2px 8px",borderRadius:3}}>x{count}</span>
                          : <span style={{fontFamily:mono,fontSize:11,color:C.muted}}>x1</span>
}
</div>
                      <button onClick={()=>removeDevice(originalIdx)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:"2px"}}>✕</button>
  </div>
                  );
})}
{hidden > 0 && (
                    <div style={{padding:"10px 16px",fontFamily:mono,fontSize:11,color:C.muted,textAlign:"center",borderBottom:`1px solid ${C.border}`}}>
                    // {hidden} group{hidden!==1?"s":""} hidden by filter —
                    <span style={{color:C.amber,cursor:"pointer",marginLeft:4}} onClick={()=>setReviewFilter("all")}>show all</span>
  </div>
                )}
</>);
})()}
  </div>
{analysisError&&(
              <div style={{background:SEV.CRITICAL.bg,border:`1px solid ${SEV.CRITICAL.bd}`,borderRadius:8,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{color:C.red,fontSize:16,flexShrink:0}}>⚠</span>
              <div>
                  <div style={{fontFamily:mono,fontSize:12,color:C.red,marginBottom:3}}>// analysis failed</div>
                <div style={{fontSize:13,color:C.dim,lineHeight:1.6}}>{analysisError}</div>
  </div>
  </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setScreen("paste")} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,fontFamily:mono,fontSize:13,padding:"12px 20px",borderRadius:8,cursor:"pointer"}}>← back()</button>
            <button onClick={attemptAnalysis} disabled={!canAnalyse}
              style={{flex:1,background:canAnalyse?C.amber:C.hi,color:canAnalyse?"#FFF":C.muted,border:`1px solid ${canAnalyse?C.amber:C.border}`,borderRadius:8,fontFamily:mono,fontWeight:700,fontSize:14,padding:"13px",cursor:canAnalyse?"pointer":"not-allowed"}}>
              run_analysis() →
                </button>
                </div>
          <div style={{fontFamily:mono,fontSize:11,color:C.muted,textAlign:"center",marginTop:7}}>
{missingVersions>0?`// ${missingVersions} device${missingVersions!==1?"s":""} will be analysed for topology issues only`:"// all devices have version data — full analysis enabled"}
</div>
  </div>
      )}

{screen==="results"&&results&&(
          <Results data={results} reset={reset} go={go} showNudge={showNudge} onDismissNudge={()=>setShowNudge(false)} psirtContext={psirtContext}/>
        )}
  </div>
  );
}

export default function AnalysisApp() {
    const { session } = useAuth();
    const go = p => {
          if (p==="login")    { window.location.href="/login";    return; }
          if (p==="signup")   { window.location.href="/signup";   return; }
          if (p==="settings") { window.location.href="/settings"; return; }
          window.scrollTo?.(0,0);
    };
    return (
          <div style={{background:C.bg,color:C.text,minHeight:"100vh",fontFamily:sans,display:"flex",flexDirection:"column"}}>
      <style>{`
              @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
                      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
                              ::selection{background:#D4A00040;color:#8B6400;}
                                      ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
                                              @keyframes fadeUp{from{opacity:0;transform:translateY(11px);}to{opacity:1;transform:translateY(0);}}
                                                      @keyframes spin{to{transform:rotate(360deg);}}
                                                              @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
                                                              @keyframes blink{0%,49%{opacity:1;}50%,100%{opacity:0;}}
                                                              @keyframes termline{from{opacity:0;transform:translateY(3px);}to{opacity:1;transform:translateY(0);}}
                                                                    `}</style>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <Nav go={go} authed={!!session}/>
        <div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <Analyse go={go}/>
  </div>
  </div>
  </div>
  );
}
