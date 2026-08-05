import React, { useState, useEffect, useRef } from 'react';

/**
 * Runtime Birth Test — Generic Client proof.
 *
 * This component contains ZERO references to:
 *   Julia, Tony, memory, persona, identity, DeepSeek, relationship.
 *
 * It only knows the Runtime Gateway Protocol v1:
 *   user.message → runtime.event stream.
 *
 * If Julia emerges from the reply, she exists entirely in the Runtime.
 * If not, the Client Ignorance Score is not 100%.
 */
export default function RuntimeBirthTest() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const inputRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const API = window.juliaAPI;
    if (!API) return;

    const unsub = API.subscribe((evt) => {
      setEvents((prev) => [...prev, evt]);

      const { type, category, event } = evt;
      if (type === 'gateway.connected' || (category === 'runtime' && event === 'gateway.ready')) {
        setConnected(true);
      }
      if (type === 'gateway.disconnected') {
        setConnected(false);
      }
    });

    cleanupRef.current = unsub;
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, []);

  const send = () => {
    const text = inputRef.current?.value?.trim();
    if (!text || !connected) return;
    window.juliaAPI.sendMessage(text);
    inputRef.current.value = '';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') send();
  };

  const lastReply = [...events].reverse().find(
    (e) => e.category === 'conversation' && e.event === 'message.sent'
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.dot}> </span>
        <span style={styles.title}>Runtime Birth Test</span>
        <span style={{ fontSize: '10px', color: connected ? '#4CAF50' : '#f44336' }}>
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </div>

      <div style={styles.events}>
        <div style={styles.label}>Event Stream (last 20)</div>
        {events.slice(-20).map((e, i) => (
          <div key={i} style={styles.eventRow}>
            <span style={styles.ts}>{e.timestamp || ''}</span>
            <span style={styles.cat}>{e.category}/{e.event}</span>
            <span style={styles.data}>
              {e.data?.state || e.data?.reply?.slice(0, 60) || ''}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <div style={styles.empty}>No events yet. Send a message.</div>
        )}
      </div>

      {lastReply && (
        <div style={styles.reply}>
          <div style={styles.replyLabel}>Last Reply</div>
          <div style={styles.replyText}>{lastReply.data?.reply}</div>
        </div>
      )}

      <div style={styles.inputRow}>
        <input
          ref={inputRef}
          style={styles.input}
          placeholder={connected ? 'Type a message...' : 'Disconnected'}
          disabled={!connected}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button onClick={send} disabled={!connected} style={styles.btn}>Send</button>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', background: '#0a0a0a', color: '#aaa', fontFamily: 'monospace' },
  header: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  dot: { fontSize: '10px' },
  title: { fontSize: '13px', fontWeight: 600, color: '#ccc', flex: 1 },
  events: { flex: 1, overflowY: 'auto', marginBottom: '12px' },
  label: { fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase' },
  eventRow: { display: 'flex', gap: '8px', padding: '2px 0', fontSize: '10px' },
  ts: { color: '#444', minWidth: '48px' },
  cat: { color: '#888', minWidth: '120px' },
  data: { color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { fontSize: '11px', color: '#444', padding: '12px 0' },
  reply: { background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', marginBottom: '12px' },
  replyLabel: { fontSize: '9px', color: '#555', marginBottom: '4px', textTransform: 'uppercase' },
  replyText: { fontSize: '12px', color: '#ccc', lineHeight: 1.5 },
  inputRow: { display: 'flex', gap: '8px' },
  input: { flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#ccc', fontSize: '12px', outline: 'none' },
  btn: { padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#ccc', cursor: 'pointer', fontSize: '12px' },
};
