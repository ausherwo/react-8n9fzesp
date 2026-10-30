// ChatPrimitives.js
// Shared, auth-independent chat UI pieces used by both RinconChatPrototype (/app, authenticated)
// and JCHome (/, anonymous-friendly). Extracted so neither component duplicates ~400 lines of
// card/markdown rendering — pure presentational functions/components, no useAuth() inside.

import { useState } from "react";

// DARK — the existing /app (RinconChatPrototype) theme. Unchanged values; every shared
// component below defaults to this theme so /app's appearance never changes.
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
  onAmber: "#000",
  sev: {
    CRITICAL: { color:"#F87171", bg:"rgba(239,68,68,0.08)",  bd:"rgba(239,68,68,0.35)" },
    HIGH:     { color:"#FB923C", bg:"rgba(249,115,22,0.08)", bd:"rgba(249,115,22,0.35)" },
    MEDIUM:   { color:"#EAB308", bg:"rgba(234,179,8,0.08)",  bd:"rgba(234,179,8,0.35)" },
    LOW:      { color:"#4ADE80", bg:"rgba(34,197,94,0.08)",  bd:"rgba(34,197,94,0.35)" },
  },
  blue:   "#60A5FA",
  blueG:  "rgba(96,165,250,0.1)",
  blueBd: "rgba(96,165,250,0.35)",
};

// LIGHT — the existing netwrkr.ai marketing-site palette (src/App.js's Home component,
// src/AnalysisApp.js), used by the new JC homepage per feedback that near-black read as
// off-brand next to the rest of the (deliberately light, polished) site.
export const LIGHT = {
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
  onAmber: "#FFF",
  sev: {
    CRITICAL: { color:"#C0392B", bg:"#FDF0EE", bd:"#E8A09A" },
    HIGH:     { color:"#C0620B", bg:"#FDF4EE", bd:"#E8B48A" },
    MEDIUM:   { color:"#8B7000", bg:"#FDF9EE", bd:"#D4C060" },
    LOW:      { color:"#1A7A3C", bg:"#EEF7F2", bd:"#8AC4A4" },
  },
  blue:   "#1A5C9C",
  blueG:  "#1A5C9C12",
  blueBd: "#2A6CAC",
};

export const mono = "JetBrains Mono, Fira Code, monospace";
export const sans = "'DM Sans', system-ui, sans-serif";
export const homeSerif = "'Source Serif 4', Georgia, serif";

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
export function renderMarkdown(text, theme = C) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { elements.push(<div key={i} style={{ height: '0.5em' }} />); i++; continue; }
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      elements.push(<div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ fontFamily: mono, fontSize: 12, color: theme.amber, flexShrink: 0, minWidth: 18 }}>{numMatch[1]}.</span><span>{renderInline(numMatch[2], theme)}</span></div>);
      i++; continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      elements.push(<div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: theme.amber, flexShrink: 0 }}>→</span><span>{renderInline(bulletMatch[1], theme)}</span></div>);
      i++; continue;
    }
    elements.push(<div key={i} style={{ marginBottom: 2 }}>{renderInline(line, theme)}</div>);
    i++;
  }
  return elements;
}

export function renderInline(text, theme = C) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j} style={{ color: theme.amberB, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={j}>{part}</span>;
  });
}

export function TypingDots({ theme = C }) {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:theme.amber, opacity:0.5, animation:`dotPulse 1.2s ease-in-out ${i*0.18}s infinite` }} />)}
    </div>
  );
}

export function BotAvatar({ theme = C }) {
  return (
    <div style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", background:theme.amberG, border:`1px solid ${theme.amber}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ color:theme.amber, fontSize:15 }}>◈</span>
    </div>
  );
}

