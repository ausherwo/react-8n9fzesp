// JCHome.js
// The new netwrkr.ai home page: a JC chat box, front and centre, open to anonymous visitors.
// Visitors get FREE_QUESTION_LIMIT free questions before an inline sign-up card appears in the
// conversation. Fabric analysis (paste → extract → confirm devices → PSIRT → results) happens as
// chat turns instead of a separate page. See website-redesign-brief.md and
// /Users/usherwood-a/.claude/plans/clone-https-github-com-ausherwo-react-8n-silly-horizon.md.

import { useState, useEffect, useRef, useCallback } from "react";
import posthog from "posthog-js";
import { useAuth } from "./Auth";
import InlineAuthCard from "./chat/InlineAuthCard";
import { supabase } from "./supabaseClient";
import UserBadge from "./UserBadge";
import {
  LIGHT as C, sans, homeSerif, ACCEPTED_TYPES, MAX_FILE_SIZE,
  preflightCheck, MessageBubble, DragOverlay, TypingDots,
  queryPSIRTForDevices,
} from "./chat/ChatPrimitives";
import { DeviceReviewCard, ResultCard } from "./chat/FabricAnalysisCards";

const FREE_QUESTION_LIMIT = 3;
const REQUIRE_SIGNUP_FOR_ANALYSIS = process.env.REACT_APP_REQUIRE_SIGNUP_FOR_ANALYSIS === "true";

const ANON_SESSION_KEY = "nw_anon_session";
const ANON_CONV_KEY    = "nw_anon_conversation";
const ANON_COUNT_KEY   = "nw_home_count";

