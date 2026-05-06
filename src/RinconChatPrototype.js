// RinconChatPrototype.js — v4.1
// Fixes: PSIRT data now reaches Claude (Improvement 3)
// Fixes: API calls moved server-side via /api/chat and /api/extract (Improvement 1)

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import UserBadge from './UserBadge';

const C = {
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

const mono = "JetBrains Mono, Fira Code, monospace";
const sans = "'DM Sans', system-ui, sans-serif";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function timeAgo(isoString) {
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

function getInitials(name, email) {
  if (name) return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
  return email?.[0]?.toUpperCase() || '?';
}

function getJwtClaims() {
  try {
    const raw = localStorage.getItem('netwrkr-auth');
    if (!raw) return {};
    const token = JSON.parse(raw)?.access_token;
    if (!token) return {};
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return {}; }
}

const ACCEPTED_TYPES = ['.txt', '.log', '.csv', '.conf', '.cfg', '.json', '.xlsx', '.xls'];
const MAX_FILE_SIZE  = 5 * 1024 * 1024;

// ─────────────────────────────────────────────
// PRE-FLIGHT CHECK
// ─────────────────────────────────────────────
function preflightCheck(text) {
  const patterns = [
    { re: /\b(?:password|passwd|secret|credential|api.?key)\s*[=:]\s*\S+/gi, label: "credential" },
    { re: /\b(?:snmp.community|community.string)\s+\S+/gi, label: "SNMP community" },
    { re: /\b(?:username|user)\s+\w+\s+(?:password|secret)\s+\S+/gi, label: "username/password" },
  ];
  const warnings = [];
  for (const { re, label } of patterns) {
    if (re.test(text)) warnings.push(label);
  }
  return warnings;
}

function tierLabel(tier) {
  return {1:"Controller",2:"Spine / Border Leaf",3:"Leaf",4:"Distribution / Firewall"}[tier] || "Unknown";
}
function tierColor(tier) {
  return {1:C.amber,2:C.orange,3:C.green,4:C.dim}[tier] || C.muted;
}

// ─────────────────────────────────────────────
// TYPING DOTS
// ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"4px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:C.amber, opacity:0.5, animation:`dotPulse 1.2s ease-in-out ${i*0.18}s infinite` }} />
      ))}
    </div>
  );
}

function RinconAvatar() {
  return (
    <div style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", background:C.amberG, border:`1px solid ${C.amber}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ color:C.amber, fontSize:15 }}>◈</span>
    </div>
  );
}

