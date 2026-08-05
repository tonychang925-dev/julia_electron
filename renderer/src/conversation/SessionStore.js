/**
 * SessionStore — Core-backed session persistence.
 * E1.1: Gateway 8100 as source of truth. localStorage is cache only.
 */

const API = 'http://127.0.0.1:8100';
const CURRENT_KEY = 'julia_current_session';

async function api(method, path, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    if (!res.ok) throw new Error(res.statusText);
    return res.status === 204 ? null : await res.json();
  } catch (e) {
    console.warn(`[SessionStore] API ${path}: ${e.message}`);
    return null;
  }
}

const get = (p) => api('GET', p);
const post = (p, b) => api('POST', p, b);
const del = (p) => api('DELETE', p);

// ── Public API ──

export async function createSession(title = 'New Conversation') {
  const result = await post('/sessions', { title });
  // Gateway returns {status, session_id, ...} — normalize to {id, ...}
  if (result && result.session_id) {
    return { ...result, id: result.session_id };
  }
  return result;
}

export async function loadSessions() {
  return await get('/sessions') || [];
}

export async function searchSessions(query) {
  return await get(`/sessions?q=${encodeURIComponent(query)}`) || [];
}

export async function loadSession(id) {
  if (!id || id.startsWith('local_')) return null;
  return await get(`/sessions/${id}`);
}

export async function deleteSession(id) {
  const ok = await del(`/sessions/${id}`);
  if (ok && getCurrentId() === id) {
    localStorage.removeItem(CURRENT_KEY);
  }
  return ok;
}

export async function addMessage(sessionId, role, text) {
  if (!sessionId || sessionId.startsWith('local_')) return;
  await post(`/sessions/${sessionId}/messages`, { role, content: text });
}

export function getCurrentId() {
  return localStorage.getItem(CURRENT_KEY);
}

export function setCurrentId(id) {
  localStorage.setItem(CURRENT_KEY, id);
}

export async function getCurrentSession() {
  const id = getCurrentId();
  return id ? await loadSession(id) : null;
}
