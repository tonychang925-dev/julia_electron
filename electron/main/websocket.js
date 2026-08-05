const { ipcMain } = require('electron');
const http = require('http');

const JULIA_API = 'http://127.0.0.1:8003/chat';

/**
 * Send a chat message to Julia Core via HTTP POST.
 * Returns streaming response chunks to the renderer via IPC.
 *
 * Phase E0 uses HTTP + polling for simplicity.
 * Phase E1 upgrades to WebSocket for native streaming.
 */
function sendChatMessage(text, event) {
  const postData = JSON.stringify({ text });
  const options = {
    hostname: '127.0.0.1',
    port: 8003,
    path: '/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
    timeout: 30000,
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk.toString();
    });
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        event.reply('julia:response', {
          text: data.reply || '',
          intent: data.intent || 'chat',
          timestamp: Date.now(),
        });
      } catch (err) {
        event.reply('julia:error', { message: 'Invalid response from Julia Core' });
      }
    });
  });

  req.on('error', (err) => {
    event.reply('julia:error', {
      message: `Julia Core not reachable: ${err.message}`,
    });
  });

  req.on('timeout', () => {
    req.destroy();
    event.reply('julia:error', { message: 'Request timed out' });
  });

  req.write(postData);
  req.end();
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8003/health', (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk.toString(); });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ online: data.status === 'ok', persona: data.persona || 'Julia' });
        } catch {
          resolve({ online: false, persona: 'Julia' });
        }
      });
    });
    req.on('error', () => resolve({ online: false, persona: 'Julia' }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ online: false, persona: 'Julia' }); });
  });
}

function createWebSocket() {
  // Phase E0: register IPC handlers for chat
  ipcMain.on('julia:send', (event, { text }) => {
    event.reply('julia:status', { status: 'thinking' });
    sendChatMessage(text, event);
  });

  ipcMain.handle('julia:health', async () => {
    return await checkHealth();
  });
}

module.exports = { createWebSocket, checkHealth };
