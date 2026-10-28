// FabricAnalysisCards.js
// Fabric-analysis-in-chat cards for JCHome: a device-review card (confirm the extracted
// inventory) and a rich analysis-result card. Ported from AnalysisApp.js's paste→review→
// analysing→results flow, adapted from full-page screens into message-stream cards, and
// re-themed from AnalysisApp.js's light palette to the dark #080806/#D4A000 theme (ChatPrimitives.C)
// used across the rest of the new homepage.
//
// Device objects use the { name, ver, role, tier, isAciSwitch } shape /api/extract.js returns
// (note: the field is "ver", not "version" — AnalysisApp.js uses "ver" correctly; some legacy
// code in RinconChatPrototype.js/app reads "version" instead, a pre-existing bug left untouched
// on that route).

import { useState } from "react";
import { C, mono, sans } from './ChatPrimitives';

const SEV = {
  CRITICAL:{ color:"#F87171", bg:"rgba(239,68,68,0.08)",  bd:"rgba(239,68,68,0.35)" },
  HIGH:    { color:"#FB923C", bg:"rgba(249,115,22,0.08)", bd:"rgba(249,115,22,0.35)" },
  MEDIUM:  { color:"#EAB308", bg:"rgba(234,179,8,0.08)",  bd:"rgba(234,179,8,0.35)" },
  LOW:     { color:"#4ADE80", bg:"rgba(34,197,94,0.08)",  bd:"rgba(34,197,94,0.35)" },
};
const BLUE = "#60A5FA";
const BLUE_G = "rgba(96,165,250,0.1)";
const BLUE_BD = "rgba(96,165,250,0.35)";

export function Badge({ level, sm }) {
  const s = SEV[level] || SEV.LOW;
  return <span style={{fontFamily:mono,fontSize:sm?9:11,fontWeight:700,color:s.color,background:s.bg,border:`1px solid ${s.bd}`,padding:sm?"1px 6px":"2px 9px",borderRadius:3}}>{level}</span>;
}

export function isAciFabric(devList) {
  return devList.some(d => d.name && d.name.toUpperCase().includes("APIC"));
}
export function isAciManagedSwitch(device, aciFabric) {
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

// Converts an advMap (keyed by "name__ver") into the plain-text format api/chat.js's
// buildKellyPrompt()/buildJCPrompt() expect for PSIRT_DATA.
export function buildPsirtContext(advMap, devices) {
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
    if (!data.verified) { lines.push(`${device.name} v${device.ver}: API query failed or not supported`); continue; }
    const count = data.advisories?.length || 0;
    totalAdvisories += count;
    if (count === 0) {
      lines.push(`${device.name} v${device.ver} [${data.family||""}]: No advisories found — VERIFIED CLEAN`);
    } else {
      lines.push(`${device.name} v${device.ver} [${data.family||""}]: ${count} advisories`);
      const sorted = [...(data.advisories||[])].sort((a,b)=>({Critical:4,High:3,Medium:2,Low:1}[b.impact]||0)-({Critical:4,High:3,Medium:2,Low:1}[a.impact]||0));
      for (const adv of sorted.slice(0,5)) lines.push(`  - [${adv.impact?.toUpperCase()||"UNKNOWN"}] ${adv.id} — ${adv.title}${adv.firstFixed?` | Fixed: ${adv.firstFixed}`:""}`);
      if (count > 5) lines.push(`  - ... and ${count-5} more`);
    }
  }
  const queried = devices.filter(d => advMap[`${d.name}__${d.ver}`]?.verified).length;
  lines.push(`SUMMARY: ${totalAdvisories} total advisories across ${queried} devices queried`);
  return lines.join("\n");
}

