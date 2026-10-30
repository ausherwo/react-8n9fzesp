// UserBadge.js — v1.1
// Top-right user indicator: avatar initials + name + role badge + sign out dropdown
//
// Usage — add to the top of your RinconChatPrototype (or whatever wraps your app):
//
//   import UserBadge from './UserBadge';
//
//   // Inside your component's return, as the first child:
//   <div style={{ position: 'relative' }}>
//     <UserBadge />
//     {/* rest of your app */}
//   </div>
//
// Or if your app already has a top bar, just drop <UserBadge /> inside it.
//
// Pass theme={LIGHT} (from chat/ChatPrimitives) to render against a light
// background, e.g. the JC homepage's nav. Omit it for the original dark look.

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './Auth';

const DARK_THEME = {
  surface: '#0D0D0A', border: 'rgba(212,160,0,0.15)', borderOpen: 'rgba(212,160,0,0.4)',
  focusRing: 'rgba(212,160,0,0.08)', amberBg: 'rgba(212,160,0,0.15)', amberBorder: 'rgba(212,160,0,0.3)',
  amber: '#D4A000', text: '#E8E4D8', muted: '#7A7668', dim: '#4A4840', divider: 'rgba(212,160,0,0.08)',
  hoverBg: 'rgba(212,160,0,0.06)', shadow: '0 8px 32px rgba(0,0,0,0.6)', red: '#E07060', redHoverBg: 'rgba(192,57,43,0.08)',
};

function toTheme(theme) {
  if (!theme) return DARK_THEME;
  return {
    surface: theme.surface, border: theme.border, borderOpen: theme.amber,
    focusRing: `${theme.amber}20`, amberBg: theme.amberG || `${theme.amber}18`, amberBorder: `${theme.amber}50`,
    amber: theme.amber, text: theme.text, muted: theme.muted, dim: theme.dim, divider: theme.border,
    hoverBg: theme.hi, shadow: '0 8px 32px rgba(26,24,16,0.12)', red: theme.red, redHoverBg: `${theme.red}12`,
  };
}

export default function UserBadge({ theme }) {
  const { member, org, signOut } = useAuth();
  const [open, setOpen]         = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef(null);
  const t = toTheme(theme);
  const s = getStyles(t);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!member) return null;

  // Generate initials from name — fall back to email
  const initials = member.name
    ? member.name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('')
    : member.email?.[0]?.toUpperCase() || '?';

  const displayName = member.name || member.email;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div
      ref={ref}
      style={s.wrapper}
    >
      {/* ── Trigger button ── */}
      <button
        style={{ ...s.trigger, ...(open ? s.triggerOpen : {}) }}
        onClick={() => setOpen(v => !v)}
        aria-label="User menu"
      >
        {/* Avatar */}
        <div style={s.avatar}>
          <span style={s.avatarText}>{initials}</span>
        </div>

        {/* Name + role */}
        <div style={s.info}>
          <span style={s.name}>{displayName}</span>
          <span style={{ ...s.role, ...roleColor(member.role, theme) }}>
            {member.role}
          </span>
        </div>

        {/* Chevron */}
        <span style={{ ...s.chevron, ...(open ? s.chevronOpen : {}) }}>
          ▾
        </span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div style={s.dropdown}>

          {/* User details header */}
          <div style={s.dropdownHeader}>
            <div style={s.dropdownAvatar}>
              <span style={s.avatarText}>{initials}</span>
            </div>
            <div style={s.dropdownInfo}>
              <div style={s.dropdownName}>{displayName}</div>
              <div style={s.dropdownEmail}>{member.email}</div>
              {org && (
                <div style={s.dropdownOrg}>{org.name}</div>
              )}
            </div>
          </div>

          <div style={s.dropdownDivider} />

          {/* Menu items */}
          <DropdownItem
            icon="⚙"
            label="Account settings"
            onClick={() => { window.location.href = '/settings'; setOpen(false); }}
          />

          {member.role === 'admin' && (
            <DropdownItem
              icon="👥"
              label="Team"
              onClick={() => { window.location.href = '/settings?tab=team'; setOpen(false); }}
            />
          )}

          {member.role === 'admin' && (
            <DropdownItem
              icon="💳"
              label="Billing"
              onClick={() => { window.location.href = '/settings?tab=billing'; setOpen(false); }}
            />
          )}

          <div style={s.dropdownDivider} />

          <DropdownItem
            icon="→"
            label={signingOut ? 'Signing out…' : 'Sign out'}
            onClick={handleSignOut}
            danger
          />

        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DROPDOWN ITEM
