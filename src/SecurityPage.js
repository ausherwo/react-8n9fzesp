// SecurityPage.js
// v1.0 — Cloudbreak security & data-handling page. Route: /security
// NOTE: the "// how your data is processed" section contains ONE placeholder that
// must be replaced with the real AI-provider retention statement before launch.
// It is styled as a dashed "CONFIRM BEFORE LAUNCH" block so it cannot ship silently.

import { useState, useEffect } from "react";

const C = {
  bg:      "#F7F5F0",
  surface: "#FFFFFF",
  hi:      "#F0EDE6",
  border:  "#DDD9CF",
  amber:   "#B8860B",
  amberB:  "#D4A000",
  amberG:  "#D4A00012",
  green:   "#1A7A3C",
  red:     "#C0392B",
  orange:  "#C0620B",
  text:    "#1A1810",
  dim:     "#4A4438",
  muted:   "#7A7060",
  shadow:  "rgba(0,0,0,0.06)",
};
const mono = "'IBM Plex Mono', monospace";
const sans = "'IBM Plex Sans', system-ui, sans-serif";

// ————————————————————————————————————————————————————————————————
// Graphic 1 — Trust boundary: only the device list crosses out of your network
// ————————————————————————————————————————————————————————————————
function TrustBoundaryGraphic() {
  const chips = ["hostnames", "IP addresses", "configs", "credentials", "serial numbers", "topology"];
  return (
    <svg viewBox="0 0 720 300" width="100%" style={{display:"block"}} role="img"
         aria-label="Only a device list — platform, version, role — leaves your network. Everything that identifies your fabric stays inside.">
      <defs>
        <marker id="arrowSec" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.amber}/>
        </marker>
      </defs>

      {/* YOUR NETWORK boundary */}
      <rect x="14" y="34" width="366" height="240" rx="12" fill={C.surface}
            stroke={C.border} strokeWidth="1.5" strokeDasharray="6 5"/>
      <text x="34" y="60" fontFamily={mono} fontSize="12" fontWeight="600" fill={C.dim} letterSpacing="1">
        YOUR NETWORK
      </text>
      <text x="34" y="78" fontFamily={mono} fontSize="10.5" fill={C.muted}>stays inside — we never see it</text>

      {/* identifying chips inside the boundary */}
      {chips.map((c, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 36 + col * 168, y = 100 + row * 44;
        return (
          <g key={c}>
            <rect x={x} y={y} width="156" height="30" rx="6" fill={C.hi} stroke={C.border} strokeWidth="1"/>
            <text x={x + 12} y={y + 20} fontFamily={mono} fontSize="12" fill={C.dim}>{c}</text>
          </g>
        );
      })}

      {/* the ONLY thing that crosses */}
      <line x1="380" y1="154" x2="470" y2="154" stroke={C.amber} strokeWidth="1.6"
            markerEnd="url(#arrowSec)"/>
      <rect x="392" y="118" width="150" height="34" rx="8" fill={C.amberG} stroke={C.amber} strokeWidth="1.3"
            transform="translate(-25,0)"/>
      <text x="442" y="132" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.amber} textAnchor="middle">device list</text>
      <text x="442" y="146" fontFamily={mono} fontSize="9.5" fill={C.dim} textAnchor="middle">platform · version · role</text>

      {/* netwrkr box */}
      <rect x="556" y="104" width="150" height="100" rx="12" fill={C.surface} stroke={C.amber} strokeWidth="1.5"/>
      <g transform="translate(596,140)">
        <rect x="-2" y="-14" width="27" height="27" rx="6" fill={C.amberG} stroke={C.amber} strokeWidth="1"/>
        <polyline points="3,7 8,2 13,5 18,-2 22,1" fill="none" stroke={C.amber} strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <text x="631" y="182" fontFamily={mono} fontSize="12.5" fontWeight="700" fill={C.text} textAnchor="middle">
        netwrkr<tspan fill={C.amber}>.ai</tspan>
      </text>
    </svg>
  );
}

