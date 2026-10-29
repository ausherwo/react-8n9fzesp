// JCExplainerPage.js
// Stub explainer page at /jc, linked from the JC homepage footer.
// Content is explicitly an open question in website-redesign-brief.md — this is a placeholder
// draft so the route and footer link work end-to-end; real content comes later.

import { LIGHT as C, mono, sans } from "./chat/ChatPrimitives";

export function JCExplainerPage() {
  return (
    <div style={{ background:C.bg, color:C.text, minHeight:"100vh", fontFamily:sans }}>
      <nav style={{ borderBottom:`1px solid ${C.border}`, padding:"0 24px" }}>
        <div style={{ maxWidth:680, margin:"0 auto", display:"flex", alignItems:"center", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer" }} onClick={()=>window.location.href="/"}>
            <div style={{ width:27, height:27, background:C.amberG, border:`1px solid ${C.amber}44`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily:mono, fontWeight:700, fontSize:15, color:C.text }}>netwrkr<span style={{ color:C.amber }}>.ai</span></span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"64px 24px" }}>
        <div style={{ fontFamily:mono, fontSize:11, color:C.amber, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>// draft — content to be defined</div>
        <h1 style={{ fontSize:32, fontWeight:300, letterSpacing:"-0.02em", marginBottom:20 }}>What is JC?</h1>
        <p style={{ fontSize:15, color:C.dim, lineHeight:1.8, marginBottom:16 }}>
          JC is netwrkr.ai's data centre copilot — a conversation-first way to understand and act on your Cisco ACI and NX-OS fabric. Ask JC a question, paste a device inventory, and get a risk-ranked analysis right in the chat, backed by live Cisco PSIRT data.
        </p>
        <p style={{ fontSize:15, color:C.dim, lineHeight:1.8, marginBottom:16 }}>
          More detail on how JC works, what it can see, and what's coming next (including Desert Point monitoring and additional tooling) will go here.
        </p>
        <button onClick={()=>window.location.href="/"} style={{ background:C.amber, border:"none", color:C.onAmber, borderRadius:6, fontFamily:mono, fontWeight:700, fontSize:13, padding:"11px 22px", cursor:"pointer", marginTop:12 }}>
          ← back to JC
        </button>
      </div>
    </div>
  );
}
