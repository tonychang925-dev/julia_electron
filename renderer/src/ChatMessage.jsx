import React from 'react';

export default function ChatMessage({ role, text, isThinking, isError }) {
  const isJulia = role === 'julia';

  if (isThinking) {
    return (
      <div style={styles.thinkingRow}>
        <div style={styles.avatarSm}> </div>
        <div style={styles.thinkingDots}>
          <span style={styles.dot}>.</span>
          <span style={{ ...styles.dot, animationDelay: '0.2s' }}>.</span>
          <span style={{ ...styles.dot, animationDelay: '0.4s' }}>.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.row,
      flexDirection: isJulia ? 'row' : 'row-reverse',
    }}>
      <div style={styles.avatarSm}>
        {isJulia ? ' ' : ' '}
      </div>
      <div style={{
        ...styles.bubble,
        background: isJulia
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.12)',
        color: isError ? '#ff6b6b' : '#e0e0e0',
      }}>
        {text}
      </div>
    </div>
  );
}

const styles = {
  row: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    alignItems: 'flex-start',
  },
  avatarSm: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '14px',
    fontSize: '14px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  thinkingRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    alignItems: 'center',
  },
  thinkingDots: {
    padding: '10px 14px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.06)',
  },
  dot: {
    display: 'inline-block',
    animation: 'blink 1.4s infinite',
    fontSize: '18px',
    color: '#888',
  },
};
