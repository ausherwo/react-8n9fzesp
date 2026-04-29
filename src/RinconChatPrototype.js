// RinconChatPrototype.js — v2.0
// Rincon: Real Claude API, Supabase conversation persistence, history sidebar
// Modes: standalone chat + post-analysis deep dive
// Persona: Full DC expert — Cisco platforms, bugs, upgrade sequencing

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from './Auth';
import { supabase } from './supabaseClient';
import UserBadge from './UserBadge';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
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
// RINCON SYSTEM PROMPT
// Full DC expert persona
// ─────────────────────────────────────────────
const RINCON_SYSTEM = `You are Rincon, an expert Cisco data centre network engineer embedded in netwrkr.ai. You have deep knowledge of:

- Cisco ACI fabric architecture (APIC, Nexus 9000 series, spines, leafs, border leafs)
- NX-OS and ACI software versions, known bugs, CVEs, and upgrade paths
- Cisco PSIRT advisories and CSC bug IDs
- DC fabric upgrade sequencing (Controllers → Spine → Border Leaf → Leaf)
- BGP, VXLAN/EVPN, vPC, ECMP, and other DC networking protocols
- End-of-life / end-of-support implications for Cisco hardware and software
- Maintenance window planning and change risk assessment

BEHAVIOUR RULES:
1. Be direct and precise — DC engineers don't want padding
2. When discussing bugs or vulnerabilities, always distinguish between verified (PSIRT confirmed) and your training knowledge
3. Never fabricate CSC IDs — if you don't know the exact ID, say so
4. Upgrade recommendations must follow the tier order: Controllers first, then Spine, then Border Leaf, then Leaf
5. Use cautious language for unverified findings: "may affect", "worth checking", "review recommended"
6. When analysis data is provided in the conversation, ground your answers in that data first before drawing on general knowledge
7. Keep responses focused — if an engineer asks a specific question, answer it specifically
8. You can and should ask clarifying questions when the engineer's fabric context is ambiguous

TONE: Technical peer, not a customer service agent. Think senior network architect talking to another engineer.

FORMAT: Use plain text. For lists use dashes. For version numbers use exact notation (e.g. 9.3(9), 16.1(5e)). No markdown headers — this is a chat interface.`;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
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

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: C.amber, opacity: 0.5,
          animation: `dotPulse 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// AVATARS
// ─────────────────────────────────────────────
function RinconAvatar() {
  return (
    <div style={{
      flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
      background: C.amberG, border: `1px solid ${C.amber}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: C.amber, fontSize: 15 }}>◈</span>
    </div>
  );
}

