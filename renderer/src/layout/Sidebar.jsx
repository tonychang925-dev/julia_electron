import React from 'react';
import { VIEWS } from '../app/Router';

const NAV_ITEMS = [
  { key: VIEWS.chat, label: '对话', icon: ' ' },
  { key: VIEWS.memory, label: '记忆', icon: ' ' },
  { key: VIEWS.tools, label: '工具', icon: ' ' },
  { key: VIEWS.workspace, label: '空间', icon: ' ' },
  { key: VIEWS.settings, label: '设置', icon: ' ' },
];

export default function Sidebar({ currentView, onNavigate }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>Julia</div>

      <div style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              ...styles.navItem,
              ...(currentView === item.key ? styles.navItemActive : {}),
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerText}>v0.1.0</div>
      </div>
    </div>
  );
}

// Inline styles — migrate to CSS module in Phase E1
const styles = {
  sidebar: {
    width: '68px',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    WebkitAppRegion: 'no-drag',
    transition: 'width 0.2s',
  },
  logo: {
    padding: '14px 8px',
    fontSize: '11px',
    fontWeight: 700,
    textAlign: 'center',
    color: '#aaa',
    letterSpacing: '1px',
  },
  nav: {
    flex: 1,
    padding: '8px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    background: 'none',
    border: 'none',
    color: '#777',
    padding: '10px 6px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    transition: 'background 0.15s, color 0.15s',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.12)',
    color: '#e0e0e0',
  },
  navIcon: {
    fontSize: '16px',
  },
  footer: {
    padding: '12px 8px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '9px',
    color: '#555',
  },
};
