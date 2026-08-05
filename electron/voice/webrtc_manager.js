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

async function signalOffer(offer) {
  const res = await fetch(`${GATEWAY}/rtc/offer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
  });
  if (!res.ok) throw new Error(`Gateway signal failed: ${res.status}`);
  return await res.json(); // { sdp, type: 'answer' }
}

function registerWebRTC() {
  // Renderer sends offer via IPC → main signals to Gateway → returns answer
  ipcMain.handle('rtc:signal', async (_event, { sdp, type, sessionId }) => {
    try {
      const answer = await signalOffer({ sdp, type, session_id: sessionId || 'tony-main' });
      return { ok: true, answer };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Renderer notifies main of connection state
  ipcMain.on('rtc:state', (_event, state) => {
    // Forward to any renderer subscribers
    _event.sender.send('rtc:state', state);
  });
}

module.exports = { registerWebRTC };
