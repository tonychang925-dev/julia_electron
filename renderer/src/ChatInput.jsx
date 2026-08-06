import React, { useState, useRef } from 'react';
import VoiceButton from './VoiceButton';

/**
 * ChatInput — text or voice. Toggle switches between modes.
 * Voice mode: press-hold mic with audio level bar.
 * Text mode: keyboard input with send button.
 */
export default function ChatInput({ onSend, onVoiceTranscript, sessionId, disabled }) {
  const [text, setText] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceResult = (text) => {
    const trimmed = text?.trim();
    if (trimmed && trimmed !== '[voice]' && onVoiceTranscript) {
      onVoiceTranscript(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.toggleRow}>
        <button
          type="button"
          onClick={() => setVoiceMode(!voiceMode)}
          style={{
            ...styles.toggleBtn,
            background: voiceMode ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.06)',
            color: voiceMode ? '#4CAF50' : '#888',
          }}
          title={voiceMode ? 'Switch to text' : 'Switch to voice'}
        >
          {voiceMode ? '  Voice  ' : '  Text  '}
        </button>
      </div>
      <div style={styles.row}>
        {voiceMode ? (
          <VoiceButton sessionId={sessionId} disabled={disabled} />
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? 'Offline...' : 'Type a message...'}
              disabled={disabled}
              style={styles.input}
              autoFocus
            />
            <button
              type="submit"
              disabled={disabled || !text.trim()}
              style={{ ...styles.sendBtn, opacity: disabled || !text.trim() ? 0.3 : 1 }}
            >

            </button>
          </>
        )}
      </div>
    </form>
  );
}

const styles = {
  form: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    WebkitAppRegion: 'no-drag',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '6px',
  },
  toggleBtn: {
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  row: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
