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

export function Badge({ level, sm, theme = C }) {
  const s = theme.sev[level] || theme.sev.LOW;
  return <span style={{fontFamily:mono,fontSize:sm?9:11,fontWeight:700,color:s.color,background:s.bg,border:`1px solid ${s.bd}`,padding:sm?"1px 6px":"2px 9px",borderRadius:6}}>{level}</span>;
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
export function DeviceReviewCard({ devices, onChange, onConfirm, onCancel, confirmed, securityNote, theme = C }) {
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
    <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:22, padding:"20px 24px", maxWidth:720, width:"100%", fontFamily:sans, boxShadow:"0 1px 2px rgba(26,24,16,0.04), 0 16px 40px rgba(26,24,16,0.06)" }}>
      <div style={{ fontSize:11, fontWeight:600, color:theme.amber, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Confirm your devices</div>
      <div style={{ fontSize:13.5, color:theme.dim, lineHeight:1.6, marginBottom:14 }}>
        Found {totalDeviceCount} device{totalDeviceCount!==1?"s":""} across {devices.length} unique platform group{devices.length!==1?"s":""}. Check the details — especially software versions — then confirm.
      </div>

      {securityNote && !confirmed && (
        <div style={{ background:theme.greenG, border:`1px solid ${theme.green}30`, padding:"8px 11px", marginBottom:12, fontSize:11, color:theme.dim, lineHeight:1.6 }}>
          No hostnames, IPs, or credentials needed. <a href="/security" target="_blank" rel="noreferrer" style={{ color:theme.green }}>See our security approach →</a>
        </div>
      )}

      {aciFabric && (
        <div style={{ background:theme.amberG, border:`1px solid ${theme.amber}44`, padding:"8px 11px", marginBottom:10, fontSize:12, color:theme.dim }}>
          <span style={{ color:theme.amber }}>ℹ</span> ACI fabric detected — Nexus switches will be queried using their ACI NX-OS version.
        </div>
      )}
      {missingVersions > 0 && (
        <div style={{ background:theme.sev.HIGH.bg, border:`1px solid ${theme.sev.HIGH.bd}`, padding:"8px 11px", marginBottom:10, fontSize:12, color:theme.dim }}>
          <span style={{ color:theme.sev.HIGH.color }}>⚠</span> {missingVersions} device{missingVersions!==1?"s":""} missing version — add below or confirm to analyse topology only.
        </div>
      )}

      {devices.length > 8 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {[["all",`all ${devices.length}`],["issues","issues"],["missing","missing version"],["modified","modified"]].map(([key,label])=>(
            <button key={key} onClick={()=>setFilter(key)} disabled={confirmed}
              style={{ background:filter===key?theme.amber:"none", color:filter===key?theme.onAmber:theme.muted, border:`1px solid ${filter===key?theme.amber:theme.border}`, fontFamily:mono, fontSize:10, padding:"4px 10px", cursor:confirmed?"default":"pointer" }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr 1fr 44px 28px", background:theme.hi, padding:"8px 12px", borderBottom:`1px solid ${theme.border}` }}>
          {["PLATFORM","VERSION","ROLE","CT",""].map(h=><div key={h} style={{ fontFamily:mono, fontSize:9, color:theme.muted, letterSpacing:"0.08em" }}>{h}</div>)}
        </div>
        {filteredDevices.map((d)=>{
          const originalIdx = devices.indexOf(d);
          const count = d.count || 1;
          return (
            <div key={originalIdx} style={{ display:"grid", gridTemplateColumns:"2fr 1.3fr 1fr 44px 28px", padding:"8px 12px", borderBottom:`1px solid ${theme.faint}`, alignItems:"center" }}>
              <div style={{ fontFamily:mono, fontSize:12, color:theme.text, paddingRight:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</div>
              <input value={d.ver||""} disabled={confirmed} onChange={e=>updateDevice(originalIdx,"ver",e.target.value)} placeholder="e.g. 9.3(9)"
                style={{ background:d.verMissing?theme.sev.HIGH.bg:"transparent", border:`1px solid ${d.verMissing?theme.sev.HIGH.bd:theme.border}`, color:d.verMissing?theme.sev.HIGH.color:theme.text, fontFamily:mono, fontSize:11, padding:"3px 6px", outline:"none", width:"90%" }}/>
              <input value={d.role||""} disabled={confirmed} onChange={e=>updateDevice(originalIdx,"role",e.target.value)} placeholder="Role"
                style={{ background:"transparent", border:`1px solid ${theme.border}`, color:theme.dim, fontFamily:mono, fontSize:11, padding:"3px 6px", outline:"none", width:"90%" }}/>
              <div style={{ fontFamily:mono, fontSize:10, color:count>1?theme.amber:theme.muted }}>x{count}</div>
              {!confirmed && <button onClick={()=>removeDevice(originalIdx)} style={{ background:"none", border:"none", color:theme.muted, cursor:"pointer" }}>✕</button>}
            </div>
          );
        })}
        {hidden > 0 && (
          <div style={{ padding:"8px 12px", fontFamily:mono, fontSize:10, color:theme.muted, textAlign:"center" }}>
            // {hidden} group{hidden!==1?"s":""} hidden by filter — <span style={{ color:theme.amber, cursor:"pointer" }} onClick={()=>setFilter("all")}>show all</span>
          </div>
        )}
      </div>

      {!confirmed ? (
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onCancel} style={{ background:"none", border:`1px solid ${theme.border}`, borderRadius:999, color:theme.dim, fontFamily:sans, fontSize:13, padding:"9px 18px", cursor:"pointer" }}>Cancel</button>
          <button onClick={onConfirm} disabled={!canConfirm}
            style={{ flex:1, background:canConfirm?theme.amber:theme.hi, color:canConfirm?theme.onAmber:theme.muted, border:`1px solid ${canConfirm?theme.amber:theme.border}`, borderRadius:999, fontFamily:sans, fontWeight:600, fontSize:13.5, padding:"10px", cursor:canConfirm?"pointer":"not-allowed" }}>
            Confirm and analyse
          </button>
        </div>
      ) : (
        <div style={{ fontSize:12.5, color:theme.green, fontFamily:sans }}>✓ Confirmed</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VERIFIED ADVISORY CARD
// ─────────────────────────────────────────────
function VerifiedAdvisoryCard({ item, theme = C }) {
  const [open, setOpen] = useState(false);
  const sev = theme.sev[item.sev] || theme.sev.MEDIUM;
  return (
    <div style={{ marginBottom:8 }}>
      <div onClick={()=>setOpen(!open)} style={{ background:theme.blueG, border:`1px solid ${theme.blueBd}`, borderRadius:open?"12px 12px 0 0":12, padding:"10px 12px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
              <span style={{ fontSize:13, fontWeight:600, color:theme.text }}>{item.title}</span>
              {item.id && <span style={{ fontFamily:mono, fontSize:10, color:theme.blue, background:theme.blueG, border:`1px solid ${theme.blueBd}`, padding:"1px 7px" }}>{item.id}</span>}
              <Badge level={item.sev} sm theme={theme}/>
            </div>
            <div style={{ fontSize:12, color:theme.muted }}>{item.platform} · {item.version}</div>
          </div>
          <span style={{ fontFamily:mono, fontSize:11, color:theme.blue, flexShrink:0 }}>{open?"▲":"details ↓"}</span>
        </div>
      </div>
      {open && (
        <div style={{ background:theme.surface, border:`1px solid ${theme.blueBd}`, borderTop:"none", borderRadius:"0 0 12px 12px", padding:"12px 14px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", marginBottom:10 }}>
            {item.cvss && <div><div style={{ fontFamily:mono, fontSize:10, color:theme.muted, marginBottom:2 }}>CVSS</div><div style={{ fontFamily:mono, fontSize:13, fontWeight:600, color:sev.color }}>{item.cvss}</div></div>}
            {item.fixedVersion && <div><div style={{ fontFamily:mono, fontSize:10, color:theme.muted, marginBottom:2 }}>FIXED VERSION</div><div style={{ fontFamily:mono, fontSize:13, fontWeight:600, color:theme.green }}>{item.fixedVersion}</div></div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8, borderTop:`1px solid ${theme.border}`, marginBottom:8 }}>
            <span style={{ fontFamily:mono, fontSize:10, color:theme.green }}>✓ verified — Cisco PSIRT API</span>
            {item.id && <a href={`https://tools.cisco.com/security/center/content/CiscoSecurityAdvisory/${item.id}`} target="_blank" rel="noreferrer" style={{ fontFamily:mono, fontSize:11, color:theme.blue }}>view on cisco.com →</a>}
          </div>
          <div style={{ fontSize:13, color:theme.dim, lineHeight:1.6 }}>{item.detail}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ANALYSIS RESULT CARD — condensed adaptation of AnalysisApp.js's Results dashboard,
// as a single in-chat card (risk badge, verified advisories, priorities, device table, export).
// ─────────────────────────────────────────────
export function ResultCard({ data, theme = C }) {
  const riskColor = { LOW:theme.green, MEDIUM:theme.yellow, HIGH:theme.orange, CRITICAL:theme.red };
  const fabricRisk = data.fabricAnalysis?.risk || "LOW";
  const verifiedItems = (data.netwrkrIntel?.items||[]).filter(i=>i.verified);
  const unverifiedItems = (data.netwrkrIntel?.items||[]).filter(i=>!i.verified);

  return (
    <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:18, padding:"20px 22px", maxWidth:660, fontFamily:sans, boxShadow:"0 1px 2px rgba(26,24,16,0.04), 0 12px 32px rgba(26,24,16,0.05)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:15, fontWeight:600, color:theme.text }}>Fabric risk: {fabricRisk[0] + fabricRisk.slice(1).toLowerCase()}</span>
          <span style={{ fontSize:11, fontWeight:700, color:riskColor[fabricRisk]||theme.green, background:(riskColor[fabricRisk]||theme.green)+"18", border:`1px solid ${(riskColor[fabricRisk]||theme.green)}40`, borderRadius:999, padding:"2px 10px" }}>{fabricRisk}</span>
        </div>
        <button onClick={()=>exportReport(data)} style={{ background:theme.hi, border:`1px solid ${theme.border}`, borderRadius:999, color:theme.dim, fontFamily:sans, fontSize:12.5, fontWeight:500, padding:"7px 14px", cursor:"pointer" }}>Export report</button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${theme.border}` }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:theme.blue }}/>
        <span style={{ fontSize:11, fontWeight:600, color:theme.blue, letterSpacing:"0.06em", textTransform:"uppercase" }}>Cisco-verified advisories</span>
        <span style={{ marginLeft:"auto", fontSize:10, color:theme.blue, background:theme.blueG, border:`1px solid ${theme.blueBd}`, borderRadius:999, padding:"1px 8px" }}>Live PSIRT</span>
      </div>
      {verifiedItems.length > 0
        ? verifiedItems.map((item,i)=><VerifiedAdvisoryCard key={i} item={item} theme={theme}/>)
        : (
          <div style={{ background:theme.greenG, border:`1px solid ${theme.green}30`, borderRadius:12, padding:"9px 12px", display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <span style={{ color:theme.green }}>✓</span>
            <div>
              <div style={{ fontFamily:mono, fontSize:12, color:theme.green, marginBottom:2 }}>No advisories found</div>
              <div style={{ fontSize:12, color:theme.dim }}>Cisco PSIRT returned no known advisories for the versions in this fabric.</div>
            </div>
          </div>
        )}

      {data.priorityAssessment?.items?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:theme.amber, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${theme.border}` }}>Priorities</div>
          {data.priorityAssessment.items.map((item,i)=>{
            const pColor = i===0?theme.red:i===1?theme.orange:theme.yellow;
            return (
              <div key={i} style={{ background:theme.hi, border:`1px solid ${theme.border}`, borderLeft:`2px solid ${pColor}`, borderRadius:10, padding:"9px 12px", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontFamily:mono, fontSize:10, fontWeight:700, color:pColor, background:pColor+"18", border:`1px solid ${pColor}40`, padding:"1px 7px" }}>{item.priority}</span>
                  <span style={{ fontSize:13, fontWeight:500, color:theme.text }}>{item.title}</span>
                </div>
                <div style={{ fontSize:12, color:theme.dim, marginLeft:4, lineHeight:1.5 }}>{item.reason}</div>
              </div>
            );
          })}
        </div>
      )}

      {data.fabricAnalysis?.mismatches?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:theme.amber, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${theme.border}` }}>Fabric risk</div>
          <div style={{ background:theme.sev.HIGH.bg, border:`1px solid ${theme.sev.HIGH.bd}`, borderRadius:10, padding:"9px 12px" }}>
            {data.fabricAnalysis.mismatches.map((m,i)=><div key={i} style={{ fontSize:12, color:theme.dim }}>{m}</div>)}
          </div>
        </div>
      )}

      {unverifiedItems.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${theme.border}` }}>
            <span style={{ fontSize:11, fontWeight:600, color:theme.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>netwrkr intel</span>
            <span style={{ marginLeft:"auto", fontFamily:mono, fontSize:10, color:theme.orange, background:theme.sev.HIGH.bg, border:`1px solid ${theme.sev.HIGH.bd}`, padding:"1px 8px" }}>⚠ unverified</span>
          </div>
          {unverifiedItems.map((item,i)=>{
            const s = theme.sev[item.sev] || theme.sev.MEDIUM;
            return (
              <div key={i} style={{ border:`1px solid ${s.bd}`, borderRadius:10, padding:"8px 11px", marginBottom:6, background:s.bg }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
                  <Badge level={item.sev} sm theme={theme}/>
                  <span style={{ fontSize:12, fontWeight:500, color:theme.text }}>{item.title}</span>
                  <span style={{ fontFamily:mono, fontSize:10, color:theme.muted }}>{item.platform}</span>
                </div>
                <div style={{ fontSize:12, color:theme.dim, lineHeight:1.5 }}>{item.detail}</div>
              </div>
            );
          })}
        </div>
      )}

      {data.devices?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:11, fontWeight:600, color:theme.amber, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, paddingBottom:6, borderBottom:`1px solid ${theme.border}` }}>Devices</div>
          <div style={{ background:theme.hi, border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden" }}>
            {data.devices.map((d,di)=>{
              const dotColor = theme.sev[d.fabricRisk]?.color || theme.green;
              const countMatch = d.name?.match(/\(x(\d+)\)$/);
              const count = countMatch ? parseInt(countMatch[1], 10) : (d.count || 1);
              const cleanName = countMatch ? d.name.replace(/\s*\(x\d+\)$/, "") : d.name;
              return (
                <div key={di} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 11px", borderBottom:di<data.devices.length-1?`1px solid ${theme.faint}`:"none", fontSize:12 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:dotColor, flexShrink:0 }}/>
                  <div style={{ flex:1, display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:500, color:theme.text }}>{cleanName}</span>
                    <span style={{ fontFamily:mono, fontSize:11, color:theme.muted }}>v{d.ver}</span>
                    <span style={{ fontFamily:mono, fontSize:9, color:theme.muted, background:theme.faint, padding:"1px 5px" }}>{d.role}</span>
                    {count > 1 && <span style={{ fontFamily:mono, fontSize:10, fontWeight:700, color:theme.amber, background:theme.amberG, border:`1px solid ${theme.amber}44`, padding:"1px 7px" }}>x{count}</span>}
                  </div>
                  <Badge level={d.fabricRisk} sm theme={theme}/>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