// ————————————————————————————————————————————————————————————————
// Graphic 2 — Lifecycle: paste → review → analyse → results → nothing kept
// ————————————————————————————————————————————————————————————————
function LifecycleGraphic() {
  const steps = [
    ["paste",   "your device list"],
    ["review",  "you confirm it"],
    ["analyse", "PSIRT + AI model"],
    ["results", "briefing + advice"],
  ];
  return (
    <svg viewBox="0 0 720 150" width="100%" style={{display:"block"}} role="img"
         aria-label="Paste, review, analyse, results — then nothing is stored. Closing the tab leaves nothing behind.">
      <defs>
        <marker id="arrowLc" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill={C.border}/>
        </marker>
      </defs>
      {steps.map(([t, s], i) => {
        const x = 12 + i * 150;
        return (
          <g key={t}>
            <rect x={x} y="26" width="128" height="58" rx="10" fill={C.surface} stroke={C.border} strokeWidth="1.3"/>
            <text x={x + 16} y="50" fontFamily={mono} fontSize="13" fontWeight="700" fill={C.text}>{t}</text>
            <text x={x + 16} y="68" fontFamily={mono} fontSize="10" fill={C.muted}>{s}</text>
            {i < steps.length - 1 &&
              <line x1={x + 128} y1="55" x2={x + 150} y2="55" stroke={C.border} strokeWidth="1.4" markerEnd="url(#arrowLc)"/>}
          </g>
        );
      })}
      {/* terminal state */}
      <line x1="612" y1="55" x2="636" y2="55" stroke={C.border} strokeWidth="1.4" markerEnd="url(#arrowLc)"/>
      <rect x="636" y="26" width="74" height="58" rx="10" fill={C.hi} stroke={C.green} strokeWidth="1.3"/>
      <text x="673" y="50" fontFamily={mono} fontSize="12" fontWeight="700" fill={C.green} textAnchor="middle">gone</text>
      <text x="673" y="66" fontFamily={mono} fontSize="8.5" fill={C.dim} textAnchor="middle">on close</text>
      <text x="12" y="118" fontFamily={mono} fontSize="11" fill={C.muted}>
        // no account · no database · no copy retained
      </text>
    </svg>
  );
}

