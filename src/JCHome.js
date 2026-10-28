// JCHome.js
// The new netwrkr.ai home page: a JC chat box, front and centre, open to anonymous visitors.
// Visitors get FREE_QUESTION_LIMIT free questions before an inline sign-up card appears in the
// conversation. Fabric analysis (paste → extract → confirm devices → PSIRT → results) happens as
// chat turns instead of a separate page. See website-redesign-brief.md and
// /Users/usherwood-a/.claude/plans/clone-https-github-com-ausherwo-react-8n-silly-horizon.md.

import { useState, useEffect, useRef, useCallback } from "react";
import posthog from "posthog-js";
import { useAuth } from "./Auth";
import { supabase } from "./supabaseClient";
import UserBadge from "./UserBadge";
import {
  C, mono, sans, ACCEPTED_TYPES, MAX_FILE_SIZE,
  preflightCheck, MessageBubble, SuggestionChips, DragOverlay, TypingDots,
  queryPSIRTForDevices,
} from "./chat/ChatPrimitives";
import { DeviceReviewCard, ResultCard } from "./chat/FabricAnalysisCards";

const FREE_QUESTION_LIMIT = 3;
const REQUIRE_SIGNUP_FOR_ANALYSIS = process.env.REACT_APP_REQUIRE_SIGNUP_FOR_ANALYSIS === "true";

const ANON_SESSION_KEY = "nw_anon_session";
const ANON_CONV_KEY    = "nw_anon_conversation";
const ANON_COUNT_KEY   = "nw_home_count";

const DEFAULT_EXAMPLE_QUESTIONS = [
  "What's the safest upgrade path for a 9.3(x) ACI fabric?",
  "How do I check if a CVE affects my fabric?",
  "What should I do before a major APIC upgrade?",
  "Border leaf BGP best practices for ACI",
  "Paste your device inventory to analyse your fabric →",
];

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

