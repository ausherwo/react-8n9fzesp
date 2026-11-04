// ReviewPanel.js
// Right-hand companion panel for RinconChatPrototype (/app): a live, read-only view of
// Freddy the Ledger's pending review queue, grouped by run / platform / fact_type.
// Approvals and rejections only happen through JC's chat (api/chat.js review tools) —
// this panel just reflects that state, and refetches when the parent bumps `version`
// after a chat turn reports review decisions via the X-Review-Events header.

import { useEffect, useState, useCallback } from "react";
import { LIGHT as C, mono, sans } from "./ChatPrimitives";

const FACT_TYPE_LABEL = {
  bug: "Bug", upgrade_path: "Upgrade path", compatibility: "Compatibility",
  scale_limit: "Scale limit", lifecycle: "Lifecycle", design_guidance: "Design guidance",
};

function Badge({ children, color }) {
  return (
    <span style={{ fontFamily:mono, fontSize:9, color: color||C.dim, background:`${color||C.muted}15`, border:`1px solid ${color||C.muted}30`, padding:"1px 6px", borderRadius:3, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function RunCard({ run, expanded, onToggle, facts, loadingFacts }) {
  const runLabel = run.run_started_at ? new Date(run.run_started_at).toLocaleDateString(undefined,{ month:"short", day:"numeric" }) : "unknown run";
  return (
    <div style={{ border:`1px solid ${C.border}`, background:C.surface, marginBottom:10 }}>
      <div onClick={onToggle} style={{ padding:"10px 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:mono, fontSize:11, color:C.text, marginBottom:3 }}>{runLabel} · {run.count} pending</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {Object.entries(run.by_platform||{}).map(([k,v])=>(
              <Badge key={k} color={C.blue}>{k} × {v}</Badge>
            ))}
            {Object.entries(run.by_fact_type||{}).map(([k,v])=>(
              <Badge key={k}>{FACT_TYPE_LABEL[k]||k} × {v}</Badge>
            ))}
            {run.flagged > 0 && <Badge color={C.orange}>{run.flagged} flagged</Badge>}
          </div>
        </div>
        <span style={{ color:C.muted, fontFamily:mono, fontSize:11 }}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"8px 12px", maxHeight:280, overflowY:"auto" }}>
          {loadingFacts ? (
            <div style={{ fontFamily:mono, fontSize:10, color:C.muted, padding:"6px 0" }}>Loading…</div>
          ) : !facts || facts.length === 0 ? (
            <div style={{ fontFamily:mono, fontSize:10, color:C.muted, padding:"6px 0" }}>Nothing pending here.</div>
          ) : (
            facts.map(f => (
              <div key={f.id} style={{ padding:"7px 0", borderBottom:`1px solid ${C.faint}` }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:3 }}>
                  <span style={{ fontFamily:mono, fontSize:9, color:C.amber }}>#{f.ref}</span>
                  <span style={{ fontSize:12, color:C.text, lineHeight:1.4 }}>{f.title}</span>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingLeft:16 }}>
                  <Badge color={C.blue}>{f.platform}{f.version?` v${f.version}`:""}</Badge>
                  <Badge>{FACT_TYPE_LABEL[f.fact_type]||f.fact_type}</Badge>
                  {f.confidence === "flagged" && <Badge color={C.orange}>flagged</Badge>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewPanel({ authHeaders, version, onClose }) {
  const [summary, setSummary]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [expandedRun, setExpandedRun] = useState(null);
  const [factsByRun, setFactsByRun]   = useState({});
  const [loadingFacts, setLoadingFacts] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ledger-review", { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load review queue");
      const data = await res.json();
      setSummary(data.summary || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => { loadSummary(); }, [loadSummary, version]);
  // A run's fact list can go stale after a chat approval/rejection — drop cached
  // facts for the expanded run so re-expanding (or the effect below) refetches it.
  useEffect(() => { setFactsByRun({}); }, [version]);

  const toggleRun = async (runId) => {
    if (expandedRun === runId) { setExpandedRun(null); return; }
    setExpandedRun(runId);
    if (!factsByRun[runId]) {
      setLoadingFacts(runId);
      try {
        const res = await fetch(`/api/ledger-review?runId=${encodeURIComponent(runId)}&limit=200`, { headers: authHeaders() });
        const data = await res.json();
        setFactsByRun(prev => ({ ...prev, [runId]: data.facts || [] }));
      } catch { setFactsByRun(prev => ({ ...prev, [runId]: [] })); }
      setLoadingFacts(null);
    }
  };

  const totalPending = summary.reduce((sum, r) => sum + r.count, 0);

  return (
    <div style={{ width:300, flexShrink:0, background:C.surface, borderLeft:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:mono, fontSize:9, color:C.muted, letterSpacing:"0.15em", textTransform:"uppercase" }}>// review queue</div>
          <div style={{ fontFamily:sans, fontSize:13, color:C.text, marginTop:2 }}>Freddy the Ledger</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={loadSummary} title="Refresh" style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, fontFamily:mono, fontSize:11, padding:"3px 7px", cursor:"pointer" }}>⟳</button>
          {onClose && <button onClick={onClose} title="Hide panel" style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, fontFamily:mono, fontSize:11, padding:"3px 7px", cursor:"pointer" }}>✕</button>}
        </div>
      </div>

      <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.border}`, fontFamily:mono, fontSize:10, color:C.dim }}>
        {loading ? "Loading…" : `${totalPending} fact${totalPending===1?"":"s"} pending across ${summary.length} run${summary.length===1?"":"s"}`}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {error && <div style={{ color:C.red, fontFamily:mono, fontSize:11, marginBottom:10 }}>{error}</div>}
        {!loading && !error && summary.length === 0 && (
          <div style={{ fontFamily:mono, fontSize:11, color:C.muted }}>// nothing pending — all caught up</div>
        )}
        {summary.map(run => (
          <RunCard
            key={run.run_id || "unknown"}
            run={run}
            expanded={expandedRun === run.run_id}
            onToggle={() => toggleRun(run.run_id)}
            facts={factsByRun[run.run_id]}
            loadingFacts={loadingFacts === run.run_id}
          />
        ))}
      </div>

      <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}`, fontFamily:mono, fontSize:9, color:C.muted, lineHeight:1.5 }}>
        Approve or reject in chat — e.g. "approve #3" or "reject #7 — workaround doesn't match". This panel updates automatically.
      </div>
    </div>
  );
}
