// StrategyPage.js
// v1.0 — internal strategy document, password protected
// Route: /strategy

import { useState } from "react";

const C = {
  bg:"#080806", surface:"#0E0D0A", hi:"#141310",
  border:"#272318", amber:"#D4A000", amberB:"#FFCA28",
  amberG:"#D4A00015", green:"#22C55E", greenG:"#22C55E15",
  red:"#EF4444", orange:"#F97316", yellow:"#EAB308",
  text:"#EDE8DC", dim:"#9C9278", muted:"#524B3A", faint:"#1A1810",
};

const mono = "JetBrains Mono, Fira Code, monospace";
const sans = "'DM Sans', system-ui, sans-serif";
const PASSWORD = "aiisthefutureman!";

function Lock({ onUnlock }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const attempt = () => {
    if (val === PASSWORD) {
      onUnlock();
    } else {
      setErr(true);
      setVal("");
      setTimeout(() => setErr(false), 2000);
    }
  };
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, color: C.text }}>
      <div style={{ width: 380, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "36px 40px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>// restricted access</div>
        <div style={{ fontSize: 22, fontWeight: 300, marginBottom: 6 }}>netwrkr.ai</div>
        <div style={{ fontSize: 13, color: C.dim, marginBottom: 28 }}>Product strategy & north star</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: mono, fontSize: 10, color: C.muted, display: "block", marginBottom: 6, letterSpacing: "0.1em" }}>PASSPHRASE</label>
          <input
            type="password"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="enter passphrase"
            autoFocus
            style={{ background: C.hi, border: `1px solid ${err ? C.red : C.border}`, color: err ? C.red : C.text, fontFamily: mono, fontSize: 13, padding: "10px 13px", borderRadius: 6, outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" }}
          />
          {err && <div style={{ fontFamily: mono, fontSize: 11, color: C.red, marginTop: 6 }}>// incorrect passphrase</div>}
        </div>
        <button onClick={attempt} style={{ background: C.amber, color: "#000", border: "none", borderRadius: 6, fontFamily: mono, fontWeight: 700, fontSize: 13, padding: "11px", cursor: "pointer", width: "100%" }}>
          access_strategy() →
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        // {label}
      </div>
      {children}
    </div>
  );
}

function Card({ children, accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${accent ? C.amber + "44" : C.border}`, borderRadius: 10, padding: "20px 22px" }}>
      {children}
    </div>
  );
}

function Tag({ children, color = C.amber }) {
  return (
    <span style={{ fontFamily: mono, fontSize: 10, color, background: color + "18", border: `1px solid ${color}30`, padding: "2px 8px", borderRadius: 3, letterSpacing: "0.04em", marginRight: 6 }}>
      {children}
    </span>
  );
}

function Bullet({ children, color = C.amber }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
      <span style={{ color, fontFamily: mono, fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
      <span style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

function StageCard({ num, timing, status, title, desc, bullets, statusColor }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${statusColor}44`, borderRadius: 10, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: statusColor + "22", border: `1px solid ${statusColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 14, fontWeight: 700, color: statusColor, flexShrink: 0 }}>{num}</div>
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{timing}</div>
          <Tag color={statusColor}>{status}</Tag>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 14 }}>{desc}</div>
      {bullets.map((b, i) => <Bullet key={i} color={statusColor}>{b}</Bullet>)}
    </div>
  );
}

export function StrategyPage() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <Lock onUnlock={() => setUnlocked(true)} />;
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
      `}</style>
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${C.border}55 1px,transparent 1px),linear-gradient(90deg,${C.border}55 1px,transparent 1px)`, backgroundSize: "72px 72px", pointerEvents: "none", zIndex: 0, opacity: .4 }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.bg}E8`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 27, height: 27, background: C.amberG, border: `1px solid ${C.amber}44`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 15 }}>netwrkr<span style={{ color: C.amber }}>.ai</span></span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}> / strategy</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Tag color={C.red}>RESTRICTED</Tag>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>internal use only · do not distribute</span>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 48px" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>// product route & north star</div>
            <h1 style={{ fontSize: 44, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
              From the smartest analysis tool<br />in the room to the <span style={{ color: C.amber }}>always-on AI DC<br />engineer</span> every Cisco fabric team relies on.
            </h1>
            <p style={{ fontSize: 15, color: C.dim, lineHeight: 1.8, maxWidth: 600 }}>
              This document is the shared source of truth for netwrkr.ai product strategy. It is a living document — updated as we learn and build.
            </p>
          </div>
          <Section label="North Star">
            <Card accent>
              <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 14, letterSpacing: "0.1em" }}>// the destination</div>
              <p style={{ fontSize: 20, fontWeight: 300, lineHeight: 1.6, marginBottom: 24 }}>
                <span style={{ color: C.amber }}>The AI DC engineer</span> — deployed inside your network, trained on real operational expertise, continuously watching your Cisco fabric. Available to every engineer on your team, every hour of every day, at a fraction of the cost of a permanent hire.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  ["Always On", "Never sleeps. Monitors continuously. Comes to you when something matters."],
                  ["Inside Your Network", "Deployed as a container. Uses your credentials. Your data never leaves your perimeter."],
                  ["Expert Reasoning", "Trained on real DC operational knowledge. Thinks like a senior architect, not a search engine."],
                  ["Independent", "Not Cisco. Not a vendor. The unbiased second opinion your team can trust completely."],
                ].map(([t, d]) => (
                  <div key={t} style={{ background: C.hi, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 14px" }}>
                    <div style={{ fontFamily: mono, fontSize: 12, color: C.amber, marginBottom: 6 }}>{t}</div>
                    <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{d}</div>
                  </div>
                ))}
              </div>
            </Card>
          </Section>
          <Section label="Product Development Route">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <StageCard num="1" timing="Now · Live" status="SHIPPED" statusColor={C.green} title="Analysis & Advisory Intelligence" desc="Point-in-time risk assessment with live PSIRT data. The foundation of trust." bullets={["Inventory normalisation", "Live PSIRT integration", "P1/P2/P3 prioritisation", "Rincon DC expert chat", "ACI fabric detection"]} />
              <StageCard num="2" timing="Next · Building" status="IN DEVELOPMENT" statusColor={C.amber} title="Continuous Monitoring" desc="From a tool you use to infrastructure you rely on. Always watching." bullets={["Persistent fabric model", "Scheduled PSIRT checks", "Proactive Rincon alerts", "Change detection", "Direct APIC integration"]} />
              <StageCard num="3" timing="Near Term · Vision" status="VISION" statusColor={C.orange} title="AI Engineering Assistant" desc="Rincon does the work. Engineer reviews and approves. Hours saved before every window." bullets={["Change request drafting", "Upgrade path planning", "Maintenance briefing packs", "ServiceNow / Jira integration", "CISO compliance reporting"]} />
              <StageCard num="4" timing="North Star · Goal" status="NORTH STAR" statusColor={C.amber} title="The AI DC Engineer" desc="The always-on operational brain. Deployed inside your network. Never forgets. Never misses." bullets={["Containerised in-network agent", "Nexus Dashboard API depth", "Autonomous advisory triage", "Institutional knowledge capture", "Multi-vendor expansion"]} />
            </div>
          </Section>
          <Section label="The Transformation Story">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                ["01", "What it replaces", C.red, ["Manual PSIRT cross-referencing", "Spreadsheet-based inventory tracking", "Tribal knowledge guesswork", "Pre-maintenance manual prep"]],
                ["02", "What it transforms", C.orange, ["Occasional tool → daily infrastructure", "Reactive → proactive risk management", "Snapshot → living fabric model", "Engineer asks → Rincon tells"]],
                ["03", "What it automates", C.amber, ["Change request creation", "Upgrade sequence planning", "Risk assessment writing", "Advisory triage and ticketing"]],
                ["04", "What it becomes", C.green, ["The colleague who never leaves", "Institutional memory, permanent", "Independent operational brain", "The AI DC engineer"]],
              ].map(([num, title, color, items]) => (
                <Card key={num}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 6 }}>{num}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14, color }}>{title}</div>
                  {items.map((item, i) => <Bullet key={i} color={color}>{item}</Bullet>)}
                </Card>
              ))}
            </div>
          </Section>
          <Section label="Enterprise Deployment Model">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10, letterSpacing: "0.1em" }}>// cloud tiers</div>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Individual · Team · Professional</div>
                <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, marginBottom: 16 }}>Self-serve cloud product. Engineers sign up personally, teams upgrade naturally, organisations follow. The bottom-up growth engine.</p>
                <Bullet>No installation required</Bullet>
                <Bullet>Inventory uploaded or pasted</Bullet>
                <Bullet>Public PSIRT API integration</Bullet>
                <Bullet>Rincon chat available</Bullet>
                <Bullet>Global self-serve · £79–£200/mo</Bullet>
              </Card>
              <Card accent>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10, letterSpacing: "0.1em" }}>// enterprise agent</div>
                <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>The In-Network AI DC Engineer</div>
                <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, marginBottom: 16 }}>Containerised agent deployed inside the customer's network perimeter. Authenticates with their own Nexus Dashboard and SNTC credentials. Fabric data never leaves their environment.</p>
                <Bullet>Deployed on customer infrastructure</Bullet>
                <Bullet>Customer's own SNTC + Nexus Dashboard credentials</Bullet>
                <Bullet>Full infrastructure API access — ToS, telemetry, config</Bullet>
                <Bullet>Fabric data stays inside the perimeter</Bullet>
                <Bullet>Rincon intelligence unlocked via secure model calls</Bullet>
                <Bullet>Autonomous fabric maintenance suggestions</Bullet>
                <Bullet>Enterprise pricing — contact us</Bullet>
              </Card>
            </div>
            <div style={{ marginTop: 16, background: C.amberG, border: `1px solid ${C.amber}33`, borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 6 }}>// the security answer</div>
              <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>"Your fabric data, credentials, and topology never leave your network. The agent runs on your infrastructure, uses your credentials, and queries your APIs locally. The only thing that leaves your perimeter is an anonymised question to Rincon — the same way your engineers use Google."</p>
            </div>
          </Section>
          <Section label="Exit Thesis">
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10 }}>// most likely acquirer</div>
                  <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 10 }}>Cisco</div>
                  <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, marginBottom: 14 }}>netwrkr.ai does what Cisco's own tools don't — independent, AI-native, unbiased risk assessment that engineers trust precisely because it isn't Cisco. That's the strategic value.</p>
                  <Bullet>Fills the gap in Cisco's AI portfolio</Bullet>
                  <Bullet>Deepens TAC and PSIRT commercial relationships</Bullet>
                  <Bullet>Natural fit with Cisco AI Assistant for Networking</Bullet>
                </div>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10 }}>// exit modelling</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[["Target ARR", "£2–5M"], ["Exit multiple", "4–10x ARR"], ["Exit range", "£8M–£50M"], ["Timeline", "3–5 years"]].map(([label, val]) => (
                      <div key={label} style={{ background: C.hi, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px" }}>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.amber }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </Section>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>netwrkr.ai · internal strategy document</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>// do not distribute · confidential</span>
          </div>
        </div>
      </div>
    </div>
  );
}