export function buildReportText(data) {
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

export function exportReport(data) {
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

// ─────────────────────────────────────────────
// DEVICE REVIEW CARD — confirm the extracted inventory inline, in the conversation,
// before running PSIRT/analysis. Ported from AnalysisApp.js's "review" screen.
// ─────────────────────────────────────────────
export function DeviceReviewCard({ devices, onChange, onConfirm, onCancel, confirmed, securityNote }) {
  const [filter, setFilter] = useState("all");
  if (!devices) return null;

  const updateDevice = (i, field, val) => onChange(devices.map((d, idx) => {
    if (idx !== i) return d;
    return { ...d, [field]: val, verMissing: field === "ver" ? !val.trim() : d.verMissing, modified: { ...d.modified, [field]: true } };
  }));
  const removeDevice = (i) => onChange(devices.filter((_, idx) => idx !== i));

  const totalDeviceCount = devices.reduce((sum, d) => sum + (d.count || 1), 0);
  const missingVersions = devices.filter(d=>d.verMissing).length;
  const canConfirm = devices.length > 0;
  const aciFabric = isAciFabric(devices);

  const byRole = {};
  devices.forEach(d => { if (!byRole[d.role]) byRole[d.role]=[]; byRole[d.role].push(d.ver); });
  const filteredDevices = devices.filter((d) => {
    if (filter === "all") return true;
    const roleVersions = [...new Set((byRole[d.role]||[]).filter(Boolean))];
    const hasMismatch = roleVersions.length > 1;
    if (filter === "issues") return d.verMissing || hasMismatch || d.modified?.ver || d.modified?.role;
    if (filter === "missing") return d.verMissing;
    if (filter === "modified") return d.modified?.ver || d.modified?.role;
    return true;
  });
  const hidden = devices.length - filteredDevices.length;

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.amber}`, padding:"16px 18px", maxWidth:620, fontFamily:sans }}>
      <div style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>// confirm your devices</div>
      <div style={{ fontSize:13, color:C.dim, lineHeight:1.6, marginBottom:12 }}>
        Found {totalDeviceCount} device{totalDeviceCount!==1?"s":""} across {devices.length} unique platform group{devices.length!==1?"s":""}. Check the details — especially software versions — then confirm.
      </div>

      {securityNote && !confirmed && (
        <div style={{ background:C.greenG, border:`1px solid ${C.green}30`, padding:"8px 11px", marginBottom:12, fontSize:11, color:C.dim, lineHeight:1.6 }}>
          No hostnames, IPs, or credentials needed. <a href="/security" target="_blank" rel="noreferrer" style={{ color:C.green }}>See our security approach →</a>
        </div>
      )}

      {aciFabric && (
        <div style={{ background:C.amberG, border:`1px solid ${C.amber}44`, padding:"8px 11px", marginBottom:10, fontSize:12, color:C.dim }}>
          <span style={{ color:C.amber }}>ℹ</span> ACI fabric detected — Nexus switches will be queried using their ACI NX-OS version.
        </div>
      )}
      {missingVersions > 0 && (
        <div style={{ background:SEV.HIGH.bg, border:`1px solid ${SEV.HIGH.bd}`, padding:"8px 11px", marginBottom:10, fontSize:12, color:C.dim }}>
          <span style={{ color:SEV.HIGH.color }}>⚠</span> {missingVersions} device{missingVersions!==1?"s":""} missing version — add below or confirm to analyse topology only.
        </div>
      )}

      {devices.length > 8 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {[["all",`all ${devices.length}`],["issues","issues"],["missing","missing version"],["modified","modified"]].map(([key,label])=>(
            <button key={key} onClick={()=>setFilter(key)} disabled={confirmed}
              style={{ background:filter===key?C.amber:"none", color:filter===key?"#000":C.muted, border:`1px solid ${filter===key?C.amber:C.border}`, fontFamily:mono, fontSize:10, padding:"4px 10px", cursor:confirmed?"default":"pointer" }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ border:`1px solid ${C.border}`, marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr 1fr 44px 28px", background:C.hi, padding:"8px 12px", borderBottom:`1px solid ${C.border}` }}>
          {["PLATFORM","VERSION","ROLE","CT",""].map(h=><div key={h} style={{ fontFamily:mono, fontSize:9, color:C.muted, letterSpacing:"0.08em" }}>{h}</div>)}
        </div>
        {filteredDevices.map((d)=>{
          const originalIdx = devices.indexOf(d);
          const count = d.count || 1;
          return (
            <div key={originalIdx} style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr 1fr 44px 28px", padding:"8px 12px", borderBottom:`1px solid ${C.faint}`, alignItems:"center" }}>
              <div style={{ fontFamily:mono, fontSize:12, color:C.text, paddingRight:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</div>
              <input value={d.ver||""} disabled={confirmed} onChange={e=>updateDevice(originalIdx,"ver",e.target.value)} placeholder="e.g. 9.3(9)"
                style={{ background:d.verMissing?SEV.HIGH.bg:"transparent", border:`1px solid ${d.verMissing?SEV.HIGH.bd:C.border}`, color:d.verMissing?SEV.HIGH.color:C.text, fontFamily:mono, fontSize:11, padding:"3px 6px", outline:"none", width:"90%" }}/>
              <input value={d.role||""} disabled={confirmed} onChange={e=>updateDevice(originalIdx,"role",e.target.value)} placeholder="Role"
                style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.dim, fontFamily:mono, fontSize:11, padding:"3px 6px", outline:"none", width:"90%" }}/>
              <div style={{ fontFamily:mono, fontSize:10, color:count>1?C.amber:C.muted }}>x{count}</div>
              {!confirmed && <button onClick={()=>removeDevice(originalIdx)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer" }}>✕</button>}
            </div>
          );
        })}
        {hidden > 0 && (
          <div style={{ padding:"8px 12px", fontFamily:mono, fontSize:10, color:C.muted, textAlign:"center" }}>
            // {hidden} group{hidden!==1?"s":""} hidden by filter — <span style={{ color:C.amber, cursor:"pointer" }} onClick={()=>setFilter("all")}>show all</span>
          </div>
        )}
      </div>

      {!confirmed ? (
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onCancel} style={{ background:"none", border:`1px solid ${C.border}`, color:C.dim, fontFamily:mono, fontSize:12, padding:"9px 16px", cursor:"pointer" }}>cancel</button>
          <button onClick={onConfirm} disabled={!canConfirm}
            style={{ flex:1, background:canConfirm?C.amber:C.hi, color:canConfirm?"#000":C.muted, border:`1px solid ${canConfirm?C.amber:C.border}`, fontFamily:mono, fontWeight:700, fontSize:13, padding:"10px", cursor:canConfirm?"pointer":"not-allowed" }}>
            confirm_and_analyse() →
          </button>
        </div>
      ) : (
        <div style={{ fontFamily:mono, fontSize:11, color:C.green }}>✓ confirmed</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VERIFIED ADVISORY CARD (dark theme)
// ─────────────────────────────────────────────
function VerifiedAdvisoryCard({ item }) {
  const [open, setOpen] = useState(false);
  const sev = SEV[item.sev] || SEV.MEDIUM;
  return (
    <div style={{ marginBottom:8 }}>
      <div onClick={()=>setOpen(!open)} style={{ background:BLUE_G, border:`1px solid ${BLUE_BD}`, padding:"10px 12px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
              <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{item.title}</span>
              {item.id && <span style={{ fontFamily:mono, fontSize:10, color:BLUE, background:BLUE_G, border:`1px solid ${BLUE_BD}`, padding:"1px 7px" }}>{item.id}</span>}
              <Badge level={item.sev} sm/>
            </div>
            <div style={{ fontSize:12, color:C.muted }}>{item.platform} · {item.version}</div>
          </div>
          <span style={{ fontFamily:mono, fontSize:11, color:BLUE, flexShrink:0 }}>{open?"▲":"details ↓"}</span>
        </div>
      </div>
      {open && (
        <div style={{ background:C.surface, border:`1px solid ${BLUE_BD}`, borderTop:"none", padding:"12px 14px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", marginBottom:10 }}>
            {item.cvss && <div><div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginBottom:2 }}>CVSS</div><div style={{ fontFamily:mono, fontSize:13, fontWeight:600, color:sev.color }}>{item.cvss}</div></div>}
            {item.fixedVersion && <div><div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginBottom:2 }}>FIXED VERSION</div><div style={{ fontFamily:mono, fontSize:13, fontWeight:600, color:C.green }}>{item.fixedVersion}</div></div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${C.border}`, marginBottom:8 }}>
            <span style={{ fontFamily:mono, fontSize:10, color:C.green }}>✓ verified — Cisco PSIRT API</span>
            {item.id && <a href={`https://tools.cisco.com/security/center/content/CiscoSecurityAdvisory/${item.id}`} target="_blank" rel="noreferrer" style={{ fontFamily:mono, fontSize:11, color:BLUE }}>view on cisco.com →</a>}
          </div>
          <div style={{ fontSize:13, color:C.dim, lineHeight:1.6 }}>{item.detail}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ANALYSIS RESULT CARD — condensed adaptation of AnalysisApp.js's Results dashboard,