// ─────────────────────────────────────────────
// INLINE SIGN-UP GATE CARD — rendered as a message in the conversation, not a modal/popup.
// ─────────────────────────────────────────────
function SignupGateCard() {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.amber}44`, borderLeft:`3px solid ${C.amber}`, padding:"16px 18px", maxWidth:480 }}>
      <div style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>// free questions used</div>
      <div style={{ fontSize:14, color:C.text, lineHeight:1.7, marginBottom:14 }}>
        You've used your {FREE_QUESTION_LIMIT} free questions. Create a free account to keep talking to JC — your conversation carries over, nothing is lost.
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={()=>{ try{posthog.capture('home_signup_gate_signup_clicked');}catch{} window.location.href="/signup"; }}
          style={{ background:C.amber, border:"none", color:"#000", fontFamily:mono, fontWeight:700, fontSize:12, padding:"9px 16px", cursor:"pointer" }}>
          create_account() →
        </button>
        <button onClick={()=>window.location.href="/login"}
          style={{ background:"none", border:`1px solid ${C.border}`, color:C.dim, fontFamily:mono, fontSize:12, padding:"9px 16px", cursor:"pointer" }}>
          already have an account?
        </button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop:`1px solid ${C.border}`, padding:"16px 24px", flexShrink:0 }}>
      <div style={{ maxWidth:740, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <span style={{ fontFamily:mono, fontSize:12, fontWeight:700, color:C.text }}>netwrkr<span style={{ color:C.amber }}>.ai</span></span>
        <div style={{ display:"flex", gap:16 }}>
          <button onClick={()=>window.location.href="/jc"} style={{ background:"none", border:"none", color:C.muted, fontFamily:mono, fontSize:11, cursor:"pointer" }}>what is JC?</button>
          <button onClick={()=>window.location.href="/security"} style={{ background:"none", border:"none", color:C.muted, fontFamily:mono, fontSize:11, cursor:"pointer" }}>security</button>
        </div>
      </div>
    </footer>
  );
}

export default function JCHome() {
  const { session, member, org } = useAuth();

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [aiTyping, setAiTyping]       = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const [exampleQuestions, setExampleQuestions] = useState(DEFAULT_EXAMPLE_QUESTIONS);
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

  // ── Example questions — random pick from the Supabase pool ────
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('homepage_example_questions').select('question').eq('active', true);
        if (!error && data && data.length) {
          const shuffled = [...data].sort(() => Math.random() - 0.5).map(r => r.question);
          setExampleQuestions(shuffled.slice(0, 4));
        }
      } catch { /* fall back to DEFAULT_EXAMPLE_QUESTIONS */ }
    })();
  }, []);

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
    if (msg.type === "signup-gate") return <SignupGateCard/>;
    if (msg.type === "device-review") {
      if (msg.cancelled) return <div style={{ fontFamily:mono, fontSize:12, color:C.muted }}>// cancelled</div>;
      return (
        <DeviceReviewCard
          devices={msg.devices}
          confirmed={msg.confirmed}
          securityNote
          onChange={(devices)=>updateReviewDevices(msg.id, devices)}
          onConfirm={()=>confirmAndAnalyse(msg.id, msg.devices)}
          onCancel={()=>cancelReview(msg.id)}
        />
      );
    }
    if (msg.type === "analysis-result") return <ResultCard data={msg.data}/>;
    return null;
  };

  return (
    <div style={{ background:C.bg, color:C.text, minHeight:"100vh", fontFamily:sans, display:"flex", flexDirection:"column", position:"relative" }}
      onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
      onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{ e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if (f) handleFile(f); }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes dotPulse{0%,100%{opacity:0.3;}50%{opacity:1;}}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        ::selection{background:${C.amber}40;color:${C.amberB};}
      `}</style>

      <DragOverlay visible={dragOver}/>

      <nav style={{ borderBottom:`1px solid ${C.border}`, padding:"0 24px", flexShrink:0 }}>
        <div style={{ maxWidth:740, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:27, height:27, background:C.amberG, border:`1px solid ${C.amber}44`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily:mono, fontWeight:700, fontSize:15, color:C.text }}>netwrkr<span style={{ color:C.amber }}>.ai</span></span>
          </div>
          {session ? (
            <div style={{ position:"relative" }}><UserBadge/></div>
          ) : (
            <button onClick={()=>window.location.href="/login"} style={{ background:"none", border:`1px solid ${C.border}`, color:C.dim, borderRadius:6, fontFamily:mono, fontSize:12, padding:"7px 14px", cursor:"pointer" }}>sign_in()</button>
          )}
        </div>
      </nav>

      <div style={{ flex:1, overflowY:"auto", padding: isEmpty ? "60px 24px" : "24px 24px 8px" }}>
        <div style={{ maxWidth:740, margin:"0 auto" }}>
          {isEmpty && (
            <div style={{ textAlign:"center", marginBottom:32, animation:"fadeUp 0.3s ease" }}>
              <div style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.1em", marginBottom:14 }}>// JC · data centre copilot</div>
              <h1 style={{ fontSize:28, fontWeight:300, letterSpacing:"-0.02em", lineHeight:1.3, marginBottom:10 }}>
                Ask JC anything about your <span style={{ color:C.amber }}>data centre fabric</span>.
              </h1>
              <p style={{ fontSize:14, color:C.dim, lineHeight:1.7 }}>No sign-up needed to start. Paste your device inventory and JC will analyse it right here.</p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} member={member} personaName="JC" personaTitle="Data Centre Copilot" extraCard={extraCard}/>
          ))}

          {aiTyping && messages[messages.length-1]?.content === "" && (
            <div style={{ display:"flex", gap:14, marginTop:20 }}>
              <div style={{ flexShrink:0, width:34, height:34, borderRadius:"50%", background:C.amberG, border:`1px solid ${C.amber}35`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:C.amber, fontSize:15 }}>◈</span>
              </div>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"2px 12px 12px 12px", padding:"14px 18px" }}>
                <TypingDots/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {isEmpty && <SuggestionChips suggestions={exampleQuestions} onSelect={s=>{ setInput(s); inputRef.current?.focus(); }} onUpload={()=>fileRef.current?.click()}/>}

      <div style={{ background:C.hi, borderTop:`1px solid ${C.border}`, padding:"14px 24px", flexShrink:0 }}>
        <div style={{ maxWidth:740, margin:"0 auto" }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8, padding:"10px 14px" }}>
            <span style={{ color:C.muted, fontFamily:mono, fontSize:12, flexShrink:0 }}>→</span>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage(input)}
              placeholder="Ask JC anything, or paste your device inventory…"
              style={{ flex:1, background:"transparent", border:"none", outline:"none", color:C.text, fontSize:14, fontFamily:sans, caretColor:C.amber }}/>
            <button onClick={()=>fileRef.current?.click()} title="Upload inventory file"
              style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, fontFamily:mono, fontSize:13, padding:"7px 10px", cursor:"pointer" }}>
              📎
            </button>
            <button onClick={()=>sendMessage(input)} disabled={!input.trim()||aiTyping}
              style={{ width:36, height:36, border:"none", flexShrink:0, background:input.trim()&&!aiTyping?C.amber:C.muted, cursor:input.trim()&&!aiTyping?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:"#000", fontSize:15, fontWeight:700 }}>↑</span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED_TYPES.join(',')} style={{ display:"none" }}
            onChange={e=>{ const f=e.target.files[0]; if (f) handleFile(f); e.target.value=""; }}/>
          {!session && (
            <div style={{ fontFamily:mono, fontSize:10, color:C.muted, marginTop:6, textAlign:"center" }}>
              {FREE_QUESTION_LIMIT - getAnonQuestionCount() > 0
                ? `// ${FREE_QUESTION_LIMIT - getAnonQuestionCount()} free question${FREE_QUESTION_LIMIT - getAnonQuestionCount() !== 1 ? "s" : ""} left`
                : "// free questions used — sign up to continue"}
            </div>
          )}
        </div>
      </div>

      <Footer/>
    </div>
  );
}
