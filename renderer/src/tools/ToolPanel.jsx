import React from 'react';

/**
 * ToolPanel — Julia Capability Registry.
 * Phase E0.5: skeleton placeholder.
 * Future: read_file, search_file, web_search, github, calendar, market_brain, image_gen, browser.
 */
const TOOLS = [
  { key: 'read_file', label: 'Read File', status: 'planned', desc: '读取本地文件' },
  { key: 'search_file', label: 'Search File', status: 'planned', desc: '搜索文件系统' },
  { key: 'web_search', label: 'Web Search', status: 'planned', desc: '联网搜索' },
  { key: 'market_brain', label: 'Market Brain', status: 'planned', desc: 'ai_theme_app 金融分析' },
  { key: 'calendar', label: 'Calendar', status: 'planned', desc: '日历与提醒' },
  { key: 'github', label: 'GitHub', status: 'planned', desc: '代码仓库' },
  { key: 'image_gen', label: 'Image Gen', status: 'planned', desc: '图片生成' },
  { key: 'browser', label: 'Browser', status: 'planned', desc: '网页浏览' },
];

export default function ToolPanel() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}> </span> Tool Registry
      </div>
      <div style={styles.list}>
        {TOOLS.map((t) => (
          <div key={t.key} style={styles.row}>
            <div style={styles.toolIcon}> </div>
            <div style={styles.toolInfo}>
              <div style={styles.toolLabel}>{t.label}</div>
              <div style={styles.toolDesc}>{t.desc}</div>
            </div>
            <div style={{
              ...styles.badge,
              background: t.status === 'active' ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)',
              color: t.status === 'active' ? '#4CAF50' : '#555',
            }}>
              {t.status}
            </div>
          </div>
        ))}
      </div>
      <div style={styles.footer}>
        <span style={styles.footerText}>
          All tools read-only. Julia decides when to use. You approve consequences.
        </span>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '24px', height: '100%', overflowY: 'auto' },
  header: { fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#ccc' },
  title: { marginRight: '8px' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  row: {
    display: 'flex', gap: '12px', alignItems: 'center',
    padding: '10px 14px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
  },
  toolIcon: { fontSize: '16px', width: '24px', textAlign: 'center' },
  toolInfo: { flex: 1 },
  toolLabel: { fontSize: '13px', fontWeight: 500, color: '#ccc' },
  toolDesc: { fontSize: '11px', color: '#777', marginTop: '2px' },
  badge: {
    padding: '2px 8px', borderRadius: '6px', fontSize: '10px',
    fontWeight: 600, textTransform: 'uppercase',
  },
  footer: { marginTop: '24px', textAlign: 'center' },
  footerText: { fontSize: '11px', color: '#555' },
};