export function UserAvatar({ member, theme = C }) {
  const initials = member ? getInitials(member.name, member.email) : '?';
  return (
    <div style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", background:`${theme.amber}1F`, border:`1px solid ${theme.amber}40`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:mono, fontSize:11, fontWeight:700, color:theme.amber }}>
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
export function FileUploadCard({ fileName, fileSize, status, warnings, pastedText, theme = C }) {
  const statusConfig = {
    uploading:  { color:theme.amber,  icon:"⟳", label:"Uploading…" },
    extracting: { color:theme.amber,  icon:"◈", label:"Extracting fabric data…" },
    done:       { color:theme.green,  icon:"✓", label:"Fabric context loaded" },
    error:      { color:theme.red,    icon:"✕", label:"Upload failed" },
    preflight:  { color:theme.orange, icon:"⚠", label:"Sensitive data detected" },
  }[status] || { color:theme.muted, icon:"…", label:status };
  const kb = fileSize ? `${(fileSize/1024).toFixed(1)} KB` : "";
  return (
    <div style={{ background:theme.surface, border:`1px solid ${statusConfig.color}30`, borderLeft:`3px solid ${statusConfig.color}`, padding:"12px 16px", maxWidth:400 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <span style={{ color:statusConfig.color, fontFamily:mono, fontSize:14 }}>{statusConfig.icon}</span>
        <div>
          <div style={{ fontFamily:mono, fontSize:11, color:statusConfig.color }}>{statusConfig.label}</div>
          <div style={{ fontFamily:mono, fontSize:10, color:theme.muted, marginTop:2 }}>{fileName} {kb&&`· ${kb}`}</div>
        </div>
      </div>
      {pastedText && (() => {
        const lines = pastedText.split("\n");
        const preview = lines.slice(0, 6);
        const truncated = lines.length > 6;
        return (
          <div style={{ marginTop:8, padding:"8px 10px", background:theme.hi, border:`1px solid ${theme.border}`, maxHeight:140, overflow:"hidden" }}>
            <pre style={{ margin:0, fontFamily:mono, fontSize:10.5, color:theme.dim, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {preview.join("\n")}{truncated && `\n… +${lines.length - 6} more lines`}
            </pre>
          </div>
        );
      })()}
      {warnings?.length>0 && (
        <div style={{ marginTop:8, padding:"8px 10px", background:`${theme.orange}10`, border:`1px solid ${theme.orange}30` }}>
          <div style={{ fontFamily:mono, fontSize:10, color:theme.orange, marginBottom:4 }}>⚠ Possible sensitive data detected — review before proceeding:</div>
          {warnings.map((w,i)=><div key={i} style={{ fontFamily:mono, fontSize:10, color:theme.dim }}>→ {w}</div>)}
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
// Copy-to-clipboard action under a plain-text JC reply. Kept to just the one functional
// action — a fuller feedback/regenerate row is a follow-up once that plumbing exists, rather
// than shipping decorative buttons that do nothing.
function MessageActions({ content, theme }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  return (
    <button onClick={copy} aria-label="Copy response" title={copied ? "Copied" : "Copy"}
      style={{ background:"none", border:"none", padding:0, marginTop:12, cursor:"pointer", color:theme.muted, display:"flex", alignItems:"center", gap:6, fontSize:12, fontFamily:sans }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="13" height="13" rx="2"/><path d="M8 17v1a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1"/></svg>
      {copied ? "Copied" : ""}
    </button>
  );
}

// ─────────────────────────────────────────────
// MESSAGE BUBBLE — "plain" mode (JCHome): no avatars, no bubble chrome for JC's replies
// (plain serif text + a copy action, Claude/ChatGPT-style), a light pill for the visitor's
// own messages. Everything else (device-review/result/signup-gate cards, PSIRT progress)
// still renders via extraCard, just without the avatar row around it.
// ─────────────────────────────────────────────
function PlainMessage({ msg, extraCard, theme }) {
  const isUser = msg.role === "user";
  const isFile = msg.type === "file";
  const custom = extraCard ? extraCard(msg) : null;

  if (custom) return <div style={{ marginTop:28 }}>{custom}</div>;

  if (msg.type === "psirt-progress" || msg.type === "psirt-done") {
    return (
      <div style={{ marginTop:28 }}>
        <PSIRTProgress progress={msg.psirtProgress} theme={theme}/>
        {msg.type === "psirt-done" && msg.psirtSummary && (
          <div style={{ background:msg.psirtSummary.advisories>0?`${theme.red}10`:`${theme.green}10`, border:`1px solid ${msg.psirtSummary.advisories>0?`${theme.red}40`:`${theme.green}40`}`, borderRadius:10, padding:"10px 14px", marginTop:8, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:13, color:msg.psirtSummary.advisories>0?theme.red:theme.green }}>{msg.psirtSummary.advisories>0?"⚠":"✓"}</span>
            <span style={{ fontSize:13, color:theme.dim, fontFamily:sans }}>
              PSIRT complete — {msg.psirtSummary.advisories>0?`${msg.psirtSummary.advisories} advisories found across ${msg.psirtSummary.total} devices`:`All ${msg.psirtSummary.total} devices checked — no advisories found`}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (isFile) {
    return <div style={{ marginTop:28, display:"flex", justifyContent:"flex-end" }}><FileUploadCard {...msg.fileData} theme={theme}/></div>;
  }

  if (isUser) {
    return (
      <div style={{ marginTop:28, display:"flex", justifyContent:"flex-end" }}>
        <div style={{ maxWidth:"72%", background:theme.hi2, borderRadius:18, padding:"10px 16px" }}>
          <div style={{ fontSize:15, lineHeight:1.6, color:theme.text, fontFamily:sans }}>{msg.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop:28 }}>
      <div style={{ fontSize:16.5, fontWeight:350, lineHeight:1.7, letterSpacing:"-0.005em", color:theme.text, fontFamily:homeSerif, maxWidth:640 }}>
        {renderMarkdown(msg.content, theme)}
      </div>
      {msg.content && <MessageActions content={msg.content} theme={theme}/>}
    </div>
  );
}

export function MessageBubble({ msg, member, personaName = "Rincon", personaTitle = "DC Expert", extraCard, theme = C, plain = false }) {
  const isUser = msg.role === "user";
  const isFile = msg.type === "file";
  const custom = extraCard ? extraCard(msg) : null;
  if (plain) return <PlainMessage msg={msg} extraCard={extraCard} theme={theme}/>;
  return (
    <div style={{ display:"flex", gap:14, marginTop:20, flexDirection:isUser?"row-reverse":"row", animation:"fadeUp 0.2s ease" }}>
      {isUser ? <UserAvatar member={member} theme={theme}/> : <BotAvatar theme={theme}/>}
      <div style={{ maxWidth:(isFile||custom)?"none":"78%" }}>
        {!isUser && !isFile && !custom && (
          <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:mono, fontSize:11, fontWeight:600, color:theme.amber }}>{personaName}</span>
            <span style={{ fontFamily:mono, fontSize:10, color:theme.muted }}>{personaTitle}</span>
          </div>
        )}
        {custom ? custom : msg.type==="psirt-progress"||msg.type==="psirt-done" ? (
          <div>
            <PSIRTProgress progress={msg.psirtProgress} theme={theme}/>
            {msg.type==="psirt-done" && msg.psirtSummary && (
              <div style={{ background:msg.psirtSummary.advisories>0?`${theme.red}10`:`${theme.green}10`, border:`1px solid ${msg.psirtSummary.advisories>0?`${theme.red}40`:`${theme.green}40`}`, padding:"10px 14px", marginTop:4, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:mono, fontSize:12, color:msg.psirtSummary.advisories>0?theme.red:theme.green }}>{msg.psirtSummary.advisories>0?"⚠":"✓"}</span>
                <span style={{ fontFamily:mono, fontSize:11, color:theme.dim }}>
                  PSIRT complete — {msg.psirtSummary.advisories>0?`${msg.psirtSummary.advisories} advisories found across ${msg.psirtSummary.total} devices`:`All ${msg.psirtSummary.total} devices checked — no advisories found`}
                </span>
              </div>
            )}
          </div>
        ) : isFile ? (
          <FileUploadCard {...msg.fileData} theme={theme}/>
        ) : (
          <div style={{ background:isUser?`${theme.amber}12`:theme.surface, border:`1px solid ${isUser?`${theme.amber}25`:theme.border}`, borderRadius:isUser?"12px 2px 12px 12px":"2px 12px 12px 12px", padding:"12px 16px" }}>
            <div style={{ fontSize:14, lineHeight:1.75, color:theme.text, fontFamily:sans }}>
              {isUser ? msg.content : renderMarkdown(msg.content, theme)}
            </div>
            <div style={{ fontFamily:mono, fontSize:10, color:theme.muted, marginTop:6, textAlign:isUser?"left":"right" }}>{timeAgo(msg.created_at)}</div>
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
export function SuggestionChips({ suggestions, onSelect, onUpload, theme = C }) {
  return (
    <div style={{ padding:"0 24px 16px" }}>
      <div style={{ maxWidth:740, margin:"0 auto" }}>
        <div style={{ fontFamily:mono, fontSize:10, color:theme.muted, marginBottom:10, letterSpacing:"0.08em" }}>// suggested</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {suggestions.map(s=>(
            <button key={s} onClick={()=>s.includes("Upload")?onUpload?.():onSelect(s)}
              style={{ background:s.includes("Upload")?theme.amberG:"transparent", border:`1px solid ${s.includes("Upload")?`${theme.amber}44`:theme.border}`, color:s.includes("Upload")?theme.amber:theme.dim, fontFamily:mono, fontSize:11, padding:"6px 13px", cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${theme.amber}55`; e.currentTarget.style.color=theme.text; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=s.includes("Upload")?`${theme.amber}44`:theme.border; e.currentTarget.style.color=s.includes("Upload")?theme.amber:theme.dim; }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DragOverlay({ visible, theme = C }) {
  if (!visible) return null;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:50, background:`${theme.bg}E8`, backdropFilter:"blur(4px)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:`2px dashed ${theme.amber}`, animation:"fadeUp 0.15s ease", pointerEvents:"none" }}>
      <div style={{ fontSize:32, marginBottom:16, color:theme.amber }}>↓</div>
      <div style={{ fontFamily:mono, fontSize:14, color:theme.amber, letterSpacing:"0.08em" }}>Drop file to load fabric context</div>
      <div style={{ fontFamily:mono, fontSize:11, color:theme.muted, marginTop:8 }}>.txt .log .csv .conf .cfg .json supported</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PSIRT PROGRESS
// ─────────────────────────────────────────────
export function PSIRTProgress({ progress, theme = C }) {
  if (!progress) return null;
  const { total, done, results } = progress;
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  return (
    <div style={{ background:theme.hi, border:`1px solid ${theme.amber}30`, borderLeft:`3px solid ${theme.amber}`, padding:"14px 16px", marginBottom:8, animation:"fadeUp 0.2s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:theme.amber, fontFamily:mono, fontSize:12, animation:done<total?"spin 1s linear infinite":"none", display:"inline-block" }}>{done<total?"⟳":"✓"}</span>
          <span style={{ fontFamily:mono, fontSize:11, color:theme.amber }}>{done<total?`Querying Cisco PSIRT API… ${done}/${total} devices`:`PSIRT query complete — ${total} devices checked`}</span>
        </div>
        <span style={{ fontFamily:mono, fontSize:11, color:theme.muted }}>{pct}%</span>
      </div>
      <div style={{ height:3, background:`${theme.amber}1A`, marginBottom:10, overflow:"hidden" }}>
        <div style={{ height:"100%", background:theme.amber, width:`${pct}%`, transition:"width 0.4s ease" }}/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {results.map((r,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontFamily:mono, fontSize:10 }}>
            <span style={{ color:r.status==="done"?theme.green:r.status==="error"?theme.red:r.status==="querying"?theme.amber:theme.muted, width:12, flexShrink:0 }}>
              {r.status==="done"?"✓":r.status==="error"?"✕":r.status==="querying"?"→":"○"}
            </span>
            <span style={{ color:r.status==="pending"?theme.muted:theme.dim, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name} {r.version?`v${r.version}`:"(no version)"}</span>
            {r.status==="done"&&r.count!==undefined && <span style={{ color:r.count>0?theme.orange:theme.green, flexShrink:0 }}>{r.count>0?`${r.count} advisory${r.count!==1?"s":""}`:""}</span>}
            {r.status==="skipped" && <span style={{ color:theme.muted, flexShrink:0 }}>skipped — no version</span>}
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
