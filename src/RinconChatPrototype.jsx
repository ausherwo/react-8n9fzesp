import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#080806", surface: "#0E0D0A", hi: "#141310",
  border: "#272318", amber: "#D4A000", amberB: "#FFCA28",
  text: "#EDE8DC", dim: "#9C9278", muted: "#524B3A",
  red: "#EF4444", orange: "#F97316", yellow: "#EAB308", green: "#22C55E",
};

const mono = "JetBrains Mono, Fira Code, monospace";
const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const PRIORITIES = [
  {
    id: "P1",
    title: "APIC controllers require immediate attention",
    summary: "16 high-severity advisories against v5.2(8e) — two affect control plane stability",
    devices: ["APIC-1", "APIC-2"],
    color: C.red,
    dotColor: "#FF6B6B",
  },
  {
    id: "P2",
    title: "Version spread creates sequencing risk",
    summary: "Border Leaf devices running 14.2(7f) while Spine is on 14.3(2f) — upgrade order matters",
    devices: ["Border-Leaf-1", "Border-Leaf-2", "Leaf-3"],
    color: C.orange,
    dotColor: "#F97316",
  },
  {
    id: "P3",
    title: "Firepower advisory — low urgency",
    summary: "Medium advisory on Firepower-1 v7.2.5. Limited exposure in current topology role",
    devices: ["Firepower-1"],
    color: C.yellow,
    dotColor: "#EAB308",
  },
];

const INITIAL_MESSAGE = `I've reviewed your fabric. There are three things that need your attention.

Your APIC controllers are the priority. You're running v5.2(8e) with 16 active advisories against it — two of them affect control plane stability. This needs to be resolved before you touch anything else in the fabric.

Your Border Leaf devices are running behind your Spine infrastructure. That version spread creates sequencing risk for your next maintenance window and needs to be planned carefully.

There's also a medium advisory on Firepower-1 that doesn't require immediate action, but shouldn't be forgotten.

I've laid out the priorities below. Ask me anything — upgrade sequencing, risk assessment, maintenance window planning.`;

const SUGGESTIONS = [
  "What's the upgrade sequence?",
  "Can I delay the APIC work?",
  "How do I plan the maintenance window?",
];

function getAIResponse(input) {
  const q = input.toLowerCase();

  if (q.includes("apic") || q.includes("p1") || q.includes("controller")) {
    return `Your APIC controllers are running v5.2(8e), which has 16 verified advisories against it — confirmed directly from the Cisco PSIRT API.

The two I'd focus on first are the Denial of Service vulnerability and the Privilege Escalation advisory. Both affect the control plane. In an ACI fabric, APIC instability affects policy distribution across the entire fabric, so this isn't something you want to defer past your next maintenance window.

Target APIC v5.2(8j) or later — it resolves the critical advisories and is compatible with your current leaf and spine versions.`;
  }

  if (q.includes("border leaf") || q.includes("sequence") || q.includes("p2") || q.includes("version spread") || q.includes("upgrade")) {
    return `Here's how I'd sequence the upgrades for this fabric:

1. APIC first — always. Never touch the fabric before the controllers are current.
2. Spine switches — once APIC is stable, align spine to the target version.
3. Border Leaf — bring these up to match spine before touching access leaves.
4. Leaf switches — standardise last, once the control and distribution tiers are aligned.

The version mismatch between your Border Leafs (14.2(7f)) and Spines (14.3(2f)) is the kind of drift that accumulates quietly. It's not breaking anything today, but it will complicate your next upgrade cycle if you leave it.`;
  }

  if (q.includes("firepower") || q.includes("p3")) {
    return `The Firepower-1 advisory is medium severity — real but not urgent given its current role in your topology.

Firepower-1 is at the perimeter, not inline with your DC fabric traffic paths, so the exposure is limited. Plan to address this in the cycle after you've resolved the APIC and Border Leaf work.

Just don't let it slip past two maintenance cycles — medium advisories have a way of getting overtaken by higher priorities and quietly forgotten.`;
  }

  if (q.includes("maintenance") || q.includes("plan") || q.includes("window") || q.includes("next steps") || q.includes("what should")) {
    return `Here's how I'd approach your next maintenance window:

Before the window: Confirm APIC upgrade path to v5.2(8j). Validate compatibility with your current leaf and spine versions. Back up APIC configuration and verify policy snapshots.

During the window: APIC first, then spine verification, then Border Leaf alignment. Don't attempt leaf standardisation in the same window — too much change in one cycle.

After the window: Re-run this analysis. I'd expect P1 to clear and P2 severity to drop significantly once Border Leafs are aligned.

Want me to go deeper on any part of this?`;
  }

  if (q.includes("delay") || q.includes("defer") || q.includes("wait") || q.includes("risk")) {
    return `The honest answer: P1 carries real risk if deferred. The control plane advisories on your APICs are the kind that show up in incident reports.

P2 is lower risk today but compounds over time — the longer the version spread sits, the more constrained your upgrade options become.

P3 can comfortably wait one or two cycles.

If you can only address one thing before year-end, it's APIC.`;
  }

  return `Good question. Based on what I can see in your fabric, I'd approach that by looking at the interaction between your APIC version and your current leaf topology.

Can you tell me a bit more about what you're trying to decide? I want to make sure the guidance is specific to your situation rather than generic.`;
}

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