// ─────────────────────────────────────────────
function DropdownItem({ icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...s.dropdownItem,
        ...(hovered ? (danger ? s.dropdownItemDangerHover : s.dropdownItemHover) : {}),
        ...(danger ? s.dropdownItemDanger : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <span style={s.dropdownItemIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// ROLE COLOUR
// ─────────────────────────────────────────────
function roleColor(role, theme) {
  const viewer = theme
    ? { background: theme.hi, border: `1px solid ${theme.border}`, color: theme.muted }
    : { background: 'rgba(74,72,64,0.4)', border: '1px solid #4A4840', color: '#7A7668' };
  return {
    admin:   { background: 'rgba(212,160,0,0.12)',  border: '1px solid rgba(212,160,0,0.3)',  color: '#D4A000' },
    analyst: { background: 'rgba(52,152,219,0.1)',  border: '1px solid rgba(52,152,219,0.3)', color: '#3498DB' },
    viewer,
  }[role] || {};
}

// ─────────────────────────────────────────────
// STYLES — parameterized by the resolved theme tokens (see toTheme above)
// ─────────────────────────────────────────────
function getStyles(t) {
  return {
    wrapper: {
      position:  'relative',
      fontFamily: "'DM Sans', sans-serif",
    },

    // Trigger button
    trigger: {
      display:        'flex',
      alignItems:     'center',
      gap:            10,
      background:     t.surface,
      border:         `1px solid ${t.border}`,
      padding:        '7px 12px 7px 8px',
      cursor:         'pointer',
      transition:     'border-color 0.15s, box-shadow 0.15s',
      color:          t.text,
    },
    triggerOpen: {
      borderColor:  t.borderOpen,
      boxShadow:    `0 0 0 3px ${t.focusRing}`,
    },

    // Avatar circle
    avatar: {
      width:           32,
      height:          32,
      background:      t.amberBg,
      border:          `1px solid ${t.amberBorder}`,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      flexShrink:      0,
    },
    avatarText: {
      fontFamily:  "'JetBrains Mono', monospace",
      fontSize:    11,
      fontWeight:  700,
      color:       t.amber,
      letterSpacing: '0.05em',
    },

    // Name + role inline
    info: {
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'flex-start',
      gap:           3,
    },
    name: {
      fontSize:    13,
      fontWeight:  500,
      color:       t.text,
      lineHeight:  1,
      whiteSpace:  'nowrap',
      maxWidth:    160,
      overflow:    'hidden',
      textOverflow:'ellipsis',
    },
    role: {
      fontFamily:    "'JetBrains Mono', monospace",
      fontSize:      9,
      fontWeight:    700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding:       '2px 6px',
      lineHeight:    1.4,
    },

    // Chevron
    chevron: {
      fontSize:   10,
      color:      t.dim,
      transition: 'transform 0.15s',
      marginLeft: 2,
    },
    chevronOpen: {
      transform: 'rotate(180deg)',
    },

    // Dropdown panel
    dropdown: {
      position:        'absolute',
      top:             'calc(100% + 6px)',
      right:           0,
      minWidth:        220,
      background:      t.surface,
      border:          `1px solid ${t.border}`,
      boxShadow:       t.shadow,
      zIndex:          1001,
      animation:       'fadeDown 0.12s ease both',
    },

    // Dropdown header (user details)
    dropdownHeader: {
      display:    'flex',
      gap:        12,
      padding:    '16px 16px 14px',
      alignItems: 'flex-start',
    },
    dropdownAvatar: {
      width:           36,
      height:          36,
      background:      t.amberBg,
      border:          `1px solid ${t.amberBorder}`,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      flexShrink:      0,
    },
    dropdownInfo: {
      display:       'flex',
      flexDirection: 'column',
      gap:           3,
      overflow:      'hidden',
    },
    dropdownName: {
      fontSize:     13,
      fontWeight:   600,
      color:        t.text,
      whiteSpace:   'nowrap',
      overflow:     'hidden',
      textOverflow: 'ellipsis',
    },
    dropdownEmail: {
      fontFamily:   "'JetBrains Mono', monospace",
      fontSize:     10,
      color:        t.dim,
      whiteSpace:   'nowrap',
      overflow:     'hidden',
      textOverflow: 'ellipsis',
    },
    dropdownOrg: {
      fontSize:  11,
      color:     t.muted,
      marginTop: 2,
    },

    dropdownDivider: {
      height:     1,
      background: t.divider,
      margin:     '2px 0',
    },

    // Dropdown menu items
    dropdownItem: {
      display:     'flex',
      alignItems:  'center',
      gap:         10,
      width:       '100%',
      background:  'none',
      border:      'none',
      padding:     '10px 16px',
      cursor:      'pointer',
      fontSize:    13,
      color:       t.muted,
      textAlign:   'left',
      transition:  'background 0.1s, color 0.1s',
      fontFamily:  "'DM Sans', sans-serif",
    },
    dropdownItemHover: {
      background: t.hoverBg,
      color:      t.text,
    },
    dropdownItemDanger: {
      color: t.dim,
    },
    dropdownItemDangerHover: {
      background: t.redHoverBg,
      color:      t.red,
    },
    dropdownItemIcon: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize:   11,
      color:      t.dim,
      width:      16,
      textAlign:  'center',
      flexShrink: 0,
    },
  };
}

// Inject dropdown animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}