function UserAvatar({ member }) {
  const initials = member ? getInitials(member.name, member.email) : '?';
  return (
    <div style={{
      flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
      background: "rgba(212,160,0,0.12)", border: `1px solid rgba(212,160,0,0.25)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: 11, fontWeight: 700, color: C.amber,
    }}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────
function MessageBubble({ msg, member }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", gap: 14, marginTop: 20,
      flexDirection: isUser ? "row-reverse" : "row",
      animation: "fadeUp 0.2s ease",
    }}>
      {isUser ? <UserAvatar member={member} /> : <RinconAvatar />}
      <div style={{
        maxWidth: "78%",
        background: isUser ? `${C.amber}12` : C.surface,
        border: `1px solid ${isUser ? `${C.amber}25` : C.border}`,
        borderRadius: isUser ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
        padding: "12px 16px",
      }}>
        {!isUser && (
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.amber }}>Rincon</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>DC Expert</span>
          </div>
        )}
        <div style={{
          fontSize: 14, lineHeight: 1.75,
          whiteSpace: "pre-wrap", color: C.text,
          fontFamily: sans,
        }}>
          {msg.content}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 6, textAlign: isUser ? "left" : "right" }}>
          {timeAgo(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HISTORY SIDEBAR ITEM
// ─────────────────────────────────────────────
function ConversationItem({ conv, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "11px 16px",
        background: active ? C.amberG : hov ? C.hi : "transparent",
        borderLeft: `2px solid ${active ? C.amber : "transparent"}`,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        fontSize: 12, color: active ? C.text : C.dim,
        fontWeight: active ? 500 : 400,
        marginBottom: 3,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {conv.title || "New conversation"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
          {timeAgo(conv.created_at)}
        </span>
        {conv.is_analysis && (
          <span style={{
            fontFamily: mono, fontSize: 9, color: C.amber,
            background: C.amberG, border: `1px solid ${C.amber}30`,
            padding: "1px 5px",
          }}>
            analysis
          </span>
        )}
        {conv.message_count > 0 && (
          <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
            {conv.message_count} msgs
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUGGESTION CHIPS
// ─────────────────────────────────────────────
const STANDALONE_SUGGESTIONS = [
  "What's the safest upgrade path for a 9.3(x) fabric?",
  "How do I check if CSCvz88341 affects my fabric?",
  "What should I do before a major ACI upgrade?",
  "Explain vPC peer-link failure scenarios",
  "Border leaf BGP best practices for ACI",
];

function SuggestionChips({ onSelect }) {
  return (
    <div style={{ padding: "0 24px 16px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 10, letterSpacing: "0.08em" }}>
          // suggested questions
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STANDALONE_SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => onSelect(s)}
              style={{
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.dim, fontFamily: mono, fontSize: 11,
                padding: "6px 13px", cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${C.amber}55`;
                e.currentTarget.style.color = C.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.dim;
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function RinconChatPrototype() {
  const { member, session } = useAuth();

  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId]   = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [aiTyping, setAiTyping]           = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streamingText, setStreamingText]   = useState("");

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const authHeader = { Authorization: `Bearer ${session?.access_token}` };

  // ── Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping, streamingText]);

  // ── Load conversation history on mount
  useEffect(() => {
    if (session) loadConversations();
  }, [session]);

  // ── Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
    else setMessages([]);
  }, [activeConvId]);

  // ─────────────────────────────────────────────
  // SUPABASE: Load conversations list
  // ─────────────────────────────────────────────
  const loadConversations = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at, is_analysis, message_count')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (!error && data) setConversations(data);
    setLoadingHistory(false);
  };

  // ─────────────────────────────────────────────
  // SUPABASE: Load messages for a conversation
  // ─────────────────────────────────────────────
  const loadMessages = async (convId) => {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (!error && data) setMessages(data);
  };

  // ─────────────────────────────────────────────
  // SUPABASE: Create new conversation
  // ─────────────────────────────────────────────
  const createConversation = async (firstMessage, isAnalysis = false) => {
    // Generate title from first message (first 60 chars)
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
    const { data: { session: s } } = await supabase.auth.getSession();
    console.log('supabase session user:', s?.user?.email);
    console.log('org id being sent:', org?.id);
    console.log('member id being sent:', member?.id);
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title,
        is_analysis: isAnalysis,
        message_count: 0,
        org_id: member?.org_id || session?.user?.app_metadata?.org_id,
        member_id: member?.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Failed to create conversation:', error);
      return null;
    }
    return data.id;
  };

  // ─────────────────────────────────────────────
  // SUPABASE: Save a message
  // ─────────────────────────────────────────────
  const saveMessage = async (convId, role, content) => {
    const { data, error } = await supabase
      .from('conversation_messages')
      .insert({ conversation_id: convId, role, content, org_id: member?.org_id })
      .select('id, role, content, created_at')
      .single();

    if (error) { console.error('Failed to save message:', error); return null; }

    // Increment message count
    await supabase.rpc('increment_message_count', { p_conversation_id: convId });

    return data;
  };

  // ─────────────────────────────────────────────
  // CLAUDE API CALL
  // ─────────────────────────────────────────────
  const callClaude = async (conversationHistory) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: RINCON_SYSTEM,
        messages: conversationHistory.map(m => ({
          role: m.role === "ai" ? "assistant" : m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  };

  // ─────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────
  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || aiTyping) return;
    setInput("");

    let convId = activeConvId;

    // Create new conversation if none active
    if (!convId) {
      convId = await createConversation(msg);
      if (!convId) return;
      setActiveConvId(convId);
    }

    // Save user message to Supabase
    const savedUserMsg = await saveMessage(convId, "user", msg);
    if (!savedUserMsg) return;

    // Optimistically add to UI
    setMessages(prev => [...prev, savedUserMsg]);
    setAiTyping(true);

    try {
      // Build history for Claude (include new message)
      const history = [
        ...messages,
        savedUserMsg,
      ];

      const aiResponse = await callClaude(history);

      // Save AI response to Supabase
      const savedAiMsg = await saveMessage(convId, "assistant", aiResponse);

      setAiTyping(false);

      if (savedAiMsg) {
        // Map assistant → ai for display consistency
        setMessages(prev => [...prev, { ...savedAiMsg, role: "ai" }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "ai",
          content: aiResponse,
          created_at: new Date().toISOString(),
        }]);
      }

      // Refresh conversation list to update timestamps
      loadConversations();

    } catch (err) {
      console.error("Claude API error:", err);
      setAiTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "ai",
        content: "I ran into an issue reaching the API. Please try again.",
        created_at: new Date().toISOString(),
      }]);
    }
  };

  // ─────────────────────────────────────────────
  // NEW CONVERSATION
  // ─────────────────────────────────────────────
  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{
      background: C.bg, minHeight: "100vh",
      display: "flex", flexDirection: "column",
      fontFamily: sans, color: C.text,
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: ${C.muted}; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.4); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{
        background: C.hi, borderBottom: `1px solid ${C.border}`,
        padding: "11px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              background: "none", border: `1px solid ${C.border}`,
              color: C.muted, padding: "5px 8px", cursor: "pointer",
              fontFamily: mono, fontSize: 11, transition: "all 0.15s",
            }}
            title={sidebarOpen ? "Hide history" : "Show history"}
          >
            {sidebarOpen ? "◧" : "▣"}
          </button>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, background: C.amber,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#000", fontFamily: mono, fontSize: 13, fontWeight: 700 }}>◈</span>
            </div>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: C.text }}>
              netwrkr<span style={{ color: C.amber }}>.ai</span>
            </span>
            <span style={{ color: C.muted, fontFamily: mono, fontSize: 11 }}>/ rincon</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* New conversation */}
          <button
            onClick={newConversation}
            style={{
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.dim, fontFamily: mono, fontSize: 10,
              padding: "5px 12px", cursor: "pointer", transition: "all 0.15s",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.amber}55`; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
          >
            + new_chat()
          </button>

          {/* Go to full analysis */}
          <button
            onClick={() => window.location.href = '/analyse'}
            style={{
              background: `${C.amber}15`, border: `1px solid ${C.amber}35`,
              color: C.amber, fontFamily: mono, fontSize: 10,
              padding: "5px 12px", cursor: "pointer", transition: "all 0.15s",
              letterSpacing: "0.05em",
            }}
          >
            run_analysis() →
          </button>

          <div style={{ width: 1, height: 20, background: C.border }} />
          <UserBadge />
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <div style={{
            width: 260, flexShrink: 0,
            background: C.surface,
            borderRight: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            animation: "fadeUp 0.2s ease",
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: "14px 16px 10px",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
                // conversations
              </div>
              <button
                onClick={newConversation}
                style={{
                  width: "100%", background: C.amberG,
                  border: `1px solid ${C.amber}30`,
                  color: C.amber, fontFamily: mono, fontSize: 11,
                  padding: "8px", cursor: "pointer",
                  transition: "all 0.15s", letterSpacing: "0.05em",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.amber}25`}
                onMouseLeave={e => e.currentTarget.style.background = C.amberG}
              >
                + new_chat()
              </button>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingHistory ? (
                <div style={{ padding: "20px 16px", fontFamily: mono, fontSize: 11, color: C.muted }}>
                  Loading…
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: "20px 16px" }}>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                    // no conversations yet
                  </div>
                </div>
              ) : (
                <>
                  {/* Group: analyses */}
                  {conversations.some(c => c.is_analysis) && (
                    <>
                      <div style={{ padding: "12px 16px 6px", fontFamily: mono, fontSize: 9, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Fabric analyses
                      </div>
                      {conversations.filter(c => c.is_analysis).map(conv => (
                        <ConversationItem
                          key={conv.id}
                          conv={conv}
                          active={conv.id === activeConvId}
                          onClick={() => setActiveConvId(conv.id)}
                        />
                      ))}
                    </>
                  )}

                  {/* Group: chats */}
                  {conversations.some(c => !c.is_analysis) && (
                    <>
                      <div style={{ padding: "12px 16px 6px", fontFamily: mono, fontSize: 9, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Conversations
                      </div>
                      {conversations.filter(c => !c.is_analysis).map(conv => (
                        <ConversationItem
                          key={conv.id}
                          conv={conv}
                          active={conv.id === activeConvId}
                          onClick={() => setActiveConvId(conv.id)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Sidebar footer — link to full history */}
            <div style={{
              padding: "12px 16px",
              borderTop: `1px solid ${C.border}`,
            }}>
              <button
                onClick={() => window.location.href = '/history'}
                style={{
                  width: "100%", background: "none",
                  border: `1px solid ${C.border}`,
                  color: C.muted, fontFamily: mono, fontSize: 10,
                  padding: "7px", cursor: "pointer", transition: "all 0.15s",
                  letterSpacing: "0.05em",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.amber}44`; e.currentTarget.style.color = C.dim; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
              >
                view_full_history() →
              </button>
            </div>
          </div>
        )}

        {/* ── CHAT AREA ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 24px" }}>
            <div style={{ maxWidth: 740, margin: "0 auto" }}>

              {/* Empty state */}
              {isEmpty && (
                <div style={{ animation: "fadeUp 0.4s ease" }}>
                  <div style={{ marginBottom: 40, paddingTop: 20 }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 10,
                      background: C.amberG, border: `1px solid ${C.amber}30`,
                      padding: "8px 16px", marginBottom: 24,
                    }}>
                      <span style={{ color: C.amber, fontSize: 16 }}>◈</span>
                      <span style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.08em" }}>
                        Rincon · DC Expert
                      </span>
                    </div>
                    <h1 style={{
                      fontSize: 28, fontWeight: 300,
                      letterSpacing: "-0.03em", lineHeight: 1.2,
                      marginBottom: 14, color: C.text,
                    }}>
                      What does your fabric<br />
                      <span style={{ color: C.amber }}>need to know?</span>
                    </h1>
                    <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.8, maxWidth: 480 }}>
                      Ask me anything about your Cisco DC fabric — upgrade sequencing,
                      known bugs, version compatibility, BGP, ACI architecture,
                      maintenance planning. I know the platforms.
                    </p>
                  </div>

                  {/* Capability hints */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10, marginBottom: 32,
                  }}>
                    {[
                      ["↑", "Upgrade sequencing", "Safe order for your fabric tier by tier"],
                      ["⚠", "Bug research", "Known issues for your platform + version"],
                      ["⟳", "Version compatibility", "APIC ↔ leaf ↔ spine alignment rules"],
                    ].map(([icon, title, desc]) => (
                      <div key={title} style={{
                        background: C.surface, border: `1px solid ${C.border}`,
                        padding: "14px 16px",
                      }}>
                        <div style={{ fontFamily: mono, fontSize: 16, color: C.amber, marginBottom: 8 }}>
                          {icon}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 4 }}>
                          {title}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                          {desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={{ ...msg, role: msg.role === "assistant" ? "ai" : msg.role }}
                  member={member}
                />
              ))}

              {/* AI typing indicator */}
              {aiTyping && (
                <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
                  <RinconAvatar />
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: "2px 12px 12px 12px", padding: "14px 18px",
                  }}>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 8 }}>
                      Rincon · thinking
                    </div>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Suggestion chips — only on empty state */}
          {isEmpty && (
            <SuggestionChips onSelect={(s) => { setInput(s); inputRef.current?.focus(); }} />
          )}

          {/* ── INPUT BAR ── */}
          <div style={{
            background: C.hi, borderTop: `1px solid ${C.border}`,
            padding: "14px 24px", flexShrink: 0,
          }}>
            <div style={{ maxWidth: 740, margin: "0 auto" }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                display: "flex", alignItems: "flex-end", gap: 8,
                padding: "10px 14px",
                transition: "border-color 0.15s",
              }}>
                <span style={{ color: C.muted, fontFamily: mono, fontSize: 12, flexShrink: 0, paddingBottom: 2 }}>→</span>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask Rincon anything about your Cisco DC fabric…"
                  disabled={aiTyping}
                  rows={1}
                  style={{
                    flex: 1, background: "transparent", border: "none",
                    outline: "none", color: C.text, fontSize: 14,
                    fontFamily: sans, resize: "none", lineHeight: 1.5,
                    maxHeight: 120, overflowY: "auto",
                    caretColor: C.amber,
                  }}
                  onInput={e => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || aiTyping}
                  style={{
                    width: 36, height: 36, border: "none", flexShrink: 0,
                    background: input.trim() && !aiTyping ? C.amber : C.muted,
                    cursor: input.trim() && !aiTyping ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ color: "#000", fontSize: 15, fontWeight: 700 }}>↑</span>
                </button>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: 6, paddingLeft: 2,
              }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
                  Rincon · Cisco DC Expert · powered by Claude
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
                  ↵ send · shift+↵ newline
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}