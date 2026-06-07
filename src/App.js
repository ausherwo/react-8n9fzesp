function Home({ authed }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 680);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 680);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:${C.amber}30;color:${C.amber};}

        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}

        .hero-wrap{
          max-width:1180px;
          margin:0 auto;
          padding:${isMobile ? "48px 22px 48px" : "86px 40px 76px"};
          display:grid;
          grid-template-columns:${isMobile ? "1fr" : "1fr 480px"};
          gap:${isMobile ? "44px" : "72px"};
          align-items:start;
        }

        .terminal-label{
          font-family:${mono};
          color:${C.amber};
          font-size:13px;
          margin-bottom:22px;
          letter-spacing:-0.02em;
        }

        .hero-title{
          font-family:${sans};
          font-weight:600;
          font-size:${isMobile ? "42px" : "68px"};
          line-height:0.98;
          letter-spacing:-0.055em;
          color:${C.text};
          max-width:720px;
          margin-bottom:28px;
        }

        .hero-body{
          font-family:${sans};
          font-size:${isMobile ? "18px" : "19px"};
          font-weight:400;
          color:${C.dim};
          line-height:1.65;
          max-width:610px;
          margin-bottom:28px;
        }

        .terminal-note{
          font-family:${mono};
          font-size:12px;
          color:${C.muted};
          display:flex;
          gap:18px;
          flex-wrap:wrap;
          margin-top:22px;
        }

        .terminal-card{
          border:1px solid ${C.border};
          background:linear-gradient(180deg, ${C.surface}, #090A0B);
          border-radius:7px;
          box-shadow:0 24px 70px ${C.shadow};
          overflow:hidden;
          font-family:${mono};
        }

        .terminal-top{
          height:38px;
          border-bottom:1px solid ${C.border};
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 14px;
          color:${C.muted};
          font-size:12px;
        }

        .terminal-body{
          padding:22px;
          font-size:13px;
          line-height:1.75;
          color:${C.text};
        }

        .hero-ul{
          list-style:none;
          padding:0;
          margin:0 0 34px 0;
          max-width:620px;
        }

        .hero-ul li{
          font-family:${sans};
          font-size:17px;
          color:${C.dim};
          line-height:1.7;
          margin-bottom:12px;
          padding-left:24px;
          position:relative;
        }

        .hero-ul li::before{
          content:"›";
          position:absolute;
          left:0;
          color:${C.amber};
          font-family:${mono};
        }

        footer button{
          background:none;
          border:none;
          color:${C.muted};
          font-family:${mono};
          font-size:12px;
          cursor:pointer;
        }
      `}</style>

      <HomeNav authed={authed} />

      <main className="hero-wrap">
        <section>
          <div className="terminal-label">$ analyse_my_fabric</div>

          <h1 className="hero-title">
            Analyse your network.<br />
            Know what to fix.
          </h1>

          <p className="hero-body">
            netwrkr.ai analyses your data centre network topology, matches it against Cisco PSIRT advisories, and returns prioritised actions based on your specific fabric.
          </p>

          <ul className="hero-ul">
            <li>Live Cisco PSIRT API integration matched to your platform versions</li>
            <li>Risk scoring weighted by role: spines, border leafs, leafs and controllers</li>
            <li>Pre-flight privacy checks before any analysis runs</li>
          </ul>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.href = "/analyse"}
              style={{
                background: C.amber,
                color: "#000",
                border: "none",
                borderRadius: 4,
                fontFamily: mono,
                fontWeight: 500,
                fontSize: 14,
                padding: "14px 24px",
                cursor: "pointer",
                boxShadow: `0 0 24px ${C.amber}30`
              }}
            >
              &gt; analyse_my_fabric() <span style={{ opacity: 0.55 }}>// free</span>
            </button>

            <button
              onClick={() => window.location.href = "/signup"}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                color: C.dim,
                borderRadius: 4,
                fontFamily: mono,
                fontWeight: 400,
                fontSize: 14,
                padding: "14px 22px",
                cursor: "pointer"
              }}
            >
              &gt; get_started()
            </button>
          </div>

          <div className="terminal-note">
            <span># ~60 seconds</span>
            <span># no signup required</span>
            <span># inventory not stored</span>
          </div>
        </section>

        {!isMobile && (
          <aside className="terminal-card">
            <div className="terminal-top">
              <span>netwrkr.ai shell</span>
              <span>⌘ clear</span>
            </div>

            <div className="terminal-body">
              <div style={{ color: C.green }}>$ analyse_my_fabric --fabric production</div>
              <br />
              <div>Uploading inventory...</div>
              <div style={{ color: C.green }}>✓ 142 devices discovered</div>
              <br />
              <div>Matching PSIRT advisories...</div>
              <div style={{ color: C.green }}>✓ 17 vulnerabilities found</div>
              <br />
              <div>Prioritising actions...</div>
              <div style={{ color: C.green }}>✓ Analysis complete 42.7s</div>
              <br />
              <div style={{ color: C.red }}>ACT_NOW&nbsp;&nbsp;&nbsp;&nbsp;3</div>
              <div style={{ color: C.amber }}>SCHEDULE&nbsp;&nbsp;&nbsp;6</div>
              <div style={{ color: C.green }}>MONITOR&nbsp;&nbsp;&nbsp;&nbsp;8</div>
              <br />
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, color: C.green }}>
                $ _
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}