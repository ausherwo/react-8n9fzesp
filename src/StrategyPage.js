  // StrategyPage.js
  // v1.2 — pricing model, Matt's framework, positioning update
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

  function StageCard({ codename, location, num, timing, status, title, desc, bullets, statusColor }) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${statusColor}44`, borderRadius: 10, padding: "20px 22px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: statusColor, letterSpacing: "0.04em", marginBottom: 2 }}>{codename}</div>
          <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>{location}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: statusColor + "22", border: `1px solid ${statusColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 11, fontWeight: 700, color: statusColor, flexShrink: 0 }}>{num}</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{timing}</div>
            <Tag color={statusColor}>{status}</Tag>
          </div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>{title}</div>
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
          {/* Header */}
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

          <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 48px" }}>
            {/* Title */}
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>// product route & north star</div>
              <h1 style={{ fontSize: 44, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
                From the smartest analysis tool<br />in the room to the <span style={{ color: C.amber }}>always-on AI DC<br />engineer</span> every Cisco fabric team relies on.
              </h1>
              <p style={{ fontSize: 15, color: C.dim, lineHeight: 1.8, maxWidth: 600 }}>
                This document is the shared source of truth for netwrkr.ai product strategy. It is a living document — updated as we learn and build.
              </p>
            </div>

            {/* North Star */}
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

            {/* AI Assistant */}
            <Section label="Kelly — The AI DC Engineer Assistant">
              <Card>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 32, fontWeight: 700, color: C.amber, marginBottom: 4 }}>Kelly</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginBottom: 16 }}>// AI DC Engineer Assistant</div>
                    <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>
                      Named after Kelly Slater — the greatest of all time. Kelly is the AI persona embedded across all four products. She gets smarter as you move up the product ladder.
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      ["Cloudbreak", "Analysis chat — answers questions about your risk report"],
                      ["Desert Point", "Monitoring alerts — tells you when something changes"],
                      ["Jaws", "Engineering assistant — drafts change requests and upgrade plans"],
                      ["Ghost Ships", "Autonomous agent — runs inside your network, never sleeps"],
                    ].map(([product, role]) => (
                      <div key={product} style={{ background: C.hi, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 4 }}>{product}</div>
                        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </Section>

            {/* Product Route */}
            <Section label="Product Route — Four Distinct Products">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <StageCard
                  codename="Cloudbreak" location="Tavarua, Fiji"
                  num="1" timing="Now · Live" status="SHIPPED" statusColor={C.green}
                  title="Analysis & Advisory Intelligence"
                  desc="Point-in-time risk assessment with live PSIRT data. The foundation of trust. The wave that hooks you."
                  bullets={["Inventory normalisation", "Live PSIRT integration", "P1/P2/P3 prioritisation", "Kelly DC expert chat", "ACI fabric detection"]}
                />
                <StageCard
                  codename="Desert Point" location="Lombok, Indonesia"
                  num="2" timing="Next · Building" status="IN DEVELOPMENT" statusColor={C.amber}
                  title="Continuous Monitoring"
                  desc="The longest barrel in the world — just keeps running. From a tool you use to infrastructure you rely on."
                  bullets={["Persistent fabric model", "Scheduled PSIRT checks", "Proactive Kelly alerts", "Change detection", "Direct APIC integration"]}
                />
                <StageCard
                  codename="Jaws" location="Pe'ahi, Maui"
                  num="3" timing="Near Term · Vision" status="VISION" statusColor={C.orange}
                  title="AI Engineering Assistant"
                  desc="You need serious commitment and assistance to tackle it. Kelly does the work. Engineer reviews and approves."
                  bullets={["Change request drafting", "Upgrade path planning", "Maintenance briefing packs", "ServiceNow / Jira integration", "CISO compliance reporting"]}
                />
                <StageCard
                  codename="Ghost Ships" location="North Star"
                  num="4" timing="North Star · Goal" status="NORTH STAR" statusColor={C.amber}
                  title="The AI DC Engineer"
                  desc="Autonomous. Always moving. No one at the helm. Deployed inside your network. Never forgets. Never misses."
                  bullets={["Containerised in-network agent", "Nexus Dashboard API depth", "Autonomous advisory triage", "Institutional knowledge capture", "Multi-vendor expansion"]}
                />
              </div>
            </Section>

            {/* Commercial Model */}
            <Section label="Commercial Model">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                {[
                  ["Cloudbreak", C.green, "Free → £99/mo", "Self-serve. No installation. Engineers discover and share. Volume and word of mouth."],
                  ["Desert Point", C.amber, "£300–600/mo", "Per fabric subscription. Once connected, teams don't leave. Sticky recurring revenue."],
                  ["Jaws", C.orange, "£1,000–3,000/mo", "Enterprise contract. Value measured in engineer hours saved per maintenance window."],
                  ["Ghost Ships", C.red, "£50k–200k/yr", "Deployed inside the perimeter. Annual commitment. The Cisco acquisition conversation."],
                ].map(([name, color, price, desc]) => (
                  <div key={name} style={{ background: C.surface, border: `1px solid ${color}33`, borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color, marginBottom: 4 }}>{name}</div>
                    <div style={{ fontFamily: mono, fontSize: 13, color: C.amber, marginBottom: 10 }}>{price}</div>
                    <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Transformation */}
            <Section label="The Transformation Story">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  ["01", "What it replaces", C.red, [
                    "Manual PSIRT cross-referencing",
                    "Spreadsheet-based inventory tracking",
                    "Tribal knowledge guesswork",
                    "Pre-maintenance manual prep",
                  ]],
                  ["02", "What it transforms", C.orange, [
                    "Occasional tool → daily infrastructure",
                    "Reactive → proactive risk management",
                    "Snapshot → living fabric model",
                    "Engineer asks → Kelly tells",
                  ]],
                  ["03", "What it automates", C.amber, [
                    "Change request creation",
                    "Upgrade sequence planning",
                    "Risk assessment writing",
                    "Advisory triage and ticketing",
                  ]],
                  ["04", "What it becomes", C.green, [
                    "The colleague who never leaves",
                    "Institutional memory, permanent",
                    "Independent operational brain",
                    "The AI DC engineer",
                  ]],
                ].map(([num, title, color, items]) => (
                  <Card key={num}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 6 }}>{num}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14, color }}>{title}</div>
                    {items.map((item, i) => <Bullet key={i} color={color}>{item}</Bullet>)}
                  </Card>
                ))}
              </div>
            </Section>

            {/* Positioning */}
            <Section label="Positioning — How We Win">
              <Card accent>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 14, letterSpacing: "0.1em" }}>// the frame that unlocks premium pricing</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
                  <div style={{ background: C.hi, border: `1px solid ${C.red}33`, borderRadius: 8, padding: "16px 18px" }}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.red, marginBottom: 8, letterSpacing: "0.1em" }}>// don't say this</div>
                    <div style={{ fontSize: 15, color: C.dim, lineHeight: 1.6 }}>"AI network operations tool"</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 8 }}>→ SolarWinds comparison · $2k/year conversation</div>
                  </div>
                  <div style={{ background: C.hi, border: `1px solid ${C.green}33`, borderRadius: 8, padding: "16px 18px" }}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: C.green, marginBottom: 8, letterSpacing: "0.1em" }}>// say this</div>
                    <div style={{ fontSize: 15, color: C.text, lineHeight: 1.6, fontWeight: 500 }}>"Decision engine for live data centre fabrics"</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 8 }}>→ NetBrain comparison · $70k–$500k/year conversation</div>
                  </div>
                </div>
                <div style={{ background: C.amberG, border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 6 }}>// the value that justifies the price</div>
                  <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>
                    One bad change in a live DC fabric costs £1M+, career damage, and customer trust. netwrkr.ai eliminates that risk. That is what we price. Not features. Not device counts. The outcome.
                  </p>
                </div>
              </Card>
            </Section>

            {/* Matt's framework */}
            <Section label="The Brain, Hands & Nervous System — Matt's Framework">
              <Card>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 16, letterSpacing: "0.1em" }}>// how the four products map to a complete AI DC engineer</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    ["The Brain", C.green, "Cloudbreak + Desert Point", "Detects risk. Understands the fabric. Reasons across real data. Remembers everything. Recommends action.", "BUILT / BUILDING"],
                    ["The Hands", C.amber, "Jaws", "Executes changes in assist mode. Engineer approves, Kelly runs. Pre-change validation. Post-change verification. Workflow integration.", "VISION"],
                    ["The Nervous System", C.orange, "Ghost Ships", "Streaming telemetry. Real-time fabric awareness. Autonomous operation. Never sleeps. Never misses. The complete AI DC engineer.", "NORTH STAR"],
                  ].map(([title, color, product, desc, status]) => (
                    <div key={title} style={{ background: C.hi, border: `1px solid ${color}33`, borderRadius: 8, padding: "16px 18px" }}>
                      <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
                      <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 10, letterSpacing: "0.08em" }}>{product}</div>
                      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, marginBottom: 12 }}>{desc}</div>
                      <Tag color={color}>{status}</Tag>
                    </div>
                  ))}
                </div>
              </Card>
            </Section>

            {/* Pricing */}
            <Section label="Pricing Model">
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: C.amberG, border: `1px solid ${C.amber}44`, borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 8, letterSpacing: "0.1em" }}>// the pricing philosophy</div>
                  <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, fontWeight: 300 }}>
                    One product. One price. No limits. We are not a monitoring tool with tiers. We are decision infrastructure. The price reflects the outcome, not the features.
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Card>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10, letterSpacing: "0.1em" }}>// Cloudbreak — self-serve funnel</div>
                  <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 16 }}>Bottom-up discovery</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[
                      ["Free (anon)", "£0", "5 analyses"],
                      ["Free (account)", "£0", "10/month"],
                      ["Pro", "£79/mo", "Single seat"],
                      ["Team 5", "£249/mo", "5 seats"],
                      ["Team 10", "£449/mo", "10 seats"],
                    ].map(([tier, price, note]) => (
                      <div key={tier} style={{ background: C.hi, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px" }}>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 3 }}>{tier}</div>
                        <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: C.amber }}>{price}</div>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 2 }}>{note}</div>
                      </div>
                    ))}
                  </div>
                  <Bullet color={C.green}>Engineers discover, love it, bring it to their org</Bullet>
                  <Bullet color={C.green}>No sales motion — self-serve all the way</Bullet>
                  <Bullet color={C.green}>Cloudbreak Pro is the gateway to Desert Point</Bullet>
                </Card>
                <Card accent>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10, letterSpacing: "0.1em" }}>// Desert Point — enterprise decision infrastructure</div>
                  <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>One price. No limits.</div>
                  <div style={{ background: C.hi, border: `1px solid ${C.amber}44`, borderRadius: 8, padding: "20px", marginBottom: 16, textAlign: "center" }}>
                    <div style={{ fontFamily: mono, fontSize: 48, fontWeight: 700, color: C.amber, lineHeight: 1 }}>$70k</div>
                    <div style={{ fontFamily: mono, fontSize: 13, color: C.muted, marginTop: 6 }}>per year · annual contract</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.dim, marginTop: 4 }}>unlimited devices · unlimited engineers · full product</div>
                  </div>
                  <Bullet color={C.amber}>No device limits. No seat limits. No feature tiers.</Bullet>
                  <Bullet color={C.amber}>Below formal procurement threshold for most orgs</Bullet>
                  <Bullet color={C.amber}>Competes with NetBrain — wins on intelligence</Bullet>
                  <Bullet color={C.amber}>Year 2 renewal goes up as Kelly proves value</Bullet>
                  <div style={{ marginTop: 12, background: C.greenG, border: `1px solid ${C.green}33`, borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.green }}>Market context: NetBrain ~$100k–$110k/yr · Cisco DNA $300k–$1,500/device/yr</div>
                  </div>
                </Card>
              </div>
              <div style={{ marginTop: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 8 }}>// the sales motion</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    ["1", "Engineer finds Cloudbreak", "Free tier, no friction, immediate value"],
                    ["2", "Engineer loves Kelly", "Upgrades to Pro, uses daily"],
                    ["3", "Engineer brings it to the org", "\"We should have this properly\""],
                    ["4", "Desert Point conversation", "$70k, Head of Network Eng, 2-week close"],
                  ].map(([num, title, desc]) => (
                    <div key={num} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.amberG, border: `1px solid ${C.amber}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 11, fontWeight: 700, color: C.amber, flexShrink: 0 }}>{num}</div>
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 12, color: C.text, marginBottom: 3 }}>{title}</div>
                        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Exit */}
            <Section label="Exit Thesis">
              <Card>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10 }}>// most likely acquirer</div>
                    <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 10 }}>Cisco</div>
                    <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.7, marginBottom: 14 }}>
                      netwrkr.ai does what Cisco's own tools don't — independent, AI-native, unbiased risk assessment that engineers trust precisely because it isn't Cisco. That's the strategic value.
                    </p>
                    <Bullet>Fills the gap in Cisco's AI portfolio</Bullet>
                    <Bullet>Deepens TAC and PSIRT commercial relationships</Bullet>
                    <Bullet>Natural fit with Cisco AI Assistant for Networking</Bullet>
                    <Bullet>Decision engine + Cisco data = category-defining product</Bullet>
                  </div>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, marginBottom: 10 }}>// exit modelling</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        ["Cloudbreak ARR target", "£2–5M"],
                        ["Desert Point ARR target", "$7–35M"],
                        ["Combined ARR target", "$10–40M"],
                        ["Exit multiple", "4–10x ARR"],
                        ["Exit range", "$40M–$400M"],
                        ["Timeline", "3–5 years"],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: C.hi, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px" }}>
                          <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 4 }}>{label}</div>
                          <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: C.amber }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </Section>

            {/* Footer */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>netwrkr.ai · internal strategy document</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>// do not distribute · confidential</span>
            </div>
          </div>
        </div>
      </div>
    );
  }