import React from 'react';
import { STATE_ICONS } from './RuntimeStatus';

/**
 * EventTimeline — visual log of RuntimeEvents during this turn.
 * Phase E0.7: mock events. E1 wires to real WebSocket stream.
 */
export default function EventTimeline({ events = [] }) {
  if (!events || events.length === 0) return null;

  return (
    <div style={styles.container}>
      {events.map((evt, i) => {
        const state = STATE_ICONS[evt.state] || STATE_ICONS.idle;
        return (
          <div key={i} style={styles.row}>
            <span style={{ ...styles.icon, color: state.color }}>{state.icon}</span>
            <span style={styles.timestamp}>{evt.timestamp || ''}</span>
            <span style={styles.label}>{state.label}</span>
            {evt.toolName && <span style={styles.tool}>{evt.toolName}</span>}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    padding: '4px 0',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  row: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    padding: '2px 0',
    fontSize: '10px',
  },
  icon: { width: '14px', textAlign: 'center', fontSize: '10px' },
  timestamp: { color: '#555', fontFamily: 'monospace', minWidth: '48px' },
  label: { color: '#888' },
  tool: { color: '#2196F3', fontWeight: 500 },
};
