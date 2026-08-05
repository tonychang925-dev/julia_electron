const { ipcMain } = require('electron');
const WebSocket = require('ws');
const http = require('http');

const GW_HOST = '127.0.0.1';
const GW_PORT = 8100;

let ws = null;
let reconnectTimer = null;
let currentSessionId = 'tony-main';
const listeners = new Map();  // senderId → handler

function broadcast(evt) {
  listeners.forEach((fn) => { try { fn(evt); } catch {} });
}
function clearSubscriber(senderId) {
  listeners.delete(senderId);
}

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  try { ws = new WebSocket(`ws://${GW_HOST}:${GW_PORT}/ws`); }
  catch (e) { scheduleReconnect(); return; }

  ws.on('open', () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    // Bind session so Gateway links RTC audio → WS → transcripts
    send({ type: 'session.bind', session_id: currentSessionId });
    broadcast({ type: 'gateway.connected' });
  });

  ws.on('message', (raw) => {
    try {
      const evt = JSON.parse(raw.toString());
      // Gateway emits: runtime.presence.changed, assistant.chunk, speech.*, etc.
      // Map to renderer event format
      broadcast({
        type: 'runtime.event',
        category: evt.category || evt.type?.split('.')[0] || '',
        event: evt.event || evt.type?.split('.').slice(1).join('.') || '',
        data: evt.data || evt.payload || evt,
        timestamp: evt.timestamp || new Date().toLocaleTimeString(),
      });
    } catch {}
  });

  ws.on('close', () => { scheduleReconnect(); });
  ws.on('error', () => { ws?.close(); });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  broadcast({ type: 'gateway.disconnected' });
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 3000);
}

/**
 * Send a protocol event to Gateway via WebSocket.
 */
function send(evt) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(evt));
  }
}

function checkHealth() {
  return new Promise((resolve) => {
    http.get(`http://${GW_HOST}:${GW_PORT}/health`, (res) => {
      let body = '';
      res.on('data', (c) => body += c.toString());
      res.on('end', () => {
        try { const d = JSON.parse(body); resolve({ online: d.status === 'ok', version: d.version || '' }); }
        catch { resolve({ online: false }); }
      });
    }).on('error', () => resolve({ online: false }))
      .setTimeout(3000, function() { this.destroy(); resolve({ online: false }); });
  });
}

function createWebSocket() {
  connect();
  setInterval(() => send({ type: 'client.heartbeat', client: 'electron', version: '0.3.0' }), 30000);

  // ── Renderer → Gateway ──
  // Text messages use HTTP (Gateway handles POST /chat)
  ipcMain.on('julia:send', (event, { text, sessionId }) => {
    const postData = JSON.stringify({ text, session_id: sessionId || 'tony-main' });
    const req = http.request({
      hostname: GW_HOST, port: GW_PORT, path: '/chat', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c.toString());
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          const reply = data.reply || '';
          broadcast({
            type: 'runtime.event', category: 'conversation', event: 'message.sent',
            data: { reply, turn: data.turn, presence: data.presence || 'warm' },
            timestamp: new Date().toLocaleTimeString(),
          });
        } catch {}
      });
    });
    req.on('error', () => {});
    req.on('timeout', function() { this.destroy(); });
    req.write(postData);
    req.end();
  });

  // Gateway → Renderer subscriber (dedup by sender)
  ipcMain.on('julia:subscribe-events', (event) => {
    const senderId = event.sender.id;
    // Remove old handler for this sender
    clearSubscriber(senderId);
    const handler = (evt) => { try { event.reply('julia:event', evt); } catch {} };
    listeners.set(senderId, handler);

    // Cleanup on destroy
    event.sender.once('destroyed', () => clearSubscriber(senderId));

    // If WS is already connected, send gateway.connected immediately
    if (ws && ws.readyState === WebSocket.OPEN) {
      event.reply('julia:event', { type: 'gateway.connected' });
    } else {
      event.reply('julia:event', { type: 'gateway.disconnected' });
    }
  });

  // Voice events from STT → Gateway WS
  ipcMain.on('julia:voice-event', (_event, evt) => {
    if (evt.type === 'client.voice.final') {
      send({ type: 'client.voice.final', content: evt.data?.text || '', session_id: currentSessionId });
    }
  });

  // Renderer can sync active session ID → WS bind
  ipcMain.on('julia:session-bind', (_event, { sessionId }) => {
    if (sessionId) {
      currentSessionId = sessionId;
      send({ type: 'session.bind', session_id: currentSessionId });
    }
  });

  ipcMain.handle('julia:health', () => checkHealth());
}

module.exports = { createWebSocket, checkHealth };