// ————————————————————————————————————————————————————————————————
function SecNav() {
  return (
    <nav style={{borderBottom:`1px solid ${C.border}`,padding:"0 24px",background:`${C.bg}F0`,backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:820,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={()=>window.location.href="/"}>
          <div style={{width:27,height:27,background:C.amberG,border:`1px solid ${C.amber}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polyline points="1,10 4,6 7,8.5 10,3.5 13,5.5" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{fontFamily:mono,fontWeight:700,fontSize:15,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
        </div>
        <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:12,padding:"7px 14px",cursor:"pointer"}}>
          try_free →
        </button>
      </div>
    </nav>
  );
}

function Section({ label, title, children }) {
  return (
    <section style={{marginBottom:44}}>
      <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>// {label}</div>
      {title && <h2 style={{fontSize:21,fontWeight:400,color:C.text,marginBottom:14,letterSpacing:"-0.02em"}}>{title}</h2>}
      {children}
    </section>
  );
}

const P = ({children, style}) => (
  <p style={{fontFamily:sans,fontSize:15.5,lineHeight:1.8,color:C.dim,marginBottom:14,...style}}>{children}</p>
);

const Card = ({children}) => (
  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"22px 24px",marginBottom:14}}>{children}</div>
);

export function SecurityPage() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 680);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 680);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const neverAsk = ["hostnames","IP addresses","credentials","configs","serial numbers","topology"];

  return (
    <div style={{background:C.bg,color:C.text,fontFamily:sans,minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:#D4A00040;color:#8B6400;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${C.bg};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(11px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      <SecNav/>

      <div style={{maxWidth:820,margin:"0 auto",padding:isMobile?"36px 20px 24px":"64px 24px 40px",animation:"fadeUp .4s ease"}}>

        {/* Hero */}
        <div style={{fontFamily:mono,fontSize:11,color:C.amber,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>// security &amp; your data</div>
        <h1 style={{fontSize:isMobile?26:32,fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.25,color:C.text,marginBottom:18,maxWidth:640}}>
          Built to run on production fabric data — without the data leaving your control.
        </h1>
        <P style={{fontSize:16.5,color:C.dim,maxWidth:640,marginBottom:40}}>
          Pasting real fabric details into an unknown tool is a fair thing to be cautious about. So here is exactly
          what Cloudbreak needs, what it doesn&rsquo;t, and what happens to what you paste.
        </P>

        {/* Trust boundary graphic */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:isMobile?"16px 8px":"24px 20px",marginBottom:44,boxShadow:`0 2px 10px ${C.shadow}`}}>
          <TrustBoundaryGraphic/>
        </div>

        <Section label="nothing is stored" title="Nothing about your fabric is kept">
          <P>
            Cloudbreak is anonymous. You paste a device list, you get the analysis, and when you close the tab it is
            gone. No account required, no history saved, no copy retained on our side.
          </P>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:isMobile?"16px 12px":"22px 20px"}}>
            <LifecycleGraphic/>
          </div>
        </Section>

        <Section label="what leaves your network" title="Only the device list you paste">
          <P>
            What crosses out of your network is the device list &mdash; platform, software version, role &mdash; plus
            any context you choose to type. Nothing else. netwrkr has <strong style={{color:C.text,fontWeight:600}}>no
            access to your network</strong>: no login, no SNMP, no API, no collector appliance, no agent. It cannot
            reach anything you don&rsquo;t paste.
          </P>
        </Section>

        <Section label="what we never ask for" title="If it identifies your network, we don't want it">
          <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:16}}>
            {neverAsk.map(x => (
              <span key={x} style={{fontFamily:mono,fontSize:12.5,color:C.muted,background:C.hi,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 11px",textDecoration:"line-through",textDecorationColor:`${C.red}99`}}>
                {x}
              </span>
            ))}
          </div>
          <P>
            None of it is needed to assess a fabric, so Cloudbreak doesn&rsquo;t ask for it. Your analysis is built
            from versions and roles &mdash; not from anything that names or locates your kit.
          </P>
        </Section>

        <Section label="how your data is processed" title="Where the device list goes">
          <P>
            Your device list is checked against Cisco&rsquo;s <strong style={{color:C.text,fontWeight:600}}>public
            PSIRT advisory database</strong> &mdash; the same security advisories Cisco publishes openly &mdash; and
            sent to our AI model to generate the analysis.
          </P>

          {/* ⚠ PLACEHOLDER — replace with the real AI-provider retention statement before launch */}
          <div style={{background:"#FFFBEF",border:`1.5px dashed ${C.amberB}`,borderRadius:10,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontFamily:mono,fontSize:10.5,fontWeight:700,color:C.orange,letterSpacing:"0.1em",marginBottom:8}}>⚠ CONFIRM BEFORE LAUNCH — DO NOT SHIP AS-IS</div>
            <P style={{marginBottom:0,color:C.dim}}>
              [ State precisely what the AI provider retains and for how long &mdash; e.g. &ldquo;The AI model is
              operated by &lt;provider&gt; under &lt;terms&gt;; the device list is used only to generate your analysis
              and is not retained beyond &lt;window&gt; / is not used to train models.&rdquo; This is the single line a
              DC engineer will scrutinise hardest. It must be true and verifiable before this page goes live. ]
            </P>
          </div>
        </Section>

        <Section label="independence" title="Nothing goes to Cisco — or any vendor">
          <P>
            netwrkr is independent. There is no Cisco contract, no entitlement, and no data-sharing arrangement with
            any vendor. Your fabric&rsquo;s details are not reported to Cisco or anyone else &mdash; the whole point of
            the tool is a read that isn&rsquo;t coming from the vendor selling you the kit.
          </P>
        </Section>

        <Section label="why you can trust the advice" title="How the advice is kept sound">
          <Card>
            <div style={{fontFamily:mono,fontSize:13.5,fontWeight:700,color:C.text,marginBottom:6}}>The dangerous parts aren&rsquo;t left to the AI</div>
            <P style={{marginBottom:0}}>The rules that could cause an outage &mdash; upgrade order, vPC-pair handling, version mapping &mdash; are enforced in code. The model can&rsquo;t override them or invent a sequence that breaks your fabric.</P>
          </Card>
          <Card>
            <div style={{fontFamily:mono,fontSize:13.5,fontWeight:700,color:C.text,marginBottom:6}}>Verified and unverified are kept separate</div>
            <P style={{marginBottom:0}}>Advisories with real Cisco CSC IDs are stated as fact. Anything drawn from model knowledge is labelled worth&#8209;checking. Nothing is presented as more certain than the evidence supports.</P>
          </Card>
          <Card>
            <div style={{fontFamily:mono,fontSize:13.5,fontWeight:700,color:C.text,marginBottom:6}}>It runs on what you confirmed</div>
            <P style={{marginBottom:0}}>You review the extracted device list before any analysis runs &mdash; so the advice is built on data you checked, never a guessed inventory.</P>
          </Card>
          <Card>
            <div style={{fontFamily:mono,fontSize:13.5,fontWeight:700,color:C.text,marginBottom:6}}>What it is, honestly</div>
            <P style={{marginBottom:0}}>Cloudbreak is senior-engineer decision support &mdash; a fast, grounded second opinion. It is not a replacement for your change-control process. Verify against your own environment before you action anything.</P>
          </Card>
        </Section>

        {/* CTA */}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:32,marginTop:8}}>
          <button onClick={()=>window.location.href="/analyse"} style={{background:C.amber,color:"#FFF",border:"none",borderRadius:6,fontFamily:mono,fontWeight:700,fontSize:14,padding:isMobile?"14px 20px":"13px 28px",cursor:"pointer",boxShadow:`0 2px 8px ${C.amber}40`,width:isMobile?"100%":"auto"}}>
            analyse_my_fabric() // free
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${C.border}`,padding:"22px 24px",background:C.surface}}>
        <div style={{maxWidth:820,margin:"0 auto",display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:"center",gap:isMobile?12:0}}>
          <span style={{fontFamily:mono,fontSize:13,fontWeight:700,color:C.text}}>netwrkr<span style={{color:C.amber}}>.ai</span></span>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
            {["privacy","terms","security","contact"].map(l=>(
              <button key={l} onClick={()=>window.location.href=`/${l}`} style={{background:"none",border:"none",color:l==="security"?C.amber:C.muted,fontFamily:mono,fontSize:11,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          {!isMobile&&<span style={{fontFamily:mono,fontSize:11,color:C.muted}}>// cloudbreak</span>}
        </div>
      </footer>
    </div>
  );
}

export default SecurityPage;
