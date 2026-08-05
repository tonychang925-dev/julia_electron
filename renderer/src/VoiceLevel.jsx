import React from 'react';

/**
 * VoiceLevel — audio intensity bar.
 * level: 0.0–1.0, height scales with input volume.
 */
export default function VoiceLevel({ level = 0, active = false }) {
  if (!active) return null;

  const bars = 8;
  const activeBars = Math.min(bars, Math.ceil(level * bars));

  return (
    <div style={styles.container}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.bar,
            height: `${12 + (i / bars) * 28}px`,
            background: i < activeBars
              ? `rgba(76,175,80,${0.3 + (i / bars) * 0.7})`
              : 'rgba(255,255,255,0.08)',
            transition: 'background 0.1s',
          }}
        />
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '3px',
    alignItems: 'flex-end',
    height: '40px',
    padding: '0 4px',
  },
  bar: {
    width: '3px',
    borderRadius: '2px',
    minHeight: '8px',
  },
};
