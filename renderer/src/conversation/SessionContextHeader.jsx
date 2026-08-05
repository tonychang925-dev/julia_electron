import React, { useState, useEffect } from 'react';
import { loadSession } from './SessionStore';

/**
 * SessionContextHeader — shows active session context above the chat.
 * Phase E0.6.2: displays title, message count, last updated.
 * Future: tags, summary, memory binding status.
 */
export default function SessionContextHeader({ sessionId }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!sessionId) { setSession(null); return; }
    loadSession(sessionId).then((s) => setSession(s));
  }, [sessionId]);

  if (!session) return null;

  const updated = session.updated_at
    ? relativeTime(session.updated_at)
    : '';

  return (
    <div style={styles.bar}>
      <div style={styles.title}>{session.title}</div>
      <div style={styles.meta}>
        {session.message_count || 0} messages
        {updated ? ` · Updated ${updated}` : ''}
      </div>
    </div>
  );
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
  bar: {
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    WebkitAppRegion: 'no-drag',
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#ccc',
  },
  meta: {
    fontSize: '10px',
    color: '#666',
    marginTop: '2px',
  },
};
