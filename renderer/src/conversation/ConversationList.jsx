import React, { useState, useEffect, useCallback } from 'react';
import {
  loadSessions,
  createSession,
  getCurrentId,
  setCurrentId,
} from './SessionStore';

/**
 * ConversationList — Session picker, Claude ResumeConversation equivalent.
 * Phase E0.6: localStorage-backed. No Core dependency.
 */
export default function ConversationList({ onSelect, onNew }) {
  const [sessions, setSessions] = useState([]);
  const [currentId, setLocalCurrentId] = useState(getCurrentId());

  const refresh = useCallback(() => {
    setSessions(loadSessions());
    setLocalCurrentId(getCurrentId());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleNew = () => {
    const session = createSession();
    refresh();
    if (onNew) onNew(session.id);
  };

  const handleSelect = (session) => {
    setCurrentId(session.id);
    setLocalCurrentId(session.id);
    if (onSelect) onSelect(session.id);
  };

  const groups = groupByDate(sessions);

  return (
    <div style={styles.container}>
      <button onClick={handleNew} style={styles.newBtn}>
        + New Conversation
      </button>
      <div style={styles.list}>
        {Object.entries(groups).map(([label, items]) => (
          <div key={label}>
            <div style={styles.groupLabel}>{label}</div>
            {items.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelect(s)}
                style={{
                  ...styles.item,
                  ...(s.id === currentId ? styles.itemActive : {}),
                }}
              >
                <div style={styles.itemTitle}>{s.title}</div>
                <div style={styles.itemMeta}>
                  {s.message_count} messages · {relativeTime(s.updated_at)}
                </div>
              </div>
            ))}
          </div>
        ))}
        {sessions.length === 0 && (
          <div style={styles.empty}>No conversations yet.</div>
        )}
      </div>
    </div>
  );
}

function groupByDate(sessions) {
  const groups = {};
  const now = new Date();
  for (const s of sessions) {
    const d = new Date(s.updated_at);
    const diff = now - d;
    let label;
    if (diff < 86400000) label = 'Today';
    else if (diff < 172800000) label = 'Yesterday';
    else if (diff < 604800000) label = 'This Week';
    else label = 'Earlier';
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }
  return groups;
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = {
  container: {
    width: '220px',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    WebkitAppRegion: 'no-drag',
  },
  newBtn: {
    margin: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#ccc',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  list: { flex: 1, overflowY: 'auto', padding: '0 8px' },
  groupLabel: { padding: '8px 4px 4px', fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' },
  item: { padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px', transition: 'background 0.1s' },
  itemActive: { background: 'rgba(255,255,255,0.1)' },
  itemTitle: { fontSize: '12px', color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemMeta: { fontSize: '10px', color: '#666', marginTop: '2px' },
  empty: { padding: '16px', fontSize: '12px', color: '#555', textAlign: 'center' },
};
