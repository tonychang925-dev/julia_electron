import React from 'react';

/**
 * RuntimeStatus — maps RuntimeEvents to visual states.
 * Phase E0.7: mock events only. E1 wires to real WebSocket stream.
 *
 * States: idle → thinking → loading_context → reading_memory →
 *         calling_tool → streaming → done → error
 */

const STATE_ICONS = {
  idle:    { icon: ' ', label: 'Ready', color: '#4CAF50' },
  thinking: { icon: ' ', label: 'Understanding...', color: '#FFC107' },
  loading_context: { icon: ' ', label: 'Loading context...', color: '#FFC107' },
  reading_memory: { icon: ' ', label: 'Reading memory...', color: '#FFC107' },
  calling_tool: { icon: ' ', label: 'Using tools...', color: '#2196F3' },
  streaming: { icon: ' ', label: 'Replying...', color: '#FFC107' },
  done:    { icon: ' ', label: 'Done', color: '#4CAF50' },
  error:   { icon: ' ', label: 'Error', color: '#f44336' },
};

export default function RuntimeStatus({ state = 'idle', toolName, errorText }) {
  const s = STATE_ICONS[state] || STATE_ICONS.idle;

  return (
    <div style={styles.row}>
      <span style={{ ...styles.icon, color: s.color }}>{s.icon}</span>
      <span style={{ ...styles.label, color: s.color }}>{s.label}</span>
      {toolName && <span style={styles.tool}>{toolName}</span>}
      {errorText && <span style={styles.error}>{errorText}</span>}
    </div>
  );
}

export { STATE_ICONS };