function UserAvatar({ member }) {
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
function FabricContextBanner({ fabricFile, devices, onClear }) {
  const [expanded, setExpanded] = useState(false);
  if (!fabricFile) return null;

  const tierGroups = {};
  devices.forEach(d => {
    const t = d.tier || 3;
    if (!tierGroups[t]) tierGroups[t] = [];
    tierGroups[t].push(d);
  });

  return (
    <div style={{ background:`${C.amber}08`, border:`1px solid ${C.amber}30`, borderLeft:`3px solid ${C.amber}`, margin:"0 24px 16px", animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", cursor:"pointer" }} onClick={() => setExpanded(v => !v)}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:C.amber, fontFamily:mono, fontSize:12 }}>◈</span>
          <div>
            <div style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.06em" }}>Fabric context loaded</div>
            <div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginTop:2 }}>{fabricFile.name} · {devices.length} device{devices.length!==1?"s":""} extracted</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>{expanded ? "▲ hide" : "▼ show devices"}</span>
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
                  {d.version && <span style={{ fontFamily:mono, fontSize:11, color:C.dim }}>v{d.version}</span>}
                  {d.role   && <span style={{ fontFamily:mono, fontSize:10, color:C.muted, background:C.faint, padding:"1px 6px" }}>{d.role}</span>}
                  {!d.version && <span style={{ fontFamily:mono, fontSize:10, color:C.orange }}>no version</span>}
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
function FileUploadCard({ fileName, fileSize, status, warnings }) {
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
// ─────────────────────────────────────────────
function MessageBubble({ msg, member }) {
  const isUser = msg.role === "user";
  const isFile = msg.type === "file";
  return (
    <div style={{ display:"flex", gap:14, marginTop:20, flexDirection:isUser?"row-reverse":"row", animation:"fadeUp 0.2s ease" }}>
      {isUser ? <UserAvatar member={member}/> : <RinconAvatar/>}
      <div style={{ maxWidth:isFile?"none":"78%" }}>
        {!isUser && !isFile && (
          <div style={{ marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:mono, fontSize:11, fontWeight:600, color:C.amber }}>Rincon</span>
            <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>DC Expert</span>
          </div>
        )}
        {msg.type==="psirt-progress"||msg.type==="psirt-done" ? (
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
            <div style={{ fontSize:14, lineHeight:1.75, whiteSpace:"pre-wrap", color:C.text, fontFamily:sans }}>{msg.content}</div>
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
function ConversationItem({ conv, active, onClick }) {
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
// SUGGESTION CHIPS
// ─────────────────────────────────────────────
const SUGGESTIONS = [
  "What's the safest upgrade path for a 9.3(x) ACI fabric?",
  "How do I check if a CVE affects my fabric?",
  "What should I do before a major APIC upgrade?",
  "Border leaf BGP best practices for ACI",
  "Upload a config file to analyse your fabric →",
];

function SuggestionChips({ onSelect, onUpload }) {
  return (
    <div style={{ padding:"0 24px 16px" }}>
      <div style={{ maxWidth:740, margin:"0 auto" }}>
        <div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginBottom:10, letterSpacing:"0.08em" }}>// suggested</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {SUGGESTIONS.map(s=>(
            <button key={s} onClick={()=>s.includes("Upload")?onUpload():onSelect(s)}
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

function DragOverlay({ visible }) {
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
function PSIRTProgress({ progress }) {
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
// PSIRT QUERY — calls /api/advisories per device
// ─────────────────────────────────────────────
async function queryPSIRTForDevices(devices, session, onProgress) {
  const devicesWithVersions = devices.filter(d => d.version && d.version.trim());
  const devicesWithout      = devices.filter(d => !d.version || !d.version.trim());
  const isAci               = devices.some(d => d.name && d.name.toUpperCase().includes("APIC"));

  const initialResults = devices.map(d => ({
    name: d.name, version: d.version,
    status: d.version ? "pending" : "skipped", count: undefined,
  }));
  onProgress({ total: devicesWithVersions.length, done: 0, results: initialResults });

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
          headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${session?.access_token}` },
          body:JSON.stringify({ platform:device.name, version:device.version, isAciSwitch }),
        });
        const data = await res.json();
        done++;
        const advisoryCount = data.advisories?.length || 0;
        results[idx] = { ...results[idx], status:"done", count:advisoryCount };
        onProgress({ total:devicesWithVersions.length, done, results:[...results] });
        return { device, data, advisoryCount, queryVersion:data.queryVersion||device.version };
      } catch(err) {
        done++;
        results[idx] = { ...results[idx], status:"error" };
        onProgress({ total:devicesWithVersions.length, done, results:[...results] });
        return { device, data:null, advisoryCount:0, error:err.message };
      }
    })
  );

  // Build PSIRT context string — this is what reaches Claude's system prompt
  const lines = ["PSIRT ADVISORY RESULTS (live Cisco PSIRT API):"];
  let totalAdvisories = 0;

  for (const { device, data, advisoryCount, queryVersion } of advisoryResults) {
    if (!data || !data.verified) {
      lines.push(`${device.name} v${device.version}: API query failed or not supported`);
      continue;
    }
    totalAdvisories += advisoryCount;
    if (advisoryCount === 0) {
      lines.push(`${device.name} v${device.version} [${data.family||""}]: No advisories found — VERIFIED CLEAN`);
    } else {
      const versionNote = (queryVersion && queryVersion !== device.version) ? ` (queried as v${queryVersion} — ACI NX-OS mapping)` : "";
      lines.push(`${device.name} v${device.version}${versionNote} [${data.family||""}]: ${advisoryCount} advisories`);
      const sorted = [...(data.advisories||[])].sort((a,b)=>({Critical:4,High:3,Medium:2,Low:1}[b.impact]||0)-({Critical:4,High:3,Medium:2,Low:1}[a.impact]||0));
      for (const adv of sorted.slice(0,5)) {
        lines.push(`  - [${adv.impact?.toUpperCase()||"UNKNOWN"}] ${adv.id} — ${adv.title}${adv.firstFixed?` | Fixed: ${adv.firstFixed}`:""}`);
      }
      if (advisoryCount > 5) lines.push(`  - ... and ${advisoryCount-5} more`);
    }
  }
  if (devicesWithout.length > 0) lines.push(`Devices with no version data (not queried): ${devicesWithout.map(d=>d.name).join(", ")}`);
  lines.push(`SUMMARY: ${totalAdvisories} total advisories across ${devicesWithVersions.length} devices queried`);

  return { psirtContext:lines.join("\n"), totalAdvisories, results:advisoryResults };
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function RinconChatPrototype() {
  const { member, org, session } = useAuth();

  const [conversations, setConversations]   = useState([]);
  const [activeConvId, setActiveConvId]     = useState(null);
  const [messages, setMessages]             = useState([]);
  const [input, setInput]                   = useState("");
  const [aiTyping, setAiTyping]             = useState(false);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [fabricContext, setFabricContext]   = useState(null);
  const [fabricDevices, setFabricDevices]   = useState([]);
  const [fabricFile, setFabricFile]         = useState(null);
  const [psirtContext, setPsirtContext]     = useState(null);  // FIX: now correctly passed to Claude
  const [psirtProgress, setPsirtProgress]   = useState(null);
  const [uploading, setUploading]           = useState(false);
  const [dragOver, setDragOver]             = useState(false);
  const [showChatGreeting, setShowChatGreeting] = useState(false);
  const [greetingData, setGreetingData]         = useState(null);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const fileRef     = useRef(null);
  const chatAreaRef = useRef(null);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, aiTyping]);
  useEffect(() => { if (session) loadConversations(); }, [session]);
  useEffect(() => { if (activeConvId) { setShowChatGreeting(false); setGreetingData(null); loadMessages(activeConvId);} else { setMessages([]); setFabricContext(null); setFabricDevices([]); setFabricFile(null); setPsirtContext(null);}}, [activeConvId]);


  // ── Supabase helpers
  const loadConversations = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('conversations').select('id,title,created_at,updated_at,is_analysis,message_count,has_fabric').order('updated_at',{ascending:false}).limit(50);
    if (data) setConversations(data);
    setLoadingHistory(false);
  };

  const loadMessages = async (convId) => {
    // Load messages
    const { data: msgData } = await supabase
      .from('conversation_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (msgData) setMessages(msgData.map(m => ({ ...m, role: m.role === "assistant" ? "ai" : m.role })));
  
    // Restore fabric context if this conversation has one
    const { data: convData } = await supabase
      .from('conversations')
      .select('fabric_context, fabric_devices, fabric_psirt_context, has_fabric')
      .eq('id', convId)
      .single();
  
    if (convData?.has_fabric && convData?.fabric_context) {
      setFabricContext(convData.fabric_context);
      setFabricDevices(convData.fabric_devices || []);
      setPsirtContext(convData.fabric_psirt_context || null);
      // Reconstruct fabricFile display object from context string
      const fileNameMatch = convData.fabric_context.match(/^FILE: (.+)$/m);
      const fileName = fileNameMatch ? fileNameMatch[1] : 'fabric-file';
      setFabricFile({ name: fileName, size: null, storagePath: null });
    } else {
      // Clear fabric context when switching to a non-fabric conversation
      setFabricContext(null);
      setFabricDevices([]);
      setFabricFile(null);
      setPsirtContext(null);
    }
  };

  const getOrgMemberIds = async () => {
    const claims = getJwtClaims();
    return { orgId:claims.org_id||org?.id, memberId:claims.member_id||member?.id };
  };

  const createConversation = async (firstMessage, opts={}) => {
    const { orgId, memberId } = await getOrgMemberIds();
    const title = firstMessage.slice(0,60)+(firstMessage.length>60?"…":"");
    const { data, error } = await supabase.from('conversations').insert({ title, is_analysis:opts.isAnalysis||false, has_fabric:opts.hasFabric||false, message_count:0, org_id:orgId, member_id:memberId }).select('id').single();
    if (error) { console.error('Failed to create conversation:', error); return null; }
    return data.id;
  };

  const saveMessage = async (convId, role, content) => {
    const { orgId } = await getOrgMemberIds();
    const { data, error } = await supabase.from('conversation_messages').insert({ conversation_id:convId, role, content, org_id:orgId }).select('id,role,content,created_at').single();
    if (error) { console.error('Failed to save message:', error); return null; }
    await supabase.rpc('increment_message_count',{ p_conversation_id:convId });
    return data;
  };

  // ─────────────────────────────────────────────
  // FILE UPLOAD — uses /api/extract server-side
  // ─────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      addLocalMessage("system", `File too large. Maximum size is 5MB. Your file is ${(file.size/1024/1024).toFixed(1)}MB.`);
      return;
    }
    setUploading(true);

    const uploadCardId = Date.now().toString();
    setMessages(prev=>[...prev,{ id:uploadCardId, role:"user", type:"file", fileData:{ fileName:file.name, fileSize:file.size, status:"uploading" }, created_at:new Date().toISOString() }]);

    try {
      const text = await new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=e=>resolve(e.target.result); r.onerror=reject; r.readAsText(file); });
      const warnings = preflightCheck(text);

      if (warnings.length > 0) {
        setMessages(prev=>prev.map(m=>m.id===uploadCardId?{...m,fileData:{...m.fileData,status:"preflight",warnings}}:m));
      }

      setMessages(prev=>prev.map(m=>m.id===uploadCardId?{...m,fileData:{...m.fileData,status:"extracting",warnings}}:m));

      // Extract devices via server (Improvement 1 — no API key in browser)
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text }),
      });
      const extractData = await extractRes.json();
      if (extractData.error) throw new Error(extractData.message || extractData.error);
      const devices = extractData.devices;

      // Upload raw file to Supabase Storage
      const { orgId } = await getOrgMemberIds();
      const storagePath = `${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const { error:storageError } = await supabase.storage.from('environment-files').upload(storagePath, file, { contentType:'text/plain', upsert:false });
      if (storageError) console.warn('Storage upload failed (non-fatal):', storageError.message);

      const contextLines = [
        `FILE: ${file.name}`,
        `DEVICES EXTRACTED: ${devices.length}`,
        "",
        "FABRIC INVENTORY:",
        ...devices.map(d=>`- ${d.name}${d.version?` v${d.version}`:" (version unknown)"}${d.role?` | ${d.role}`:""} | Tier ${d.tier}`),
        "",
        "RAW FILE EXCERPT (first 3000 chars):",
        text.slice(0,3000),
      ].join("\n");

      setFabricContext(contextLines);
      setFabricDevices(devices);
      setFabricFile({ name:file.name, size:file.size, storagePath });

      setMessages(prev=>prev.map(m=>m.id===uploadCardId?{...m,fileData:{...m.fileData,status:"done",warnings}}:m));

      let convId = activeConvId;
      if (!convId) {
        convId = await createConversation(`Fabric analysis: ${file.name}`,{ hasFabric:true });
        if (convId) setActiveConvId(convId);
      } 
      if (convId) {
        await supabase.from('conversations').update({
          has_fabric: true,
          fabric_context: contextLines,
          fabric_devices: devices,
        }).eq('id', convId);
      }
      if (convId) await saveMessage(convId,'user',`[Uploaded fabric file: ${file.name}]`);

      // PSIRT query
      const devicesWithVersions = devices.filter(d=>d.version&&d.version.trim());
      let resolvedPsirtContext = null;

      if (devicesWithVersions.length > 0) {
        const psirtCardId = `psirt-${Date.now()}`;
        setMessages(prev=>[...prev,{ id:psirtCardId, role:"ai", type:"psirt-progress", created_at:new Date().toISOString() }]);
        try {
          const psirtResult = await queryPSIRTForDevices(devices, session, (progress)=>{
            setPsirtProgress(progress);
            setMessages(prev=>prev.map(m=>m.id===psirtCardId?{...m,psirtProgress:progress}:m));
          });
          resolvedPsirtContext = psirtResult.psirtContext;
          setPsirtContext(resolvedPsirtContext); // FIX: stored in state correctly
          if (convId) {
            await supabase.from('conversations')
              .update({ fabric_psirt_context: resolvedPsirtContext })
              .eq('id', convId);
          }
          setMessages(prev=>prev.map(m=>m.id===psirtCardId?{
            ...m, type:"psirt-done",
            psirtSummary:{ total:devicesWithVersions.length, advisories:psirtResult.totalAdvisories },
            psirtProgress: psirtResult.results ? { total:devicesWithVersions.length, done:devicesWithVersions.length, results:psirtResult.results.map(r=>({ name:r.device.name, version:r.device.version, status:r.error?"error":"done", count:r.advisoryCount })) } : null,
          }:m));
        } catch(psirtErr) {
          console.warn("PSIRT query failed (non-fatal):", psirtErr);
          setMessages(prev=>prev.filter(m=>m.id!==psirtCardId));
        }
      }

      // Auto-send initial assessment — psirtContext now correctly passed
      await sendWithContext(`Fabric file loaded: ${file.name}`, contextLines, convId, true, resolvedPsirtContext);
      loadConversations();

    } catch(err) {
      console.error('File processing error:', err);
      setMessages(prev=>prev.map(m=>m.id===uploadCardId?{...m,fileData:{...m.fileData,status:"error"}}:m));
    }
    setUploading(false);
  };

  // ─────────────────────────────────────────────
  // CLAUDE API CALL — via /api/chat server-side (Improvement 1)
  // FIX: psirtContext now always passed correctly (Improvement 3)
  // ─────────────────────────────────────────────
  const callClaude = async (conversationHistory, contextOverride, psirtOverride) => {
    const fabric = contextOverride !== undefined ? contextOverride : fabricContext;
    const psirt  = psirtOverride  !== undefined ? psirtOverride  : psirtContext; // FIX: was being dropped

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        fabricContext: fabric || null,
        psirtContext:  psirt  || null, // FIX: now always included
        messages: conversationHistory
          .filter(m => m.type !== "file")
          .map(m => ({ role:m.role==="ai"?"assistant":"user", content:m.content })),
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.message || data.error);
    return data.text;
  };

  // ─────────────────────────────────────────────
  // SEND WITH EXPLICIT CONTEXT (after file upload)
  // ─────────────────────────────────────────────
  const sendWithContext = async (triggerPrompt, context, convId, isAutoResponse=false, psirtData=null) => {
    setAiTyping(true);
    try {
      const prompt = isAutoResponse
        ? `The engineer has just uploaded a fabric inventory file.${psirtData?" PSIRT advisory data from the live Cisco PSIRT API has been retrieved for all devices with known versions.":""}

Provide a concise initial assessment covering:
1. How many devices were found and what infrastructure tiers are present
2. Any version mismatches visible in the inventory
3. The most significant security advisories found (if PSIRT data is present, cite exact CSC IDs and severity)
4. Top priority action — what the engineer should look at first
5. Invite the engineer to ask specific questions about any device or finding

Fabric data:
${context}${psirtData?"\n\nPSIRT DATA:\n"+psirtData:""}`
        : triggerPrompt;

      const aiResponse = await callClaude([{ role:"user", content:prompt }], context, psirtData);
      setAiTyping(false);

      const newMsg = { id:Date.now().toString(), role:"ai", content:aiResponse, created_at:new Date().toISOString() };
      setMessages(prev=>[...prev,newMsg]);
      if (convId) await saveMessage(convId,'assistant',aiResponse);

    } catch(err) {
      console.error("Claude error:", err);
      setAiTyping(false);
    }
  };

  // ─────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────
  const send = async (text) => {
    const msg = (text||input).trim();
    if (!msg || aiTyping) return;
    setInput("");

    let convId = activeConvId;
    if (!convId) {
      convId = await createConversation(msg,{ hasFabric:!!fabricContext });
      if (!convId) return;
      setActiveConvId(convId);
    }

    const userMsg   = await saveMessage(convId,"user",msg);
    const localMsg  = userMsg || { id:Date.now().toString(), role:"user", content:msg, created_at:new Date().toISOString() };
    setMessages(prev=>[...prev,localMsg]);
    setAiTyping(true);

    try {
      const history    = [...messages, localMsg];
      const aiResponse = await callClaude(history);
      const savedAiMsg = await saveMessage(convId,"assistant",aiResponse);
      setAiTyping(false);
      setMessages(prev=>[...prev,{ ...(savedAiMsg||{}), id:savedAiMsg?.id||Date.now().toString(), role:"ai", content:aiResponse, created_at:savedAiMsg?.created_at||new Date().toISOString() }]);
      loadConversations();
    } catch(err) {
      console.error("Claude error:", err);
      setAiTyping(false);
      setMessages(prev=>[...prev,{ id:Date.now().toString(), role:"ai", content:"I ran into an issue. Please try again.", created_at:new Date().toISOString() }]);
    }
  };

  const addLocalMessage = (role, content) => {
    setMessages(prev=>[...prev,{ id:Date.now().toString(), role, content, created_at:new Date().toISOString() }]);
  };

  const newConversation = () => {
    setActiveConvId(null); setMessages([]); setFabricContext(null);
    setFabricDevices([]); setFabricFile(null); setPsirtContext(null);
    setPsirtProgress(null); inputRef.current?.focus();
  };

  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { if (!chatAreaRef.current?.contains(e.relatedTarget)) setDragOver(false); };
  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); };
  const handleKey       = (e) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} };

  const isEmpty = messages.length === 0;

  return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", flexDirection:"column", fontFamily:sans, color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        input::placeholder,textarea::placeholder{color:${C.muted};}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes dotPulse{0%,100%{transform:scale(1);opacity:0.5;}50%{transform:scale(1.4);opacity:1;}}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      {/* TOPBAR */}
      <div style={{ background:C.hi, borderBottom:`1px solid ${C.border}`, padding:"11px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, padding:"5px 8px", cursor:"pointer", fontFamily:mono, fontSize:11 }}>{sidebarOpen?"◧":"▣"}</button>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, background:C.amber, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:"#000", fontFamily:mono, fontSize:13, fontWeight:700 }}>◈</span>
            </div>
            <span style={{ fontFamily:mono, fontSize:13, fontWeight:600, color:C.text }}>netwrkr<span style={{ color:C.amber }}>.ai</span></span>
            <span style={{ color:C.muted, fontFamily:mono, fontSize:11 }}>/ rincon</span>
          </div>
          {fabricFile && (
            <div style={{ display:"flex", alignItems:"center", gap:6, background:C.amberG, border:`1px solid ${C.amber}30`, padding:"3px 10px" }}>
              <span style={{ color:C.amber, fontSize:10 }}>◈</span>
              <span style={{ fontFamily:mono, fontSize:10, color:C.amber }}>{fabricFile.name} · {fabricDevices.length} devices</span>
            </div>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={newConversation} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.dim, fontFamily:mono, fontSize:10, padding:"5px 12px", cursor:"pointer", letterSpacing:"0.05em" }} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${C.amber}55`;e.currentTarget.style.color=C.text;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.dim;}}>
            + new_chat()
          </button>
          <button onClick={()=>fileRef.current?.click()} style={{ background:C.amberG, border:`1px solid ${C.amber}40`, color:C.amber, fontFamily:mono, fontSize:10, padding:"5px 12px", cursor:"pointer", letterSpacing:"0.05em" }} disabled={uploading}>
            {uploading?"uploading…":"↑ upload_fabric()"}
          </button>
          <div style={{ width:1, height:20, background:C.border }}/>
          <UserBadge/>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width:260, flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:mono, fontSize:9, color:C.muted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:10 }}>// conversations</div>
              <button onClick={newConversation} style={{ width:"100%", background:C.amberG, border:`1px solid ${C.amber}30`, color:C.amber, fontFamily:mono, fontSize:11, padding:"8px", cursor:"pointer" }}>+ new_chat()</button>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {loadingHistory ? (
                <div style={{ padding:"20px 16px", fontFamily:mono, fontSize:11, color:C.muted }}>Loading…</div>
              ) : conversations.length===0 ? (
                <div style={{ padding:"20px 16px", fontFamily:mono, fontSize:11, color:C.muted }}>// no conversations yet</div>
              ) : (
                <>
                  {conversations.some(c=>c.has_fabric) && (<>
                    <div style={{ padding:"12px 16px 6px", fontFamily:mono, fontSize:9, color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase" }}>With fabric context</div>
                    {conversations.filter(c=>c.has_fabric).map(conv=><ConversationItem key={conv.id} conv={conv} active={conv.id===activeConvId} onClick={()=>setActiveConvId(conv.id)}/>)}
                  </>)}
                  {conversations.some(c=>!c.has_fabric&&!c.is_analysis) && (<>
                    <div style={{ padding:"12px 16px 6px", fontFamily:mono, fontSize:9, color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase" }}>Conversations</div>
                    {conversations.filter(c=>!c.has_fabric&&!c.is_analysis).map(conv=><ConversationItem key={conv.id} conv={conv} active={conv.id===activeConvId} onClick={()=>setActiveConvId(conv.id)}/>)}
                  </>)}
                </>
              )}
            </div>
            <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}` }}>
              <div style={{ background:`${C.amber}06`, border:`1px solid ${C.amber}20`, padding:"10px 12px", marginBottom:10 }}>
                <div style={{ fontFamily:mono, fontSize:9, color:C.amber, marginBottom:4, letterSpacing:"0.1em" }}>// enterprise</div>
                <div style={{ fontSize:11, color:C.muted, lineHeight:1.5, marginBottom:8 }}>Connect directly to APIC or Nexus Dashboard — no file upload needed.</div>
                <button style={{ width:"100%", background:"none", border:`1px solid ${C.amber}30`, color:C.amber, fontFamily:mono, fontSize:10, padding:"5px", cursor:"not-allowed", opacity:0.5 }}>🔒 connect_apic() — enterprise</button>
              </div>
              <button onClick={()=>window.location.href='/history'} style={{ width:"100%", background:"none", border:`1px solid ${C.border}`, color:C.muted, fontFamily:mono, fontSize:10, padding:"7px", cursor:"pointer" }} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${C.amber}44`;e.currentTarget.style.color=C.dim;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
                view_full_history() →
              </button>
            </div>
          </div>
        )}

        {/* CHAT AREA */}
        <div ref={chatAreaRef} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, position:"relative" }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <DragOverlay visible={dragOver}/>

          <div style={{ flex:1, overflowY:"auto", padding:"32px 24px 24px" }}>
            <div style={{ maxWidth:740, margin:"0 auto" }}>
              {isEmpty && (
                <div style={{ animation:"fadeUp 0.4s ease" }}>
                  <div style={{ marginBottom:32, paddingTop:20 }}>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:C.amberG, border:`1px solid ${C.amber}30`, padding:"8px 16px", marginBottom:24 }}>
                      <span style={{ color:C.amber, fontSize:16 }}>◈</span>
                      <span style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.08em" }}>Rincon · DC Expert</span>
                    </div>
                    <h1 style={{ fontSize:28, fontWeight:300, letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:14, color:C.text }}>What does your fabric<br/><span style={{ color:C.amber }}>need to know?</span></h1>
                    <p style={{ fontSize:14, color:C.dim, lineHeight:1.8, maxWidth:480 }}>Ask anything about your Cisco DC fabric, or upload a config file to ground the conversation in your actual inventory.</p>
                  </div>
                  <div onClick={()=>fileRef.current?.click()} style={{ border:`1px dashed ${C.amber}40`, padding:"20px 24px", marginBottom:24, cursor:"pointer", transition:"all 0.2s", background:`${C.amber}04`, display:"flex", alignItems:"center", gap:16 }} onMouseEnter={e=>e.currentTarget.style.borderColor=`${C.amber}80`} onMouseLeave={e=>e.currentTarget.style.borderColor=`${C.amber}40`}>
                    <div style={{ fontSize:24, color:C.amber }}>↑</div>
                    <div>
                      <div style={{ fontFamily:mono, fontSize:12, color:C.amber, marginBottom:4 }}>upload_fabric_file()</div>
                      <div style={{ fontSize:13, color:C.muted }}>Drop a config file, show version output, or CSV inventory. Rincon will parse it and answer questions about your specific fabric.</div>
                      <div style={{ fontFamily:mono, fontSize:10, color:C.faint, marginTop:6 }}>.txt .log .csv .conf .cfg .json · max 5MB · drag and drop supported</div>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
                    {[["↑","Upgrade sequencing","Safe order for your fabric tier by tier"],["⚠","Bug research","Known issues for your platform + version"],["⟳","Version compatibility","APIC ↔ leaf ↔ spine alignment"]].map(([icon,title,desc])=>(
                      <div key={title} style={{ background:C.surface, border:`1px solid ${C.border}`, padding:"14px 16px" }}>
                        <div style={{ fontFamily:mono, fontSize:16, color:C.amber, marginBottom:8 }}>{icon}</div>
                        <div style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>{title}</div>
                        <div style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fabricFile && <FabricContextBanner fabricFile={fabricFile} devices={fabricDevices} onClear={()=>{ setFabricContext(null); setFabricDevices([]); setFabricFile(null); setPsirtContext(null); setPsirtProgress(null); }}/>}

              {messages.map(msg=><MessageBubble key={msg.id} msg={msg} member={member}/>)}

              {aiTyping && (
                <div style={{ display:"flex", gap:14, marginTop:20 }}>
                  <RinconAvatar/>
                  <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"2px 12px 12px 12px", padding:"14px 18px" }}>
                    <div style={{ fontFamily:mono, fontSize:11, color:C.amber, marginBottom:8 }}>Rincon · thinking</div>
                    <TypingDots/>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
          </div>

          {isEmpty && <SuggestionChips onSelect={s=>{ setInput(s); inputRef.current?.focus(); }} onUpload={()=>fileRef.current?.click()}/>}

          {/* INPUT BAR */}
          <div style={{ background:C.hi, borderTop:`1px solid ${C.border}`, padding:"14px 24px", flexShrink:0 }}>
            <div style={{ maxWidth:740, margin:"0 auto" }}>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, display:"flex", alignItems:"flex-end", gap:8, padding:"10px 14px" }}>
                <button onClick={()=>fileRef.current?.click()} disabled={uploading} title="Upload fabric file" style={{ background:"none", border:"none", color:uploading?C.amber:C.muted, cursor:"pointer", padding:"4px", flexShrink:0, fontSize:16, transition:"color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color=C.amber} onMouseLeave={e=>e.currentTarget.style.color=uploading?C.amber:C.muted}>
                  {uploading?<span style={{ display:"inline-block", animation:"spin 0.7s linear infinite" }}>⟳</span>:"↑"}
                </button>
                <span style={{ color:C.muted, fontFamily:mono, fontSize:12, flexShrink:0, paddingBottom:2 }}>→</span>
                <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder={fabricFile?`Ask about ${fabricFile.name}…`:"Ask Rincon anything about your Cisco DC fabric…"} disabled={aiTyping} rows={1}
                  style={{ flex:1, background:"transparent", border:"none", outline:"none", color:C.text, fontSize:14, fontFamily:sans, resize:"none", lineHeight:1.5, maxHeight:120, overflowY:"auto", caretColor:C.amber }}
                  onInput={e=>{ e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"; }}/>
                <button onClick={()=>send()} disabled={!input.trim()||aiTyping} style={{ width:36, height:36, border:"none", flexShrink:0, background:input.trim()&&!aiTyping?C.amber:C.muted, cursor:input.trim()&&!aiTyping?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s" }}>
                  <span style={{ color:"#000", fontSize:15, fontWeight:700 }}>↑</span>
                </button>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6, paddingLeft:2 }}>
                <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>{fabricFile?`◈ Fabric context: ${fabricFile.name} · ${fabricDevices.length} devices`:"Rincon · Cisco DC Expert · powered by Claude"}</span>
                <span style={{ fontFamily:mono, fontSize:10, color:C.muted }}>↑ attach file · ↵ send</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} style={{ display:"none" }} onChange={e=>{ const f=e.target.files[0]; if(f) handleFile(f); e.target.value=""; }}/>
    </div>
  );
}