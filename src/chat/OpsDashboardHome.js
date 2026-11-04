// OpsDashboardHome.js
// Landing view of the netwrkr ops dashboard (reviewers only — see RinconChatPrototype's
// isReviewer branch). Summary metrics + an "Agents" tile grid, Freddy the Ledger first.
// Styled to match the JC homepage: cream background, serif heading, soft-shadowed cards.

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { LIGHT as C, mono, sans, homeSerif } from "./ChatPrimitives";

function MetricCard({ label, value, color }) {
  return (
    <div style={{ background:C.hi, borderRadius:14, padding:"16px 18px" }}>
      <div style={{ fontFamily:sans, fontSize:12, color:C.muted, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:500, color:color||C.text }}>{value}</div>
    </div>
  );
}

export default function OpsDashboardHome({ member, org, authHeaders, onOpenFreddy, onOpenChat }) {
  const [teamCount, setTeamCount]   = useState(null);
  const [summary, setSummary]       = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [teamRes, ledgerRes] = await Promise.all([
        org?.id ? supabase.from('members').select('id', { count:'exact', head:true }).eq('org_id', org.id) : Promise.resolve({ count:null }),
        fetch("/api/ledger-review", { headers: authHeaders() }).then(r=>r.ok?r.json():{ summary:[] }).catch(()=>({ summary:[] })),
      ]);
      if (cancelled) return;
      setTeamCount(teamRes.count ?? null);
      setSummary(ledgerRes.summary || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [org?.id, authHeaders]);

  const totalPending = summary.reduce((sum, r) => sum + r.count, 0);
  const totalFlagged = summary.reduce((sum, r) => sum + (r.flagged||0), 0);
  const firstName = member?.name ? member.name.trim().split(' ')[0] : null;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"40px 24px" }}>
      <div style={{ maxWidth:1040, margin:"0 auto" }}>
        <h1 style={{ fontSize:30, fontWeight:400, color:C.text, margin:"0 0 6px", fontFamily:homeSerif }}>
          {firstName ? `Hey ${firstName}.` : "Dashboard"}
        </h1>
        <p style={{ fontSize:14, color:C.dim, margin:"0 0 28px" }}>Here's what's running and what needs your attention.</p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:12, marginBottom:36 }}>
          <MetricCard label="Team members" value={loading ? "—" : (teamCount ?? "—")} />
          <MetricCard label="Agents running" value="1" />
          <MetricCard label="Facts pending" value={loading ? "—" : totalPending} color={C.amber} />
          <MetricCard label="Flagged" value={loading ? "—" : totalFlagged} color={totalFlagged>0?C.orange:C.text} />
        </div>

        <div style={{ fontFamily:mono, fontSize:10, color:C.muted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:12 }}>Agents</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:14, marginBottom:36 }}>
          <div onClick={onOpenFreddy} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, boxShadow:"0 1px 2px rgba(26,24,16,0.04), 0 16px 40px rgba(26,24,16,0.06)", padding:"18px 20px", cursor:"pointer", transition:"transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:C.amber, fontSize:18 }}>◈</span>
                <span style={{ fontSize:15, fontWeight:500, color:C.text }}>Freddy the Ledger</span>
              </div>
              <span style={{ fontFamily:mono, fontSize:9, color:C.green, background:`${C.green}15`, border:`1px solid ${C.green}30`, borderRadius:999, padding:"2px 8px" }}>active</span>
            </div>
            <p style={{ fontSize:12, color:C.muted, lineHeight:1.5, margin:"0 0 14px" }}>Research agent · Cisco NX-OS and ACI release notes and validated designs</p>
            <div style={{ display:"flex", gap:20 }}>
              <div><div style={{ fontFamily:mono, fontSize:10, color:C.muted }}>Pending</div><div style={{ fontSize:15, fontWeight:500, color:C.text }}>{loading?"—":totalPending}</div></div>
              <div><div style={{ fontFamily:mono, fontSize:10, color:C.muted }}>Flagged</div><div style={{ fontSize:15, fontWeight:500, color:C.text }}>{loading?"—":totalFlagged}</div></div>
              <div><div style={{ fontFamily:mono, fontSize:10, color:C.muted }}>Runs</div><div style={{ fontSize:15, fontWeight:500, color:C.text }}>{loading?"—":summary.length}</div></div>
            </div>
          </div>
          <div style={{ border:`1px dashed ${C.border}`, borderRadius:16, padding:"18px 20px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, color:C.muted, minHeight:130 }}>
            <span style={{ fontSize:18 }}>+</span>
            <span style={{ fontSize:12 }}>Next agent goes here</span>
          </div>
        </div>

        <button onClick={onOpenChat} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:999, boxShadow:"0 1px 2px rgba(26,24,16,0.04), 0 8px 20px rgba(26,24,16,0.05)", color:C.dim, fontFamily:sans, fontSize:13, fontWeight:500, padding:"10px 18px", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8 }}>
          <span style={{ color:C.amber }}>◈</span> Ask JC
        </button>
      </div>
    </div>
  );
}
