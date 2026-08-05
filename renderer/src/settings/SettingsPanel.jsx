import React from 'react';

const SETTINGS_SECTIONS = [
  { key: 'model', label: 'Model', desc: 'LLM Provider — DeepSeek, GPT, Claude, Local', current: 'DeepSeek' },
  { key: 'persona', label: 'Persona', desc: 'Julia身份 — 温柔、理性、长期主义', current: 'Julia v1' },
  { key: 'voice', label: 'Voice', desc: 'TTS引擎 — ElevenLabs / Edge TTS / Fish Audio', current: 'Edge TTS' },
  { key: 'memory', label: 'Memory', desc: '记忆治理 — 记忆保留策略、优先级、L3保护', current: 'Enabled' },
  { key: 'privacy', label: 'Privacy', desc: '隐私 — 本地存储、不上传云端', current: 'Local only' },
  { key: 'tools', label: 'Tools', desc: '工具权限 — 只读/读写、审批控制', current: 'Read-only' },
  { key: 'developer', label: 'Developer', desc: '开发者 — API endpoint、port、trace level', current: ':8003' },
];

export default function SettingsPanel() {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}> </span> Settings
      </div>
      <div style={styles.list}>
        {SETTINGS_SECTIONS.map((s) => (
          <div key={s.key} style={styles.row}>
            <div style={styles.icon}> </div>
            <div style={styles.info}>
              <div style={styles.label}>{s.label}</div>
              <div style={styles.desc}>{s.desc}</div>
            </div>
            <div style={styles.value}>{s.current}</div>
          </div>
        ))}
      </div>
      <div style={styles.footer}>
        <span style={styles.footerText}>
          Julia Core settings. All changes require runtime restart.
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
  row: { display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' },
  icon: { fontSize: '16px', width: '24px', textAlign: 'center' },
  info: { flex: 1 },
  label: { fontSize: '13px', fontWeight: 600, color: '#ccc' },
  desc: { fontSize: '11px', color: '#777', marginTop: '2px' },
  value: { fontSize: '12px', color: '#888', fontWeight: 500 },
  footer: { marginTop: '24px', textAlign: 'center' },
  footerText: { fontSize: '11px', color: '#555' },
};
