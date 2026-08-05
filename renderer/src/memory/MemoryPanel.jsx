import React from 'react';

/**
 * MemoryPanel — Julia Memory Center.
 * Phase E0.5: skeleton placeholder.
 * Future: user memory, relationship memory, market memory, experience timeline.
 */
const SECTIONS = [
  { key: 'user', label: 'User Memory', hint: 'Tony的投资风格、偏好、习惯', count: 0 },
  { key: 'relationship', label: 'Relationship Memory', hint: 'Tony与Julia的重要事件', count: 0 },
  { key: 'market', label: 'Market Memory', hint: 'M7 Feedback Loop — 历史预测与准确率', count: 0 },
  { key: 'experience', label: 'Experience', hint: '互动模式、决策风格', count: 0 },
];

export default function MemoryPanel() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}> </span> Memory Center
      </div>
      <div style={styles.grid}>
        {SECTIONS.map((s) => (
          <div key={s.key} style={styles.card}>
            <div style={styles.cardTitle}>{s.label}</div>
            <div style={styles.cardHint}>{s.hint}</div>
            <div style={styles.cardCount}>{s.count} entries</div>
          </div>
        ))}
      </div>
      <div style={styles.footer}>
        <span style={styles.footerText}>Memory OS — governed, not auto-stored.</span>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px', height: '100%', overflowY: 'auto' },
  header: { fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#ccc' },
  title: { marginRight: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  card: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  cardTitle: { fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#ccc' },
  cardHint: { fontSize: '11px', color: '#777', marginBottom: '10px' },
  cardCount: { fontSize: '20px', fontWeight: 700, color: '#555' },
  footer: { marginTop: '24px', textAlign: 'center' },
  footerText: { fontSize: '11px', color: '#555' },
};
