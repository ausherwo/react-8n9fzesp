// ChatPrimitives.js
// Shared, auth-independent chat UI pieces used by both RinconChatPrototype (/app, authenticated)
// and JCHome (/, anonymous-friendly). Extracted so neither component duplicates ~400 lines of
// card/markdown rendering — pure presentational functions/components, no useAuth() inside.

import { useState } from "react";

export const C = {
  bg:      "#080806",
  surface: "#0E0D0A",
  hi:      "#141310",
  hi2:     "#1A1915",
  border:  "#272318",
  amber:   "#D4A000",
  amberB:  "#FFCA28",
  amberG:  "#D4A00015",
  green:   "#22C55E",
  greenG:  "#22C55E15",
  red:     "#EF4444",
  orange:  "#F97316",
  yellow:  "#EAB308",
  text:    "#EDE8DC",
  dim:     "#9C9278",
  muted:   "#524B3A",
  faint:   "#1A1810",
};

export const mono = "JetBrains Mono, Fira Code, monospace";
export const sans = "'DM Sans', system-ui, sans-serif";

export const ACCEPTED_TYPES = ['.txt', '.log', '.csv', '.conf', '.cfg', '.json', '.xlsx', '.xls'];
export const MAX_FILE_SIZE  = 5 * 1024 * 1024;

export function timeAgo(isoString) {
  if (!isoString) return "";
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function getInitials(name, email) {
  if (name) return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
  return email?.[0]?.toUpperCase() || '?';
}

export function preflightCheck(text) {
  const patterns = [
    { re: /\b(?:password|passwd|secret|credential|api.?key)\s*[=:]\s*\S+/gi, label: "credential" },
    { re: /\b(?:snmp.community|community.string)\s+\S+/gi, label: "SNMP community" },
    { re: /\b(?:username|user)\s+\w+\s+(?:password|secret)\s+\S+/gi, label: "username/password" },
  ];
  const warnings = [];
  for (const { re, label } of patterns) { if (re.test(text)) warnings.push(label); }
  return warnings;
}

export function tierLabel(tier) { return {1:"Controller",2:"Spine / Border Leaf",3:"Leaf",4:"Distribution / Firewall"}[tier] || "Unknown"; }
export function tierColor(tier) { return {1:C.amber,2:C.orange,3:C.green,4:C.dim}[tier] || C.muted; }

// ─────────────────────────────────────────────
// MARKDOWN RENDERER
// ─────────────────────────────────────────────
export function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { elements.push(<div key={i} style={{ height: '0.5em' }} />); i++; continue; }
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      elements.push(<div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ fontFamily: mono, fontSize: 12, color: C.amber, flexShrink: 0, minWidth: 18 }}>{numMatch[1]}.</span><span>{renderInline(numMatch[2])}</span></div>);
      i++; continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      elements.push(<div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: C.amber, flexShrink: 0 }}>→</span><span>{renderInline(bulletMatch[1])}</span></div>);
      i++; continue;
    }
    elements.push(<div key={i} style={{ marginBottom: 2 }}>{renderInline(line)}</div>);
    i++;
  }
  return elements;
}

export function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} style={{ color: C.amberB, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={j}>{part}</span>;
  });
}

export function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:C.amber, opacity:0.5, animation:`dotPulse 1.2s ease-in-out ${i*0.18}s infinite` }} />)}
    </div>
  );
}

export function BotAvatar() {
  return (
    <div style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", background:C.amberG, border:`1px solid ${C.amber}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ color:C.amber, fontSize:15 }}>◈</span>
    </div>
  );
}

