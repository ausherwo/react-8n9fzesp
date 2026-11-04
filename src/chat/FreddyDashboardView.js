// FreddyDashboardView.js
// Full-width detail page for the "Freddy the Ledger" agent tile on the ops dashboard
// (OpsDashboardHome). Master/detail: runs on the left, the selected run's facts on the
// right. Read-only — approvals/rejections only happen through JC's chat (api/chat.js
// review tools); this view just reflects that state and refetches when `version` bumps
// after a chat turn reports review decisions via the X-Review-Events header.

import { useEffect, useState, useCallback } from "react";
import { LIGHT as C, mono, sans, homeSerif } from "./ChatPrimitives";

const FACT_TYPE_LABEL = {
  bug: "Bug", upgrade_path: "Upgrade path", compatibility: "Compatibility",
  scale_limit: "Scale limit", lifecycle: "Lifecycle", design_guidance: "Design guidance",
};

function Badge({ children, color }) {
  return (
    <span style={{ fontFamily:mono, fontSize:10, color: color||C.dim, background:`${color||C.muted}15`, border:`1px solid ${color||C.muted}30`, padding:"2px 8px", borderRadius:999, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function RunRow({ run, active, onClick }) {
  const runLabel = run.run_started_at ? new Date(run.run_started_at).toLocaleDateString(undefined,{ month:"short", day:"numeric" }) : "unknown run";
  return (
    <div onClick={onClick} style={{ padding:"12px 14px", borderRadius:12, cursor:"pointer", background:active?C.amberG:"transparent", border:`1px solid ${active?`${C.amber}40`:"transparent"}`, marginBottom:6, transition:"background 0.15s" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontFamily:mono, fontSize:12, color:C.text, fontWeight:500 }}>{runLabel}</span>
        <span style={{ fontFamily:mono, fontSize:11, color:C.muted }}>{run.count} pending</span>
      </div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {Object.entries(run.by_platform||{}).map(([k,v])=>(<Badge key={k} color={C.blue}>{k} {v}</Badge>))}
        {run.flagged > 0 && <Badge color={C.orange}>{run.flagged} flagged</Badge>}
      </div>
    </div>
  );
}

function FactCard({ fact }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 1px 2px rgba(26,24,16,0.04), 0 8px 20px rgba(26,24,16,0.05)", padding:"12px 16px", marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
        <span style={{ fontFamily:mono, fontSize:10, color:C.amber, fontWeight:600 }}>#{fact.ref}</span>
        <span style={{ fontSize:13, color:C.text, lineHeight:1.4 }}>{fact.title}</span>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        <Badge color={C.blue}>{fact.platform}{fact.version?` v${fact.version}`:""}</Badge>
        <Badge>{FACT_TYPE_LABEL[fact.fact_type]||fact.fact_type}</Badge>
        {fact.confidence === "flagged" && <Badge color={C.orange}>flagged</Badge>}
        {fact.source_url && (
          <a href={fact.source_url} target="_blank" rel="noreferrer" style={{ fontFamily:mono, fontSize:10, color:C.muted, textDecoration:"underline" }}>source ↗</a>
        )}
      </div>
    </div>
  );
}

export default function FreddyDashboardView({ authHeaders, version, onBack, onOpenChat }) {
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [factsByRun, setFactsByRun]   = useState({});
  const [loadingFacts, setLoadingFacts] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ledger-review", { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load review queue");
      const data = await res.json();
      setSummary(data.summary || []);
      setSelectedRun(prev => prev || data.summary?.[0]?.run_id || null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => { loadSummary(); }, [loadSummary, version]);
  useEffect(() => { setFactsByRun({}); }, [version]);

  useEffect(() => {
    if (!selectedRun || factsByRun[selectedRun]) return;
    setLoadingFacts(selectedRun);
    fetch(`/api/ledger-review?runId=${encodeURIComponent(selectedRun)}&limit=200`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setFactsByRun(prev => ({ ...prev, [selectedRun]: data.facts || [] })))
      .catch(() => setFactsByRun(prev => ({ ...prev, [selectedRun]: [] })))
      .finally(() => setLoadingFacts(null));
  }, [selectedRun, factsByRun, authHeaders]);

  const totalPending = summary.reduce((sum, r) => sum + r.count, 0);
  const totalFlagged = summary.reduce((sum, r) => sum + (r.flagged||0), 0);
  const activeFacts = selectedRun ? factsByRun[selectedRun] : null;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"32px 24px" }}>
      <div style={{ maxWidth:1040, margin:"0 auto" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:C.muted, fontFamily:mono, fontSize:12, cursor:"pointer", padding:0, marginBottom:20 }}>← dashboard</button>

        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.amberG, border:`1px solid ${C.amber}30`, borderRadius:999, padding:"4px 12px", marginBottom:12 }}>
              <span style={{ color:C.amber, fontSize:13 }}>◈</span>
              <span style={{ fontFamily:mono, fontSize:10, color:C.amber, letterSpacing:"0.08em" }}>AGENT · ACTIVE</span>
            </div>
            <h1 style={{ fontSize:28, fontWeight:400, color:C.text, margin:0, fontFamily:homeSerif }}>Freddy the Ledger</h1>
            <p style={{ fontSize:13, color:C.dim, margin:"6px 0 0", fontFamily:sans }}>Research agent · Cisco NX-OS and ACI release notes and validated designs</p>
          </div>
          <button onClick={onOpenChat} style={{ background:C.amber, border:"none", borderRadius:999, color:"#FFF", fontFamily:sans, fontSize:13, fontWeight:500, padding:"10px 18px", cursor:"pointer" }}>
            Review in chat →
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:12, marginBottom:28 }}>
          {[["Pending review", totalPending, C.text], ["Flagged", totalFlagged, C.orange], ["Runs", summary.length, C.text]].map(([label,val,color])=>(
            <div key={label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, boxShadow:"0 1px 2px rgba(26,24,16,0.04), 0 8px 20px rgba(26,24,16,0.05)", padding:"14px 16px" }}>
              <div style={{ fontFamily:sans, fontSize:12, color:C.muted, marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:500, color }}>{loading?"—":val}</div>
            </div>
          ))}
        </div>

        {error && <div style={{ color:C.red, fontFamily:mono, fontSize:12, marginBottom:16 }}>{error}</div>}

        {!loading && !error && summary.length === 0 ? (
          <div style={{ fontFamily:mono, fontSize:12, color:C.muted }}>// nothing pending — all caught up</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20, alignItems:"start" }}>
            <div>
              <div style={{ fontFamily:mono, fontSize:10, color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Runs</div>
              {summary.map(run => (
                <RunRow key={run.run_id||"unknown"} run={run} active={selectedRun===run.run_id} onClick={()=>setSelectedRun(run.run_id)}/>
              ))}
            </div>
            <div>
              <div style={{ fontFamily:mono, fontSize:10, color:C.muted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Pending facts</div>
              {loadingFacts === selectedRun ? (
                <div style={{ fontFamily:mono, fontSize:12, color:C.muted }}>Loading…</div>
              ) : !activeFacts || activeFacts.length === 0 ? (
                <div style={{ fontFamily:mono, fontSize:12, color:C.muted }}>Nothing pending in this run.</div>
              ) : (
                activeFacts.map(f => <FactCard key={f.id} fact={f}/>)
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop:28, fontFamily:mono, fontSize:11, color:C.muted, lineHeight:1.6 }}>
          Approve or reject in chat — e.g. "approve #3" or "reject #7 — workaround doesn't match". This view updates automatically.
        </div>
      </div>
    </div>
  );
}
