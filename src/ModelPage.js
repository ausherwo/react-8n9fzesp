// ModelPage.js
// v1.2 — Cloudbreak + Desert Point combined model
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
    if (val === PASSWORD) { onUnlock(); }
    else { setErr(true); setVal(""); setTimeout(() => setErr(false), 2000); }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, color: C.text }}>
      <div style={{ width: 380, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "36px 40px" }}>
        <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>// restricted access</div>
        <div style={{ fontSize: 22, fontWeight: 300, marginBottom: 6 }}>netwrkr.ai</div>
        <div style={{ fontSize: 13, color: C.dim, marginBottom: 28 }}>Revenue model</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: mono, fontSize: 10, color: C.muted, display: "block", marginBottom: 6, letterSpacing: "0.1em" }}>PASSPHRASE</label>
          <input type="password" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="enter passphrase" autoFocus
            style={{ background: C.hi, border: `1px solid ${err ? C.red : C.border}`, color: err ? C.red : C.text, fontFamily: mono, fontSize: 13, padding: "10px 13px", borderRadius: 6, outline: "none", width: "100%", boxSizing: "border-box" }} />
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

function fmtUSD(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + Math.round(n).toLocaleString();
}

function Slider({ label, sublabel, min, max, step, value, onChange, color = C.amber }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div>
          <span style={{ fontFamily: mono, fontSize: 13, color: C.text }}>{label}</span>
          {sublabel && <span style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginLeft: 8 }}>{sublabel}</span>}
        </div>
        <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color }}>{value.toLocaleString()}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: color, height: 4, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10, color: C.muted, marginTop: 4 }}>
        <span>{min.toLocaleString()}</span><span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, highlight, color }) {
  const c = color || (highlight ? C.amber : C.text);
  return (
    <div style={{ background: highlight ? C.amberG : C.surface, border: `1px solid ${highlight ? C.amber + "44" : C.border}`, borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: highlight ? 26 : 20, fontWeight: 700, color: c }}>{value}</div>
      {sub && <div style={{ fontFamily: mono, fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Section({ label, children, color = C.amber }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontFamily: mono, fontSize: 11, color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        // {label}
      </div>
      {children}
    </div>
  );
}

function Model() {
  const [proSingle, setProSingle] = useState(1000);
  const [team5, setTeam5]         = useState(250);
  const [team10, setTeam10]       = useState(250);
  const [annualPct, setAnnualPct] = useState(30);
  const [dpCustomers, setDpCustomers] = useState(100);
  const [dpMultiYear, setDpMultiYear] = useState(20);

  // Cloudbreak
  const proRev  = proSingle * 79;
  const t5Rev   = team5 * 249;
  const t10Rev  = team10 * 449;
  const cbMrr   = proRev + t5Rev + t10Rev;
  const cbArr   = cbMrr * 12;
  const seats   = proSingle + (team5 * 5) + (team10 * 10);
  const totalOrgs = proSingle + team5 + team10;
  const annualFrac = annualPct / 100;
  const cbBlendedArr =
    (proSingle * annualFrac * 790) + (proSingle * (1-annualFrac) * 79 * 12) +
    (team5 * annualFrac * 2490) + (team5 * (1-annualFrac) * 249 * 12) +
    (team10 * annualFrac * 4490) + (team10 * (1-annualFrac) * 449 * 12);

  // Desert Point — $70k/yr, multi-year gets 10% discount
  const dpBasePrice    = 70000;
  const dpMultiYearPct = dpMultiYear / 100;
  const dpAvgPrice     = (dpBasePrice * (1 - dpMultiYearPct) * 1) + (dpBasePrice * 0.9 * dpMultiYearPct);
  const dpArr          = dpCustomers * dpAvgPrice;

  // Combined
  const combinedArr = cbBlendedArr + dpArr;
  const exit4       = combinedArr * 4;
  const exit10      = combinedArr * 10;

  return (
    <div>
      <Section label="Cloudbreak — self-serve funnel" color={C.green}>
        <Slider label="Pro single seat" sublabel="£79/mo" min={0} max={5000} step={50} value={proSingle} onChange={setProSingle} color={C.green} />
        <Slider label="Team 5-seat orgs" sublabel="£249/mo" min={0} max={1000} step={5} value={team5} onChange={setTeam5} color={C.green} />
        <Slider label="Team 10-seat orgs" sublabel="£449/mo" min={0} max={1000} step={5} value={team10} onChange={setTeam10} color={C.green} />
        <Slider label="Annual contract %" sublabel="% on annual (2 months free)" min={0} max={100} step={5} value={annualPct} onChange={setAnnualPct} color={C.green} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <MetricCard label="MRR" value={fmt(cbMrr)} sub="per month" color={C.green} />
          <MetricCard label="Run-rate ARR" value={fmt(cbArr)} sub="MRR × 12" />
          <MetricCard label="Blended ARR" value={fmt(cbBlendedArr)} sub={`${annualPct}% annual mix`} color={C.green} />
          <MetricCard label="Paying engineers" value={seats.toLocaleString()} sub={`${totalOrgs.toLocaleString()} orgs`} />
        </div>
      </Section>

      <Section label="Desert Point — enterprise decision infrastructure" color={C.amber}>
        <Slider label="Desert Point customers" sublabel="$70k/yr base" min={0} max={1000} step={5} value={dpCustomers} onChange={setDpCustomers} color={C.amber} />
        <Slider label="Multi-year contracts %" sublabel="% on 2-3yr deal (10% discount)" min={0} max={100} step={5} value={dpMultiYear} onChange={setDpMultiYear} color={C.amber} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <MetricCard label="Avg contract value" value={fmtUSD(Math.round(dpAvgPrice))} sub="per customer/yr" color={C.amber} />
          <MetricCard label="Desert Point ARR" value={fmtUSD(dpArr)} sub={`${dpCustomers} customers`} highlight />
          <MetricCard label="Market context" value="$70k" sub="NetBrain = $100k–$110k" color={C.dim} />
        </div>
      </Section>

      <Section label="Combined — total business" color={C.amberB}>
        <div style={{ background: C.surface, border: `1px solid ${C.amber}44`, borderRadius: 10, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 4, letterSpacing: "0.1em" }}>CLOUDBREAK ARR</div>
              <div style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: C.green }}>{fmt(cbBlendedArr)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: 24, color: C.muted }}>+</div>
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 4, letterSpacing: "0.1em" }}>DESERT POINT ARR</div>
              <div style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: C.amber }}>{fmtUSD(dpArr)}</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: C.muted, marginBottom: 4, letterSpacing: "0.1em" }}>COMBINED ARR</div>
            <div style={{ fontFamily: mono, fontSize: 44, fontWeight: 700, color: C.amberB }}>{fmtUSD(combinedArr)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          <MetricCard label="Exit at 4× ARR" value={fmtUSD(exit4)} sub="conservative" />
          <MetricCard label="Exit at 7× ARR" value={fmtUSD(combinedArr * 7)} sub="mid-range" color={C.amber} />
          <MetricCard label="Exit at 10× ARR" value={fmtUSD(exit10)} sub="optimistic" highlight />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            ["$10M ARR", `~${Math.round(10000000 / dpAvgPrice)} DP + ~1,000 CB orgs`, combinedArr >= 10000000],
            ["$25M ARR", `~${Math.round(25000000 / dpAvgPrice)} DP + ~2,500 CB orgs`, combinedArr >= 25000000],
            ["$50M ARR", `~${Math.round(50000000 / dpAvgPrice)} DP + ~5,000 CB orgs`, combinedArr >= 50000000],
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
            <button onClick={() => window.location.href = "/strategy"} style={{ background: "none", border: `1px solid ${C.border}`, color: C.dim, fontFamily: mono, fontSize: 11, padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>
              ← strategy
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 48px" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: C.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>// revenue model</div>
            <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 12 }}>
              Cloudbreak + Desert Point — <span style={{ color: C.amber }}>combined model</span>
            </h1>
            <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.7 }}>
              Adjust customer numbers to model ARR and exit scenarios across both products. Cloudbreak in GBP, Desert Point in USD.
            </p>
          </div>

          <Model />

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>netwrkr.ai · combined revenue model</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.muted }}>// internal use only</span>
          </div>
        </div>
      </div>
    </div>
  );
}