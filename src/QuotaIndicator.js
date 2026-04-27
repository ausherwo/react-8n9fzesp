// QuotaIndicator.js — v1.0
// Shows analyses used / limit with plan badge and upgrade CTA
// Drop into your NavBar or AppPage header
//
// Usage:
//   import QuotaIndicator from './QuotaIndicator';
//   <QuotaIndicator used={3} limit={10} plan="free" />
//
// Or wire to _meta from the analysis response:
//   <QuotaIndicator {...analysisResult._meta} />

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './Auth';

// ─────────────────────────────────────────────
// HOOK — fetches live quota from /api/licence
// Call this once at AppPage level, pass result down
// ─────────────────────────────────────────────
export function useLicence() {
  const { session } = useAuth();
  const [licence, setLicence] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLicence = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/licence', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLicence(data);
      }
    } catch (err) {
      console.error('Failed to fetch licence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLicence(); }, [session]);

  // Call this after a successful analysis to refresh the count
  const refresh = () => fetchLicence();

  return { licence, loading, refresh };
}

// ─────────────────────────────────────────────
// QUOTA INDICATOR COMPONENT
// ─────────────────────────────────────────────
export default function QuotaIndicator({ used, limit, plan, remaining, compact = false }) {
  const [hovered, setHovered] = useState(false);

  if (used === undefined || limit === undefined) return null;

  const pct        = Math.min((used / limit) * 100, 100);
  const isNearLimit = remaining <= 2 && plan === 'free';
  const isAtLimit   = used >= limit;

  // Colour the bar based on usage
  const barColor = isAtLimit   ? '#C0392B'
                 : isNearLimit ? '#F39C12'
                 : '#D4A000';

  const planLabel = {
    free:       'Free',
    pro:        'Pro',
    enterprise: 'Enterprise',
  }[plan] || plan;

  // ── Compact mode — for NavBar (just the numbers + bar)
  if (compact) {
    return (
      <div
        style={styles.compact}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={`${used} of ${limit} analyses used this month`}
      >
        <span style={styles.compactText}>
          {used}<span style={styles.compactDim}>/{limit}</span>
        </span>
        <div style={styles.compactTrack}>
          <div style={{ ...styles.compactBar, width: `${pct}%`, background: barColor }} />
        </div>
        <span style={{ ...styles.planBadge, ...planBadgeColor(plan) }}>{planLabel}</span>
      </div>
    );
  }

  // ── Full mode — for AppPage or BillingSettings
  return (
    <div style={styles.card}>

      {/* Header row */}
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardEyebrow}>Usage this period</div>
          <div style={styles.cardCount}>
            <span style={{ color: isAtLimit ? '#C0392B' : '#E8E4D8' }}>{used}</span>
            <span style={styles.cardCountDim}> / {limit === 999999 ? '∞' : limit}</span>
            <span style={styles.cardCountLabel}> analyses</span>
          </div>
        </div>
        <span style={{ ...styles.planBadge, ...planBadgeColor(plan), fontSize: 10, padding: '4px 10px' }}>
          {planLabel}
        </span>
      </div>

      {/* Progress bar — hidden for unlimited plans */}
      {limit !== 999999 && (
        <div style={styles.track}>
          <div style={{
            ...styles.bar,
            width: `${pct}%`,
            background: barColor,
            transition: 'width 0.4s ease, background 0.3s ease',
          }} />
        </div>
      )}

      {/* Status messages */}
      {isAtLimit && plan === 'free' && (
        <div style={styles.alertBox}>
          <span style={styles.alertIcon}>⚠</span>
          <div>
            <div style={styles.alertTitle}>Monthly limit reached</div>
            <div style={styles.alertBody}>
              Upgrade to Pro for unlimited analyses and full team access.
            </div>
          </div>
        </div>
      )}

      {isNearLimit && !isAtLimit && (
        <div style={{ ...styles.alertBox, ...styles.alertBoxAmber }}>
          <span style={{ ...styles.alertIcon, color: '#F39C12' }}>⚠</span>
          <div>
            <div style={{ ...styles.alertTitle, color: '#F39C12' }}>
              {remaining} {remaining === 1 ? 'analysis' : 'analyses'} remaining
            </div>
            <div style={styles.alertBody}>
              Running low on your free tier quota.
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA — free tier only */}
      {plan === 'free' && (
        <div style={styles.upgradeRow}>
          <div style={styles.upgradeText}>
            Pro plan — unlimited analyses, full history, team management
          </div>
          <button
            style={{
              ...styles.upgradeBtn,
              ...(hovered ? styles.upgradeBtnHover : {}),
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => {
              // Wire to your Stripe Checkout session creation
              // e.g. fetch('/api/stripe/create-checkout') then redirect
              window.location.href = '/settings?tab=billing';
            }}
          >
            Upgrade to Pro →
          </button>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────
// USAGE BANNER — shown inline above Run Analysis
// when limit is near or reached
// ─────────────────────────────────────────────
export function UsageBanner({ used, limit, plan, remaining }) {
  if (!plan || plan !== 'free') return null;
  if (!isNearLimit(used, limit, remaining)) return null;

  const isAtLimit = used >= limit;

  return (
    <div style={{
      ...styles.banner,
      borderColor: isAtLimit ? 'rgba(192,57,43,0.4)' : 'rgba(243,156,18,0.4)',
      background:  isAtLimit ? 'rgba(192,57,43,0.06)' : 'rgba(243,156,18,0.06)',
    }}>
      <span style={{
        ...styles.bannerIcon,
        color: isAtLimit ? '#C0392B' : '#F39C12',
      }}>⚠</span>
      <span style={styles.bannerText}>
        {isAtLimit
          ? <>Monthly limit reached — <a href="/settings?tab=billing" style={styles.bannerLink}>upgrade to Pro</a> to continue running analyses.</>
          : <>{remaining} {remaining === 1 ? 'analysis' : 'analyses'} remaining this month — <a href="/settings?tab=billing" style={styles.bannerLink}>upgrade to Pro</a> for unlimited access.</>
        }
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function isNearLimit(used, limit, remaining) {
  return remaining <= 2 || used >= limit;
}

function planBadgeColor(plan) {
  return {
    free:       { background: 'rgba(74,72,64,0.4)',     border: '1px solid #4A4840',  color: '#7A7668' },
    pro:        { background: 'rgba(212,160,0,0.1)',    border: '1px solid #9A7400',  color: '#D4A000' },
    enterprise: { background: 'rgba(52,152,219,0.1)',   border: '1px solid #3498DB',  color: '#3498DB' },
  }[plan] || {};
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = {
  // Compact (NavBar)
  compact: {
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'default',
  },
  compactText: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#E8E4D8',
  },
  compactDim: { color: '#4A4840' },
  compactTrack: {
    width: 48, height: 3, background: 'rgba(212,160,0,0.1)', overflow: 'hidden',
  },
  compactBar: { height: '100%', transition: 'width 0.4s ease' },

  // Plan badge (shared)
  planBadge: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px',
    display: 'inline-block',
  },

  // Full card
  card: {
    background: '#111110', border: '1px solid rgba(212,160,0,0.12)',
    padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16,
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardEyebrow: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4A4840', marginBottom: 6,
  },
  cardCount: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 600,
  },
  cardCountDim:   { color: '#4A4840', fontSize: 18 },
  cardCountLabel: { color: '#7A7668', fontSize: 13, fontWeight: 400 },

  // Progress bar
  track: {
    height: 4, background: 'rgba(212,160,0,0.08)', overflow: 'hidden',
  },
  bar: { height: '100%' },

  // Alert boxes
  alertBox: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)',
    padding: '12px 14px',
  },
  alertBoxAmber: {
    background: 'rgba(243,156,18,0.06)', border: '1px solid rgba(243,156,18,0.25)',
  },
  alertIcon: { color: '#C0392B', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginTop: 1 },
  alertTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#C0392B', marginBottom: 4 },
  alertBody:  { fontSize: 12, color: '#7A7668', lineHeight: 1.5 },

  // Upgrade CTA
  upgradeRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 16, flexWrap: 'wrap',
    borderTop: '1px solid rgba(212,160,0,0.08)', paddingTop: 16,
  },
  upgradeText: { fontSize: 12, color: '#4A4840', flex: 1, lineHeight: 1.5 },
  upgradeBtn: {
    background: '#D4A000', color: '#080806',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 18px',
    border: 'none', cursor: 'pointer', transition: 'background 0.15s, box-shadow 0.15s',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  upgradeBtnHover: { background: '#E8B000', boxShadow: '0 0 16px rgba(212,160,0,0.25)' },

  // Inline banner
  banner: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    border: '1px solid', padding: '10px 14px', marginBottom: 16,
  },
  bannerIcon: { fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 },
  bannerText: { fontSize: 12, color: '#7A7668', lineHeight: 1.6 },
  bannerLink: { color: '#D4A000', textDecoration: 'underline', textUnderlineOffset: 3 },
};