function getAnonSessionId() {
  try {
    let id = localStorage.getItem(ANON_SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(ANON_SESSION_KEY, id); }
    return id;
  } catch { return null; }
}
function loadAnonConversation() {
  try { const raw = localStorage.getItem(ANON_CONV_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveAnonConversation(messages) {
  try {
    const serializable = messages.filter(m => m.type !== "psirt-progress" && m.type !== "device-review");
    localStorage.setItem(ANON_CONV_KEY, JSON.stringify(serializable));
  } catch {}
}
function clearAnonConversation() {
  try { localStorage.removeItem(ANON_CONV_KEY); localStorage.removeItem(ANON_SESSION_KEY); localStorage.removeItem(ANON_COUNT_KEY); } catch {}
}
function getAnonQuestionCount() { try { return parseInt(localStorage.getItem(ANON_COUNT_KEY) || "0", 10); } catch { return 0; } }
function incAnonQuestionCount() { try { localStorage.setItem(ANON_COUNT_KEY, String(getAnonQuestionCount() + 1)); } catch {} }

function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function Footer() {
  return (
    <footer style={{ flexShrink:0, padding:"16px 24px" }}>
      <div style={{ maxWidth:1040, margin:"0 auto", display:"flex", justifyContent:"center", gap:24 }}>
        <button onClick={()=>window.location.href="/jc"} style={{ background:"none", border:"none", color:C.muted, fontFamily:sans, fontSize:12, cursor:"pointer" }}>What is JC from Netwrkr?</button>
        <button onClick={()=>window.location.href="/security"} style={{ background:"none", border:"none", color:C.muted, fontFamily:sans, fontSize:12, cursor:"pointer" }}>Security</button>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// COMPOSER — the "hero" variant sits centered in the empty state; "docked" is the same
// shape, smaller, fixed to the bottom of the viewport once a conversation is running.
// ─────────────────────────────────────────────
function Composer({ variant, input, setInput, onSend, onAttach, aiTyping, inputRef, placeholder }) {
  const hero = variant === "hero";
  return (
    <div style={{ width:"100%", maxWidth:hero?680:720, margin:"0 auto", background:C.surface, border:`1px solid ${C.border}`, borderRadius:22,
      boxShadow:"0 1px 2px rgba(26,24,16,0.04), 0 16px 40px rgba(26,24,16,0.06)", padding: hero ? "18px 20px 12px" : "14px 16px 10px" }}>
      <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onSend(input)}
        placeholder={placeholder}
        style={{ width:"100%", border:"none", outline:"none", background:"transparent", fontSize:15, fontFamily:sans, color:C.text, marginBottom:20, display:"block" }}/>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onAttach} title="Upload inventory file" aria-label="Attach file"
          style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"50%", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, cursor:"pointer", flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <div style={{ flex:1 }}/>
        <button onClick={()=>onSend(input)} disabled={!input.trim()||aiTyping} aria-label="Send message"
          style={{ width:30, height:30, borderRadius:"50%", border:"none", background:input.trim()&&!aiTyping?C.amber:C.border,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:input.trim()&&!aiTyping?"pointer":"default", flexShrink:0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function JCHome() {
  const { session, member, org } = useAuth();

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [aiTyping, setAiTyping]       = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const [fabricContext, setFabricContext] = useState(null);
  const [psirtContext, setPsirtContext]   = useState(null);
  const [activeConvId, setActiveConvId]   = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);
  const migratedRef = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, aiTyping]);

  // ── Anonymous conversation bootstrap ──────────────────────────
  useEffect(() => {
    if (session) return;
    getAnonSessionId();
    const stashed = loadAnonConversation();
    if (stashed.length) setMessages(stashed);
  }, [session]);

  useEffect(() => {
    if (session) return;
    saveAnonConversation(messages);
  }, [messages, session]);

  // ── Continuity: migrate a stashed anonymous conversation once the visitor signs in ──
  useEffect(() => {
    if (!session || migratedRef.current) return;
    const stashed = loadAnonConversation();
    if (!stashed.length) { migratedRef.current = true; return; }
    migratedRef.current = true;
    (async () => {
      try {
        const orgId = org?.id, memberId = member?.id;
        const firstUserMsg = stashed.find(m => m.role === "user")?.content || "Conversation";
        const { data: conv, error: convErr } = await supabase.from('conversations')
          .insert({ title: firstUserMsg.slice(0,60), org_id: orgId, member_id: memberId, message_count: stashed.length })
          .select('id').single();
        if (convErr) throw convErr;
        setActiveConvId(conv.id);
        const rows = stashed.filter(m => m.role === "user" || m.role === "ai").map(m => ({
          conversation_id: conv.id, role: m.role === "ai" ? "assistant" : m.role, content: m.content || "", org_id: orgId,
        }));
        if (rows.length) await supabase.from('conversation_messages').insert(rows);
        clearAnonConversation();
        try { posthog.capture('home_signup_completed', { messages_carried_over: rows.length }); } catch {}
      } catch (err) {
        console.error("Anonymous conversation hand-off failed:", err);
      }
    })();
  }, [session, org, member]);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
  }), [session]);

  const addMessage = (msg) => setMessages(prev => [...prev, { id: newId(), created_at: new Date().toISOString(), ...msg }]);
  const updateMessage = (id, patch) => setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  const persistTurn = async (role, content) => {
    if (!session) return;
    try {
      let convId = activeConvId;
      if (!convId) {
        const { data, error } = await supabase.from('conversations')
          .insert({ title: content.slice(0,60), org_id: org?.id, member_id: member?.id, message_count: 0 })
          .select('id').single();
        if (error) throw error;
        convId = data.id;
        setActiveConvId(convId);
      }
      await supabase.from('conversation_messages').insert({ conversation_id: convId, role: role === "ai" ? "assistant" : role, content, org_id: org?.id });
    } catch (err) { console.error("Failed to save message:", err); }
  };

  // ── Send a chat question to JC ─────────────────────────────────
  const sendMessage = async (text) => {
    if (!text.trim() || aiTyping) return;

    if (!session && getAnonQuestionCount() >= FREE_QUESTION_LIMIT) {
      try { posthog.capture('home_signup_gate_hit'); } catch {}
      addMessage({ role:"ai", type:"signup-gate" });
      return;
    }

    const userMsg = { role:"user", content:text };
    const newMsgs = [...messages, { id:newId(), created_at:new Date().toISOString(), ...userMsg }];
    setMessages(newMsgs);
    setInput("");
    setAiTyping(true);
    if (!session) incAnonQuestionCount();
    try { posthog.capture('home_question_asked', { authed: !!session }); } catch {}
    persistTurn("user", text);

    const aiMsgId = newId();
    addMessage({ id: aiMsgId, role:"ai", content:"" });

    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          persona: "jc",
          fabricContext,
          psirtContext,
          messages: newMsgs.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(()=>({}));
        updateMessage(aiMsgId, { content: data.message || "Something went wrong — please try again." });
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream:true });
          updateMessage(aiMsgId, { content: full });
        }
        persistTurn("ai", full);
      }
    } catch (err) {
      console.error("Chat error:", err);
      updateMessage(aiMsgId, { content: "Error reaching JC — please try again." });
    }
    setAiTyping(false);
  };

  // ── Fabric analysis folded into chat ───────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { addMessage({ role:"ai", content:"That file is too large — 5MB max." }); return; }

    const uploadCardId = newId();
    addMessage({ id:uploadCardId, role:"user", type:"file", fileData:{ fileName:file.name, fileSize:file.size, status:"uploading" } });

    try {
      const text = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = e => resolve(e.target.result); r.onerror = reject; r.readAsText(file); });
      const warnings = preflightCheck(text);
      updateMessage(uploadCardId, { fileData:{ fileName:file.name, fileSize:file.size, status:"extracting", warnings } });

      const extractRes = await fetch("/api/extract", { method:"POST", headers: authHeaders(), body: JSON.stringify({ text }) });
      const extractData = await extractRes.json();
      if (extractData.error) throw new Error(extractData.message || extractData.error);

      const grouped = groupDevices(extractData.devices);
      updateMessage(uploadCardId, { fileData:{ fileName:file.name, fileSize:file.size, status:"done", warnings } });
      try { posthog.capture('home_paste_submitted'); } catch {}

      addMessage({ role:"ai", type:"device-review", devices: grouped, confirmed:false });
    } catch (err) {
      console.error("Extract error:", err);
      updateMessage(uploadCardId, { fileData:{ fileName:file.name, fileSize:file.size, status:"error" } });
      addMessage({ role:"ai", content: err.message || "Extraction failed — please try again." });
      try { posthog.capture('home_extract_failed', { error: err.message }); } catch {}
    }
  };

  const groupDevices = (rawDevices) => {
    const map = new Map();
    rawDevices.forEach(d => {
      const key = `${d.name}__${d.ver || ""}__${d.role || ""}`;
      if (map.has(key)) { map.get(key).count += 1; }
      else { map.set(key, { ...d, verMissing: !d.ver?.trim(), count: 1 }); }
    });
    return Array.from(map.values());
  };

  const updateReviewDevices = (msgId, devices) => updateMessage(msgId, { devices });

  const cancelReview = (msgId) => updateMessage(msgId, { devices:null, cancelled:true });

  const confirmAndAnalyse = async (msgId, devices) => {
    if (REQUIRE_SIGNUP_FOR_ANALYSIS && !session) {
      try { posthog.capture('home_analysis_signup_required'); } catch {}
      addMessage({ role:"ai", type:"signup-gate" });
      return;
    }
    updateMessage(msgId, { confirmed:true });
    try { posthog.capture('home_extraction_confirmed', { device_count: devices.length }); } catch {}

    const psirtCardId = newId();
    addMessage({ id:psirtCardId, role:"ai", type:"psirt-progress" });

    try {
      const psirtResult = await queryPSIRTForDevices(devices, session, (progress) => {
        updateMessage(psirtCardId, { psirtProgress: progress });
      });
      const newPsirtContext = psirtResult.psirtContext;
      setPsirtContext(newPsirtContext);

      const devicesWithVersions = devices.filter(d => d.ver && d.ver.trim());
      const contextLines = [
        `DEVICES EXTRACTED: ${devices.length}`, "", "FABRIC INVENTORY:",
        ...devices.map(d => `- ${d.name}${d.ver?` v${d.ver}`:" (version unknown)"}${d.role?` | ${d.role}`:""}`),
      ].join("\n");
      setFabricContext(contextLines);

      updateMessage(psirtCardId, {
        type: "psirt-done",
        psirtSummary: { total: devicesWithVersions.length, advisories: psirtResult.totalAdvisories },
        psirtProgress: {
          total: devicesWithVersions.length, done: devicesWithVersions.length,
          results: psirtResult.results.map(r => ({ name:r.device.name, version:r.device.ver, status:r.error?"error":"done", count:r.advisoryCount })),
        },
      });

      const advMap = {};
      psirtResult.results.forEach(r => { advMap[`${r.device.name}__${r.device.ver}`] = r.data; });
      const dedupedDevices = devices.map(d => (d.count||1) > 1 ? { ...d, name:`${d.name} (x${d.count})` } : d);

      const res = await fetch("/api/advisories", { method:"POST", headers: authHeaders(), body: JSON.stringify({ runAnalysis:true, devices:dedupedDevices, ctx:"", advisoryMap:advMap }) });
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.message || parsed.error);
      try { posthog.capture('home_analysis_run', { device_count: devices.length }); } catch {}

      addMessage({ role:"ai", type:"analysis-result", data: parsed });
    } catch (err) {
      console.error("Analysis error:", err);
      addMessage({ role:"ai", content: err.message || "Analysis failed — please try again." });
      try { posthog.capture('home_analysis_failed', { error: err.message }); } catch {}
    }
  };

  const isEmpty = messages.length === 0;

  const extraCard = (msg) => {
    if (msg.type === "signup-gate") return <InlineAuthCard/>;
    if (msg.type === "device-review") {
      if (msg.cancelled) return <div style={{ fontFamily:sans, fontSize:13, color:C.muted }}>Cancelled</div>;
      return (
        <DeviceReviewCard
          devices={msg.devices}
          confirmed={msg.confirmed}
          securityNote
          theme={C}
          onChange={(devices)=>updateReviewDevices(msg.id, devices)}
          onConfirm={()=>confirmAndAnalyse(msg.id, msg.devices)}
          onCancel={()=>cancelReview(msg.id)}
        />
      );
    }
    if (msg.type === "analysis-result") return <ResultCard data={msg.data} theme={C}/>;
    return null;
  };

  const fileInput = (
    <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} style={{ display:"none" }}
      onChange={e=>{ const f=e.target.files[0]; if (f) handleFile(f); e.target.value=""; }}/>
  );

  const questionsLeft = FREE_QUESTION_LIMIT - getAnonQuestionCount();

  return (
    <div style={{ background:C.bg, color:C.text, minHeight:"100vh", fontFamily:sans, display:"flex", flexDirection:"column", position:"relative" }}
      onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
      onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{ e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if (f) handleFile(f); }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,350;8..60,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes dotPulse{0%,100%{opacity:0.3;}50%{opacity:1;}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        ::selection{background:${C.amber}40;color:${C.amberB};}
      `}</style>

      <DragOverlay visible={dragOver} theme={C}/>

      <nav style={{ flexShrink:0, position:"relative", zIndex:2 }}>
        <div style={{ maxWidth:1040, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <span style={{ fontWeight:600, fontSize:14, color:C.dim, fontFamily:sans }}>netwrkr<span style={{ color:C.amber }}>.ai</span></span>
          {session ? <UserBadge/> : (
            <button onClick={()=>window.location.href="/login"} style={{ background:"none", border:"none", color:C.dim, fontFamily:sans, fontSize:13, fontWeight:500, cursor:"pointer" }}>Sign in</button>
          )}
        </div>
      </nav>

      {isEmpty ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, marginBottom:32, animation:"fadeUp 0.3s ease" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.2 6.8H21l-5.6 4.1 2.2 6.8L12 15.6l-5.6 4.1 2.2-6.8L3 8.8h6.8z" fill={C.amber}/></svg>
            <h1 style={{ fontSize:34, fontWeight:400, letterSpacing:"-0.01em", color:C.text, margin:0, textAlign:"center", fontFamily:homeSerif }}>
              Let's talk DC networking…
            </h1>
          </div>

          <Composer variant="hero" input={input} setInput={setInput} onSend={sendMessage} onAttach={()=>fileRef.current?.click()}
            aiTyping={aiTyping} inputRef={inputRef} placeholder="Ask JC anything, or paste your device inventory…"/>
          {fileInput}

          <div style={{ marginTop:28, display:"flex", alignItems:"center", gap:18, fontSize:13, color:C.muted, fontFamily:sans, flexWrap:"wrap", justifyContent:"center" }}>
            <span>Free to start</span>
            <span style={{ width:3, height:3, borderRadius:"50%", background:C.border }}/>
            <span>Live Cisco PSIRT API</span>
            <span style={{ width:3, height:3, borderRadius:"50%", background:C.border }}/>
            <span>Nothing stored</span>
          </div>
        </div>
      ) : (
        <>
          <div style={{ flex:1, overflowY:"auto", padding:"40px 24px 170px" }}>
            <div style={{ maxWidth:720, margin:"0 auto" }}>
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} member={member} extraCard={extraCard} theme={C} plain/>
              ))}
              {aiTyping && messages[messages.length-1]?.content === "" && (
                <div style={{ marginTop:28 }}><TypingDots theme={C}/></div>
              )}
              <div ref={bottomRef}/>
            </div>
          </div>

          <div style={{ position:"fixed", left:0, right:0, bottom:0, background:`linear-gradient(to top, ${C.bg} 60%, transparent)`, padding:"32px 24px 24px" }}>
            <div style={{ maxWidth:720, margin:"0 auto" }}>
              <Composer variant="docked" input={input} setInput={setInput} onSend={sendMessage} onAttach={()=>fileRef.current?.click()}
                aiTyping={aiTyping} inputRef={inputRef} placeholder="Reply to JC…"/>
              {fileInput}
              <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:C.muted, fontFamily:sans }}>
                {!session && questionsLeft > 0 && `${questionsLeft} free question${questionsLeft !== 1 ? "s" : ""} left · `}
                JC can make mistakes. Verify advisories against Cisco PSIRT before acting.
              </div>
            </div>
          </div>
        </>
      )}

      {isEmpty && <Footer/>}
    </div>
  );
}
