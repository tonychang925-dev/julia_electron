import React, { useState, useEffect, useRef } from 'react';

const API = window.juliaAPI;

/**
 * RuntimeTimeline — live event trace viewer.
 * E2c: observes all Gateway events. Client-side only, no Core changes.
 */
export default function RuntimeTimeline({ maxEvents = 50 }) {
  const [events, setEvents] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    const unsub = API.subscribe((evt) => {
      setEvents((prev) => {
        const next = [...prev, evt];
        return next.slice(-maxEvents);
      });
    });
    return unsub;
  }, [maxEvents]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} style={styles.toggle}>
        Events ({events.length})
      </button>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span>Runtime Timeline</span>
        <button onClick={() => setExpanded(false)} style={styles.closeBtn}> </button>
      </div>
      <div style={styles.list}>
        {events.length === 0 && <div style={styles.empty}>No events yet.</div>}
        {events.map((e, i) => {
          const cat = e.category || '';
          const evt = e.event || '';
          const data = e.data || {};
          const icon = cat === 'presence' ? ' '
            : cat === 'voice' || e.type?.includes('voice') ? ' '
            : cat === 'conversation' ? ' '
            : cat === 'runtime' ? ' '
            : ' ';
          const label = data?.state || data?.text || data?.reply || '';
          const short = typeof label === 'string' ? label.slice(0, 60) : '';

          return (
            <div key={i} style={styles.row}>
              <span style={styles.icon}>{icon}</span>
              <span style={styles.ts}>{e.timestamp || ''}</span>
              <span style={styles.cat}>{cat}/{evt}</span>
              {short && <span style={styles.data}>{short}</span>}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}

const styles = {
  toggle: {
    margin: '4px 16px',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#666',
    fontSize: '10px',
    cursor: 'pointer',
  },
  panel: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.2)',
    maxHeight: '160px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    WebkitAppRegion: 'no-drag',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '10px', color: '#888', fontWeight: 600, textTransform: 'uppercase',
  },
  closeBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' },
  list: { flex: 1, overflowY: 'auto', padding: '4px 12px' },
  row: {
    display: 'flex', gap: '6px', alignItems: 'center',
    padding: '2px 0', fontSize: '10px', fontFamily: 'monospace',
  },
  icon: { width: '14px', textAlign: 'center', fontSize: '10px' },
  ts: { color: '#444', minWidth: '48px' },
  cat: { color: '#666', minWidth: '110px' },
  data: { color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { color: '#444', padding: '8px 0', fontSize: '10px' },
};
