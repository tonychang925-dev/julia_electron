const { ipcMain } = require('electron');

/**
 * WebRTC Manager — E3.1 Media Plane.
 *
 * The RENDERER process does getUserMedia + RTCPeerConnection.
 * The MAIN process handles signaling to Gateway (HTTP REST).
 *
 * This module registers IPC handlers. Renderer calls juliaAPI.rtcConnect().
 */

const GATEWAY = 'http://127.0.0.1:8100';

async function signalOffer({ sdp, type, sessionId }) {
  const res = await fetch(`${GATEWAY}/rtc/offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdp, type, session_id: sessionId || 'tony-main' }),
  });
  if (!res.ok) throw new Error(`Gateway signal failed: ${res.status}`);
  return res.json();
}

function registerWebRTC() {
  ipcMain.handle('rtc:signal', async (_event, { sdp, type, sessionId }) => {
    try {
      const answer = await signalOffer({ sdp, type, sessionId });
      return { ok: true, answer };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

module.exports = { registerWebRTC };