function AIAvatar() {
  return (
    <div style={{
      flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
      background: C.amber + "18", border: `1px solid ${C.amber}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: C.amber, fontSize: 15 }}>◈</span>
    </div>
  );
}

function UserAvatar() {
  return (
    <div style={{
      flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
      background: C.hi, border: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: C.dim, fontSize: 10, fontFamily: mono }}>you</span>
    </div>
  );
}

function PriorityCard({ p, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.hi : C.surface,
        border: `1px solid ${hovered ? p.color + "50" : C.border}`,
        borderLeft: `3px solid ${p.color}`,
        borderRadius: 7,
        padding: "13px 15px",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              fontFamily: mono, fontSize: 10, fontWeight: 700,
              color: p.color, background: p.color + "18",
              border: `1px solid ${p.color}30`,
              padding: "1px 8px", borderRadius: 3,
            }}>{p.id}</span>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{p.title}</span>
          </div>
          <p style={{ margin: "0 0 8px", color: C.dim, fontSize: 12, lineHeight: 1.55 }}>{p.summary}</p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {p.devices.map(d => (
              <span key={d} style={{
                fontFamily: mono, fontSize: 10, color: C.muted,
                background: C.bg, border: `1px solid ${C.border}`,
                padding: "1px 7px", borderRadius: 3,
              }}>{d}</span>
            ))}
          </div>
        </div>
        <span style={{ color: hovered ? C.amber : C.muted, fontSize: 13, flexShrink: 0, transition: "color 0.15s" }}>→</span>
      </div>
    </div>
  );
}

export default function RinconChatPrototype() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showCards, setShowCards] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Animate initial message
  useEffect(() => {
    const delay = setTimeout(() => {
      let i = 0;
      const len = INITIAL_MESSAGE.length;
      const tick = setInterval(() => {
        i += 3; // ~3 chars per tick for speed
        if (i >= len) {
          i = len;
          clearInterval(tick);
          setTimeout(() => {
            setShowCards(true);
            setTimeout(() => setReady(true), 300);
          }, 350);
        }
        setDisplayedText(INITIAL_MESSAGE.slice(0, i));
      }, 14);
      return () => clearInterval(tick);
    }, 600);
    return () => clearTimeout(delay);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedText, showCards, aiTyping]);

  const send = (text) => {
    const msg = (text || input).trim();
    if (!msg || !ready) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      setMessages(prev => [...prev, { role: "ai", content: getAIResponse(msg) }]);
    }, 1000 + Math.random() * 600);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: sans, color: C.text }}>

      {/* Topbar */}
      <div style={{
        background: C.hi, borderBottom: `1px solid ${C.border}`,
        padding: "11px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 26, height: 26, background: C.amber, borderRadius: 5,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#000", fontFamily: mono, fontSize: 13, fontWeight: 700 }}>~</span>
          </div>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: C.text }}>
            netwrkr<span style={{ color: C.amber }}>.ai</span>
          </span>
          <span style={{ color: C.muted, fontFamily: mono, fontSize: 11 }}>/ rincon</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
            <span style={{ color: C.dim, fontFamily: mono, fontSize: 10 }}>analysis complete</span>
          </div>
          <div style={{ width: 1, height: 14, background: C.border }} />
          <button style={{
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.dim, fontFamily: mono, fontSize: 10,
            padding: "4px 11px", borderRadius: 4, cursor: "pointer",
          }}>← new_analysis()</button>
          <button style={{
            background: C.amber + "15", border: `1px solid ${C.amber}35`,
            color: C.amber, fontFamily: mono, fontSize: 10,
            padding: "4px 11px", borderRadius: 4, cursor: "pointer",
          }}>export_report()</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 24px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>

          {/* Initial AI message */}
          <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
            <AIAvatar />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.amber }}>DC Expert</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>rincon · fabric analysis</span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap", color: C.text }}>
                {displayedText}
                {!showCards && displayedText.length > 0 && (
                  <span style={{ color: C.amber, animation: "blink 0.9s infinite" }}>▌</span>
                )}
              </div>

              {/* Priority cards */}
              {showCards && (
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
                  {PRIORITIES.map(p => (
                    <PriorityCard
                      key={p.id}
                      p={p}
                      onClick={() => { setInput(`Tell me more about ${p.id} — ${p.title}`); inputRef.current?.focus(); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conversation */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, marginTop: 20,
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}>
              {msg.role === "ai" ? <AIAvatar /> : <UserAvatar />}
              <div style={{
                maxWidth: "78%",
                background: msg.role === "user" ? C.amber + "12" : C.surface,
                border: `1px solid ${msg.role === "user" ? C.amber + "25" : C.border}`,
                borderRadius: msg.role === "user" ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                padding: "12px 16px",
              }}>
                {msg.role === "ai" && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.amber }}>DC Expert</span>
                  </div>
                )}
                <div style={{ fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-wrap", color: C.text }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {/* AI typing indicator */}
          {aiTyping && (
            <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
              <AIAvatar />
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: "2px 12px 12px 12px", padding: "14px 18px",
              }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Suggested questions */}
      {ready && messages.length === 0 && (
        <div style={{ padding: "0 24px 14px" }}>
          <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  background: "transparent", border: `1px solid ${C.border}`,
                  color: C.dim, fontFamily: mono, fontSize: 11,
                  padding: "6px 13px", borderRadius: 20, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber + "55"; e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        background: C.hi, borderTop: `1px solid ${C.border}`,
        padding: "14px 24px", flexShrink: 0,
      }}>
        <div style={{ maxWidth: 740, margin: "0 auto", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            flex: 1, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px",
          }}>
            <span style={{ color: C.muted, fontFamily: mono, fontSize: 12, flexShrink: 0 }}>→</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={ready ? "Ask anything about this fabric..." : "Analysing your fabric..."}
              disabled={!ready}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: C.text, fontSize: 14, fontFamily: sans,
                caretColor: C.amber,
              }}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || !ready}
            style={{
              width: 40, height: 40, borderRadius: 8, border: "none",
              background: input.trim() && ready ? C.amber : C.muted,
              cursor: input.trim() && ready ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s", flexShrink: 0,
            }}
          >
            <span style={{ color: "#000", fontSize: 15, fontWeight: 700 }}>↑</span>
          </button>
        </div>
        <div style={{ maxWidth: 740, margin: "6px auto 0", paddingLeft: 2 }}>
          <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>
            Netwrkr Intel · Cisco PSIRT verified · fabric analysis powered by Rincon
          </span>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes dotPulse { 0%, 100% { transform: scale(1); opacity: 0.5 } 50% { transform: scale(1.4); opacity: 1 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #272318; border-radius: 2px; }
        input::placeholder { color: #524B3A; }
      `}</style>
    </div>
  );
}