// as a single in-chat card (risk badge, verified advisories, priorities, device table, export).
// ─────────────────────────────────────────────
export function ResultCard({ data }) {
  const riskColor = { LOW:C.green, MEDIUM:C.yellow, HIGH:C.orange, CRITICAL:C.red };
  const fabricRisk = data.fabricAnalysis?.risk || "LOW";
  const verifiedItems = (data.netwrkrIntel?.items||[]).filter(i=>i.verified);
  const unverifiedItems = (data.netwrkrIntel?.items||[]).filter(i=>!i.verified);

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, padding:"18px 20px", maxWidth:620, fontFamily:sans }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.08em", textTransform:"uppercase" }}>// analysis complete</span>
          <span style={{ fontFamily:mono, fontSize:11, fontWeight:700, color:riskColor[fabricRisk]||C.green, background:(riskColor[fabricRisk]||C.green)+"18", border:`1px solid ${(riskColor[fabricRisk]||C.green)}40`, padding:"2px 10px" }}>{fabricRisk} RISK</span>
        </div>
        <button onClick={()=>exportReport(data)} style={{ background:C.amber, border:"none", color:"#000", fontFamily:mono, fontSize:12, fontWeight:700, padding:"7px 13px", cursor:"pointer" }}>export_report()</button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${BLUE_BD}` }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:BLUE }}/>
        <span style={{ fontFamily:mono, fontSize:11, fontWeight:600, color:BLUE, letterSpacing:"0.08em", textTransform:"uppercase" }}>cisco verified advisories</span>
        <span style={{ marginLeft:"auto", fontFamily:mono, fontSize:10, color:BLUE, background:BLUE_G, border:`1px solid ${BLUE_BD}`, padding:"1px 8px" }}>live PSIRT</span>
      </div>
      {verifiedItems.length > 0
        ? verifiedItems.map((item,i)=><VerifiedAdvisoryCard key={i} item={item}/>)
        : (
          <div style={{ background:C.greenG, border:`1px solid ${C.green}30`, padding:"9px 12px", display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <span style={{ color:C.green }}>✓</span>
            <div>
              <div style={{ fontFamily:mono, fontSize:12, color:C.green, marginBottom:2 }}>No advisories found</div>
              <div style={{ fontSize:12, color:C.dim }}>Cisco PSIRT returned no known advisories for the versions in this fabric.</div>
            </div>
          </div>
        )}

      {data.priorityAssessment?.items?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontFamily:mono, fontSize:10, color:C.amber, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>// priorities</div>
          {data.priorityAssessment.items.map((item,i)=>{
            const pColor = i===0?C.red:i===1?C.orange:C.yellow;
            return (
              <div key={i} style={{ background:C.hi, border:`1px solid ${C.border}`, borderLeft:`2px solid ${pColor}`, padding:"9px 12px", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontFamily:mono, fontSize:10, fontWeight:700, color:pColor, background:pColor+"18", border:`1px solid ${pColor}40`, padding:"1px 7px" }}>{item.priority}</span>
                  <span style={{ fontSize:13, fontWeight:500, color:C.text }}>{item.title}</span>
                </div>
                <div style={{ fontSize:12, color:C.dim, marginLeft:4, lineHeight:1.5 }}>{item.reason}</div>
              </div>
            );
          })}
        </div>
      )}

      {data.fabricAnalysis?.mismatches?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontFamily:mono, fontSize:10, color:C.amber, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>// fabric risk</div>
          <div style={{ background:SEV.HIGH.bg, border:`1px solid ${SEV.HIGH.bd}`, padding:"9px 12px" }}>
            {data.fabricAnalysis.mismatches.map((m,i)=><div key={i} style={{ fontSize:12, color:C.dim }}>{m}</div>)}
          </div>
        </div>
      )}

      {unverifiedItems.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontFamily:mono, fontSize:10, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase" }}>// netwrkr intel</span>
            <span style={{ marginLeft:"auto", fontFamily:mono, fontSize:10, color:C.orange, background:SEV.HIGH.bg, border:`1px solid ${SEV.HIGH.bd}`, padding:"1px 8px" }}>⚠ unverified</span>
          </div>
          {unverifiedItems.map((item,i)=>{
            const s = SEV[item.sev] || SEV.MEDIUM;
            return (
              <div key={i} style={{ border:`1px solid ${s.bd}`, padding:"8px 11px", marginBottom:6, background:s.bg }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
                  <Badge level={item.sev} sm/>
                  <span style={{ fontSize:12, fontWeight:500, color:C.text }}>{item.title}</span>
                  <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>{item.platform}</span>
                </div>
                <div style={{ fontSize:12, color:C.dim, lineHeight:1.5 }}>{item.detail}</div>
              </div>
            );
          })}
        </div>
      )}

      {data.devices?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontFamily:mono, fontSize:10, color:C.amber, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>// devices</div>
          <div style={{ background:C.hi, border:`1px solid ${C.border}` }}>
            {data.devices.map((d,di)=>{
              const dotColor = SEV[d.fabricRisk]?.color || C.green;
              const countMatch = d.name?.match(/\(x(\d+)\)$/);
              const count = countMatch ? parseInt(countMatch[1], 10) : (d.count || 1);
              const cleanName = countMatch ? d.name.replace(/\s*\(x\d+\)$/, "") : d.name;
              return (
                <div key={di} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 11px", borderBottom:di<data.devices.length-1?`1px solid ${C.faint}`:"none", fontSize:12 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:dotColor, flexShrink:0 }}/>
                  <div style={{ flex:1, display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:500, color:C.text }}>{cleanName}</span>
                    <span style={{ fontFamily:mono, fontSize:11, color:C.muted }}>v{d.ver}</span>
                    <span style={{ fontFamily:mono, fontSize:9, color:C.muted, background:C.faint, padding:"1px 5px" }}>{d.role}</span>
                    {count > 1 && <span style={{ fontFamily:mono, fontSize:10, fontWeight:700, color:C.amber, background:C.amberG, border:`1px solid ${C.amber}44`, padding:"1px 7px" }}>x{count}</span>}
                  </div>
                  <Badge level={d.fabricRisk} sm/>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
