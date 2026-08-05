/**
 * SessionStore — Local conversation persistence.
 * Phase E0.6: localStorage-based. No Julia Core dependency.
 *
 * Future: IndexedDB for larger histories, synced with Core Session API.
 */

const STORAGE_KEY = 'julia_conversations';
const CURRENT_KEY = 'julia_current_session';

export function createSession(title = 'New Conversation') {
  const sessions = loadSessions();
  const session = {
    id: `sess_${Date.now()}`,
    title,
    topic: '',
    messages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: 0,
  };
  sessions.unshift(session);
  saveSessions(sessions);
  setCurrentId(session.id);
  return session;
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
}

export function getCurrentId() {
  return localStorage.getItem(CURRENT_KEY);
}

export function setCurrentId(id) {
  localStorage.setItem(CURRENT_KEY, id);
}

export function getCurrentSession() {
  const id = getCurrentId();
  const sessions = loadSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function addMessage(sessionId, role, text) {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.messages.push({ role, text, timestamp: Date.now() });
  session.message_count = session.messages.length;
  session.updated_at = new Date().toISOString();
  // Auto-title from first user message
  if (role === 'user' && session.title === 'New Conversation') {
    session.title = text.slice(0, 30) + (text.length > 30 ? '...' : '');
  }
  saveSessions(sessions);
}

export function updateSessionTitle(sessionId, title) {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.title = title;
    saveSessions(sessions);
  }
}
