import React, { useState, useRef } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.row}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Julia 离线中...' : '输入消息...'}
          disabled={disabled}
          style={styles.input}
          autoFocus
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          style={{
            ...styles.sendBtn,
            opacity: disabled || !text.trim() ? 0.3 : 1,
          }}
        >

        </button>
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
