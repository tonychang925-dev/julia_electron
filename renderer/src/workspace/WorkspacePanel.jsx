import React from 'react';

const PROJECTS = [
  { key: 'ai_theme_app', label: 'ai_theme_app', desc: 'Market Intelligence Engine', status: 'active' },
  { key: 'julia_core', label: 'Julia Core', desc: 'Agent Operating System', status: 'active' },
  { key: 'julia_electron', label: 'Julia Desktop', desc: 'Electron Shell', status: 'active' },
];

export default function WorkspacePanel() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}> </span> Workspace
      </div>
      <div style={styles.list}>
        {PROJECTS.map((p) => (
          <div key={p.key} style={styles.row}>
            <div style={styles.icon}> </div>
            <div>
              <div style={styles.label}>{p.label}</div>
              <div style={styles.desc}>{p.desc}</div>
            </div>
            <div style={{
              ...styles.badge,
              background: p.status === 'active' ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)',
              color: p.status === 'active' ? '#4CAF50' : '#555',
            }}>{p.status}</div>
          </div>
        ))}
      </div>
      <div style={styles.footer}>
        <span style={styles.footerText}>Julia knows which project you're in.</span>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px', height: '100%', overflowY: 'auto' },
  header: { fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#ccc' },
  title: { marginRight: '8px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' },
  icon: { fontSize: '20px', width: '28px', textAlign: 'center' },
  label: { fontSize: '13px', fontWeight: 600, color: '#ccc' },
  desc: { fontSize: '11px', color: '#777', marginTop: '2px' },
  badge: { padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600 },
  footer: { marginTop: '24px', textAlign: 'center' },
  footerText: { fontSize: '11px', color: '#555' },
};
