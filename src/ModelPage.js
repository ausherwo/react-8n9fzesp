// ModelPage.js
// v1.0 — interactive revenue model, password protected
// Route: /model

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
        <div style={{ fontSize: 13, color: C.dim, marginBottom: 28 }}>Revenue model</div>
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
          access_model() →
        </button>
      </div>
    </div>
  );
}

function fmt(n) {
  if (n >= 1000000) return '£' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '£' + Math.round(n / 1000) + 'k';
  return '£' + Math.round(n).toLocaleString();
}

function Slider({ label, sublabel, id, min, max, step, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div>
          <span style={{ fontFamily: mono, fontSize: 13, color: C.text }}>{label}</span>
          {sublabel && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginLeft: 8 }}>{sublabel}</span>}
        </div>
        <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: C.amber }}>{value.toLocaleString()}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: C.amber, height: 4, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 4 }}>
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{ background: highlight ? C.amberG : C.surface, border: `1px solid ${highlight ? C.amber + "44" : C.border}`, borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: highlight ? 28 : 22, fontWeight: 700, color: highlight ? C.amber : C.text }}>{value}</div>
      {sub && <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        // {label}
      </div>
      {children}
    </div>
  );
}

function Model() {
  const [proSingle, setProSingle]   = useState(1000);
  const [team5, setTeam5]           = useState(250);
  const [team10, setTeam10]         = useState(250);
  const [annualPct, setAnnualPct]   = useState(30);

  // Monthly calculations
  const proRev   = proSingle * 79;
  const t5Rev    = team5 * 249;
  const t10Rev   = team10 * 449;
  const mrr      = proRev + t5Rev + t10Rev;
  const arr      = mrr * 12;
  const seats    = proSingle + (team5 * 5) + (team10 * 10);

  // Annual pricing (2 months free)
  const proAnnualPrice  = 790;
  const t5AnnualPrice   = 2490;
  const t10AnnualPrice  = 4490;

  // Blended ARR (mix of monthly and annual)
  const annualFrac = annualPct / 100;
  const monthlyFrac = 1 - annualFrac;
  const blendedArr =
    (proSingle * annualFrac * proAnnualPrice) +
    (proSingle * monthlyFrac * 79 * 12) +
    (team5 * annualFrac * t5AnnualPrice) +
    (team5 * monthlyFrac * 249 * 12) +
    (team10 * annualFrac * t10AnnualPrice) +
    (team10 * monthlyFrac * 449 * 12);

  const exit4  = blendedArr * 4;
  const exit10 = blendedArr * 10;

  // Revenue breakdown
  const totalOrgs = proSingle + team5 + team10;

  return (
    <div>
      <Section label="Cloudbreak — customer inputs">
        <Slider label="Pro single seat" sublabel="£79/mo" min={0} max={5000} step={50} value={proSingle} onChange={setProSingle} />
        <Slider label="Team 5-seat orgs" sublabel="£249/mo" min={0} max={1000} step={5} value={team5} onChange={setTeam5} />
        <Slider label="Team 10-seat orgs" sublabel="£449/mo" min={0} max={1000} step={5} value={team10} onChange={setTeam10} />
        <Slider label="Annual contract %" sublabel="% of customers on annual (2 months free)" min={0} max={100} step={5} value={annualPct} onChange={setAnnualPct} />
      </Section>

      <Section label="Monthly snapshot">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
          <MetricCard label="Pro revenue" value={fmt(proRev)} sub="per month" />
          <MetricCard label="Team 5 revenue" value={fmt(t5Rev)} sub="per month" />
          <MetricCard label="Team 10 revenue" value={fmt(t10Rev)} sub="per month" />
          <MetricCard label="Paying engineers" value={seats.toLocaleString()} sub={`across ${totalOrgs.toLocaleString()} orgs`} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <MetricCard label="Monthly recurring revenue" value={fmt(mrr)} sub="blended MRR" highlight />
          <MetricCard label="Run-rate ARR" value={fmt(arr)} sub="MRR × 12" />
        </div>
      </Section>

      <Section label="ARR with annual mix">
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginBottom: 8 }}>
            {annualPct}% annual ({fmt(blendedArr - arr > 0 ? blendedArr - arr : arr - blendedArr)} {blendedArr > arr ? "uplift" : "discount"} vs all-monthly)
          </div>
          <div style={{ fontFamily: mono, fontSize: 32, fontWeight: 700, color: C.amber }}>{fmt(blendedArr)}</div>
          <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, marginTop: 4 }}>blended ARR</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <MetricCard label="Revenue per org" value={fmt(blendedArr / Math.max(totalOrgs, 1))} sub="avg annual" />
          <MetricCard label="Exit at 4× ARR" value={fmt(exit4)} sub="conservative" />
          <MetricCard label="Exit at 10× ARR" value={fmt(exit10)} sub="optimistic" highlight />
        </div>
      </Section>

      <Section label="Milestones">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            ["£1M ARR", "~105 Pro + 30 teams", blendedArr >= 1000000],
            ["£2M ARR", "~210 Pro + 60 teams", blendedArr >= 2000000],
            ["£5M ARR", "~530 Pro + 150 teams", blendedArr >= 5000000],
          ].map(([label, hint, reached]) => (
            <div key={label} style={{ background: reached ? C.greenG : C.surface, border: `1px solid ${reached ? C.green + "44" : C.border}`, borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: reached ? C.green : C.muted, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: reached ? C.green : C.dim }}>{label}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 3 }}>{hint}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function ModelPage() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) return <Lock onUnlock={() => setUnlocked(true)} />;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        input[type=range]{-webkit-appearance:none;appearance:none;background:${C.border};border-radius:2px;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${C.amber};cursor:pointer;}
      `}</style>
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${C.border}55 1px,transparent 1px),linear-gradient(90deg,${C.border}55 1px,transparent 1px)`, backgroundSize: "72px 72px", pointerEvents: "none", zIndex: 0, opacity: .4 }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: `${C.bg}E8`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 27, height: 27, background: C.amberG, border: `1px solid ${C.amber}44`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 15 }}>netwrkr<span style={{ color: C.amber }}>.ai</span></span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}> / model</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.muted, background: C.red + "22", border: `1px solid ${C.red}30`, padding: "2px 8px", borderRadius: 3 }}>RESTRICTED</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>internal use only</span>
            <button onClick={() => window.location.href = "/strategy"} style={{ background: "none", border: `1px solid ${C.border}`, color: C.dim, fontFamily: mono, fontSize: 11, padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>
              ← strategy
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 48px" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>// revenue model</div>
            <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 12 }}>
              Cloudbreak — <span style={{ color: C.amber }}>interactive model</span>
            </h1>
            <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.7 }}>
              Adjust customer numbers and annual contract mix to model ARR and exit scenarios. All figures in GBP.
            </p>
          </div>

          <Model />

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>netwrkr.ai · cloudbreak revenue model</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>// internal use only</span>
          </div>
        </div>
      </div>
    </div>
  );
}