export function UserAvatar({ member }) {
  const initials = member ? getInitials(member.name, member.email) : '?';
  return (
    <div style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", background:"rgba(212,160,0,0.12)", border:`1px solid rgba(212,160,0,0.25)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:mono, fontSize:11, fontWeight:700, color:C.amber }}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// FABRIC CONTEXT BANNER
// ─────────────────────────────────────────────
export function FabricContextBanner({ fabricFile, devices, onClear }) {
  const [expanded, setExpanded] = useState(false);
  if (!fabricFile) return null;
  const tierGroups = {};
  devices.forEach(d => { const t = d.tier||3; if (!tierGroups[t]) tierGroups[t]=[]; tierGroups[t].push(d); });
  return (
    <div style={{ background:`${C.amber}08`, border:`1px solid ${C.amber}30`, borderLeft:`3px solid ${C.amber}`, margin:"0 0 16px", animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", cursor:"pointer" }} onClick={() => setExpanded(v=>!v)}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:C.amber, fontFamily:mono, fontSize:12 }}>◈</span>
          <div>
            <div style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.06em" }}>Fabric context loaded</div>
            <div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginTop:2 }}>{fabricFile.name} · {devices.length} device{devices.length!==1?"s":""} extracted</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>{expanded?"▲ hide":"▼ show devices"}</span>
          <button onClick={e=>{ e.stopPropagation(); onClear(); }} style={{ background:"none", border:`1px solid rgba(192,57,43,0.3)`, color:"#E07060", fontFamily:mono, fontSize:10, padding:"3px 8px", cursor:"pointer" }}>clear</button>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop:`1px solid ${C.amber}20`, padding:"12px 14px" }}>
          <div style={{ fontFamily:mono, fontSize:9, color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Extracted inventory</div>
          {Object.entries(tierGroups).sort(([a],[b])=>Number(a)-Number(b)).map(([tier,devs])=>(
            <div key={tier} style={{ marginBottom:10 }}>
              <div style={{ fontFamily:mono, fontSize:9, color:tierColor(Number(tier)), marginBottom:5, letterSpacing:"0.1em" }}>// {tierLabel(Number(tier))}</div>
              {devs.map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 0", borderBottom:`1px solid ${C.faint}` }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:tierColor(Number(tier)), flexShrink:0 }} />
                  <span style={{ fontFamily:mono, fontSize:12, color:C.text, flex:1 }}>{d.name}</span>
                  {d.ver && <span style={{ fontFamily:mono, fontSize:11, color:C.dim }}>v{d.ver}</span>}
                  {d.role   && <span style={{ fontFamily:mono, fontSize:10, color:C.muted, background:C.faint, padding:"1px 6px" }}>{d.role}</span>}
                  {!d.ver && <span style={{ fontFamily:mono, fontSize:10, color:C.orange }}>no version</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FILE UPLOAD CARD
// ─────────────────────────────────────────────
export function FileUploadCard({ fileName, fileSize, status, warnings }) {
  const statusConfig = {
    uploading:  { color:C.amber,  icon:"⟳", label:"Uploading…" },
    extracting: { color:C.amber,  icon:"◈", label:"Extracting fabric data…" },
    done:       { color:C.green,  icon:"✓", label:"Fabric context loaded" },
    error:      { color:C.red,    icon:"✕", label:"Upload failed" },
    preflight:  { color:C.orange, icon:"⚠", label:"Sensitive data detected" },
  }[status] || { color:C.muted, icon:"…", label:status };
  const kb = fileSize ? `${(fileSize/1024).toFixed(1)} KB` : "";
  return (
    <div style={{ background:C.surface, border:`1px solid ${statusConfig.color}30`, borderLeft:`3px solid ${statusConfig.color}`, padding:"12px 16px", maxWidth:400 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <span style={{ color:statusConfig.color, fontFamily:mono, fontSize:14 }}>{statusConfig.icon}</span>
        <div>
          <div style={{ fontFamily:mono, fontSize:11, color:statusConfig.color }}>{statusConfig.label}</div>
          <div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginTop:2 }}>{fileName} {kb&&`· ${kb}`}</div>
        </div>
      </div>
      {warnings?.length>0 && (
        <div style={{ marginTop:8, padding:"8px 10px", background:`${C.orange}10`, border:`1px solid ${C.orange}30` }}>
          <div style={{ fontFamily:mono, fontSize:10, color:C.orange, marginBottom:4 }}>⚠ Possible sensitive data detected — review before proceeding:</div>
          {warnings.map((w,i)=><div key={i} style={{ fontFamily:mono, fontSize:10, color:C.dim }}>→ {w}</div>)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MESSAGE BUBBLE
// personaName/personaTitle let callers rebrand the assistant label
// (RinconChatPrototype keeps "Rincon · DC Expert"; JCHome passes "JC · Data Centre Copilot").
// extraCard lets a caller render a custom card for message types this module doesn't know about
// (e.g. JCHome's device-review / analysis-result / signup-gate cards).
// ─────────────────────────────────────────────
export function MessageBubble({ msg, member, personaName = "Rincon", personaTitle = "DC Expert", extraCard }) {
  const isUser = msg.role === "user";
  const isFile = msg.type === "file";
  const custom = extraCard ? extraCard(msg) : null;
  return (
    <div style={{ display:"flex", gap:14, marginTop:20, flexDirection:isUser?"row-reverse":"row", animation:"fadeUp 0.2s ease" }}>
      {isUser ? <UserAvatar member={member}/> : <BotAvatar/>}
      <div style={{ maxWidth:(isFile||custom)?"none":"78%" }}>
        {!isUser && !isFile && !custom && (
          <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:mono, fontSize:11, fontWeight:600, color:C.amber }}>{personaName}</span>
            <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>{personaTitle}</span>
          </div>
        )}
        {custom ? custom : msg.type==="psirt-progress"||msg.type==="psirt-done" ? (
          <div>
            <PSIRTProgress progress={msg.psirtProgress}/>
            {msg.type==="psirt-done" && msg.psirtSummary && (
              <div style={{ background:msg.psirtSummary.advisories>0?"rgba(239,68,68,0.06)":"rgba(34,197,94,0.06)", border:`1px solid ${msg.psirtSummary.advisories>0?"rgba(239,68,68,0.25)":"rgba(34,197,94,0.25)"}`, padding:"10px 14px", marginTop:4, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:mono, fontSize:12, color:msg.psirtSummary.advisories>0?C.red:C.green }}>{msg.psirtSummary.advisories>0?"⚠":"✓"}</span>
                <span style={{ fontFamily:mono, fontSize:11, color:C.dim }}>
                  PSIRT complete — {msg.psirtSummary.advisories>0?`${msg.psirtSummary.advisories} advisories found across ${msg.psirtSummary.total} devices`:`All ${msg.psirtSummary.total} devices checked — no advisories found`}
                </span>
              </div>
            )}
          </div>
        ) : isFile ? (
          <FileUploadCard {...msg.fileData}/>
        ) : (
          <div style={{ background:isUser?`${C.amber}12`:C.surface, border:`1px solid ${isUser?`${C.amber}25`:C.border}`, borderRadius:isUser?"12px 2px 12px 12px":"2px 12px 12px 12px", padding:"12px 16px" }}>
            <div style={{ fontSize:14, lineHeight:1.75, color:C.text, fontFamily:sans }}>
              {isUser ? msg.content : renderMarkdown(msg.content)}
            </div>
            <div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginTop:6, textAlign:isUser?"left":"right" }}>{timeAgo(msg.created_at)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONVERSATION SIDEBAR ITEM
// ─────────────────────────────────────────────
export function ConversationItem({ conv, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:"11px 16px", background:active?C.amberG:hov?C.hi:"transparent", borderLeft:`2px solid ${active?C.amber:"transparent"}`, cursor:"pointer", transition:"all 0.15s" }}>
      <div style={{ fontSize:12, color:active?C.text:C.dim, fontWeight:active?500:400, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {conv.title||"New conversation"}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>{timeAgo(conv.created_at)}</span>
        {conv.has_fabric && <span style={{ fontFamily:mono, fontSize:9, color:C.green, background:C.greenG, border:`1px solid ${C.green}30`, padding:"1px 5px" }}>fabric</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUGGESTION CHIPS — generic, takes its own list of suggestion strings.
// A suggestion whose text includes "Upload" fires onUpload instead of onSelect,
// matching RinconChatPrototype's original convention.
// ─────────────────────────────────────────────
export function SuggestionChips({ suggestions, onSelect, onUpload }) {
  return (
    <div style={{ padding:"0 24px 16px" }}>
      <div style={{ maxWidth:740, margin:"0 auto" }}>
        <div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginBottom:10, letterSpacing:"0.08em" }}>// suggested</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {suggestions.map(s=>(
            <button key={s} onClick={()=>s.includes("Upload")?onUpload?.():onSelect(s)}
              style={{ background:s.includes("Upload")?C.amberG:"transparent", border:`1px solid ${s.includes("Upload")?`${C.amber}44`:C.border}`, color:s.includes("Upload")?C.amber:C.dim, fontFamily:mono, fontSize:11, padding:"6px 13px", cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${C.amber}55`; e.currentTarget.style.color=C.text; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=s.includes("Upload")?`${C.amber}44`:C.border; e.currentTarget.style.color=s.includes("Upload")?C.amber:C.dim; }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DragOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:50, background:`${C.bg}E8`, backdropFilter:"blur(4px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:`2px dashed ${C.amber}`, animation:"fadeUp 0.15s ease", pointerEvents:"none" }}>
      <div style={{ fontSize:32, marginBottom:16, color:C.amber }}>↓</div>
      <div style={{ fontFamily:mono, fontSize:14, color:C.amber, letterSpacing:"0.08em" }}>Drop file to load fabric context</div>
      <div style={{ fontFamily:mono, fontSize:11, color:C.muted, marginTop:8 }}>.txt .log .csv .conf .cfg .json supported</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PSIRT PROGRESS
// ─────────────────────────────────────────────
export function PSIRTProgress({ progress }) {
  if (!progress) return null;
  const { total, done, results } = progress;
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  return (
    <div style={{ background:"#0A0E1A", border:`1px solid ${C.amber}30`, borderLeft:`3px solid ${C.amber}`, padding:"14px 16px", marginBottom:8, animation:"fadeUp 0.2s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:C.amber, fontFamily:mono, fontSize:12, animation:done<total?"spin 1s linear infinite":"none", display:"inline-block" }}>{done<total?"⟳":"✓"}</span>
          <span style={{ fontFamily:mono, fontSize:11, color:C.amber }}>{done<total?`Querying Cisco PSIRT API… ${done}/${total} devices`:`PSIRT query complete — ${total} devices checked`}</span>
        </div>
        <span style={{ fontFamily:mono, fontSize:11, color:C.muted }}>{pct}%</span>
      </div>
      <div style={{ height:3, background:"rgba(212,160,0,0.1)", marginBottom:10, overflow:"hidden" }}>
        <div style={{ height:"100%", background:C.amber, width:`${pct}%`, transition:"width 0.4s ease" }}/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {results.map((r,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontFamily:mono, fontSize:10 }}>
            <span style={{ color:r.status==="done"?C.green:r.status==="error"?C.red:r.status==="querying"?C.amber:C.muted, width:12, flexShrink:0 }}>
              {r.status==="done"?"✓":r.status==="error"?"✕":r.status==="querying"?"→":"○"}
            </span>
            <span style={{ color:r.status==="pending"?C.muted:C.dim, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name} {r.version?`v${r.version}`:"(no version)"}</span>
            {r.status==="done"&&r.count!==undefined && <span style={{ color:r.count>0?C.orange:C.green, flexShrink:0 }}>{r.count>0?`${r.count} advisory${r.count!==1?"s":""}`:""}</span>}
            {r.status==="skipped" && <span style={{ color:C.muted, flexShrink:0 }}>skipped — no version</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PSIRT QUERY — devices use the { name, ver } shape returned by /api/extract.
// ─────────────────────────────────────────────
export async function queryPSIRTForDevices(devices, session, onProgress) {
  const devicesWithVersions = devices.filter(d => d.ver && d.ver.trim());
  const devicesWithout      = devices.filter(d => !d.ver || !d.ver.trim());
  const isAci               = devices.some(d => d.name && d.name.toUpperCase().includes("APIC"));
  const initialResults = devices.map(d => ({ name:d.name, version:d.ver, status:d.ver?"pending":"skipped", count:undefined }));
  onProgress({ total:devicesWithVersions.length, done:0, results:initialResults });
  let done = 0;
  const results = [...initialResults];
  const advisoryResults = await Promise.all(
    devicesWithVersions.map(async (device) => {
      const idx = devices.indexOf(device);
      results[idx] = { ...results[idx], status:"querying" };
      onProgress({ total:devicesWithVersions.length, done, results:[...results] });
      try {
        const isAciSwitch = device.isAciSwitch !== undefined ? device.isAciSwitch
          : (isAci && (device.name.toUpperCase().includes("NEXUS")||device.name.toUpperCase().includes("N9K")||device.name.toUpperCase().includes("N7K")||device.name.toUpperCase().includes("N5K")||device.name.toUpperCase().includes("N3K")||device.name.toUpperCase().includes("MDS")));
        const res = await fetch("/api/advisories", {
          method:"POST",
          headers:{ "Content-Type":"application/json", ...(session?.access_token?{ "Authorization":`Bearer ${session.access_token}` }:{}) },
          body:JSON.stringify({ platform:device.name, version:device.ver, isAciSwitch }),
        });
        const data = await res.json();
        done++;
        const advisoryCount = data.advisories?.length || 0;
        results[idx] = { ...results[idx], status:"done", count:advisoryCount };
        onProgress({ total:devicesWithVersions.length, done, results:[...results] });
        return { device, data, advisoryCount, queryVersion:data.queryVersion||device.ver };
      } catch(err) {
        done++;
        results[idx] = { ...results[idx], status:"error" };
        onProgress({ total:devicesWithVersions.length, done, results:[...results] });
        return { device, data:null, advisoryCount:0, error:err.message };
      }
    })
  );
  const timestamp = new Date().toUTCString();
  const lines = [
    `PSIRT check ran: ${timestamp}`,
    `Devices queried: ${devicesWithVersions.length}`,
    "PSIRT ADVISORY RESULTS (live Cisco PSIRT API):",
  ];
  let totalAdvisories = 0;
  for (const { device, data, advisoryCount, queryVersion } of advisoryResults) {
    if (!data || !data.verified) { lines.push(`${device.name} v${device.ver}: API query failed or not supported`); continue; }
    totalAdvisories += advisoryCount;
    if (advisoryCount === 0) {
      lines.push(`${device.name} v${device.ver} [${data.family||""}]: No advisories found — VERIFIED CLEAN`);
    } else {
      const versionNote = (queryVersion && queryVersion !== device.ver) ? ` (queried as v${queryVersion} — ACI NX-OS mapping)` : "";
      lines.push(`${device.name} v${device.ver}${versionNote} [${data.family||""}]: ${advisoryCount} advisories`);
      const sorted = [...(data.advisories||[])].sort((a,b)=>({Critical:4,High:3,Medium:2,Low:1}[b.impact]||0)-({Critical:4,High:3,Medium:2,Low:1}[a.impact]||0));
      for (const adv of sorted.slice(0,5)) lines.push(`  - [${adv.impact?.toUpperCase()||"UNKNOWN"}] ${adv.id} — ${adv.title}${adv.firstFixed?` | Fixed: ${adv.firstFixed}`:""}`);
      if (advisoryCount > 5) lines.push(`  - ... and ${advisoryCount-5} more`);
    }
  }
  if (devicesWithout.length > 0) lines.push(`Devices with no version data (not queried): ${devicesWithout.map(d=>d.name).join(", ")}`);
  lines.push(`SUMMARY: ${totalAdvisories} total advisories across ${devicesWithVersions.length} devices queried`);
  return { psirtContext:lines.join("\n"), totalAdvisories, results:advisoryResults };
}
