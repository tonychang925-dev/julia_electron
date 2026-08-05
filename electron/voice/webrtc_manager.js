const { ipcMain } = require('electron');

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

function normalizeAnswer(payload) {
  // Gateway may wrap answer in {answer: {...}} or return flat {sdp, type}
  const answer = payload?.answer ?? payload;

  if (!answer || typeof answer.sdp !== 'string') {
    throw new Error(`Gateway returned invalid RTC SDP: ${JSON.stringify(payload)}`);
  }

  if (answer.type !== 'answer') {
    throw new Error(`Gateway returned invalid RTC type: ${JSON.stringify(answer.type)} (expected "answer")`);
  }

  return { sdp: answer.sdp, type: answer.type };
}

function registerWebRTC() {
  ipcMain.handle('rtc:signal', async (_event, { sdp, type, sessionId }) => {
    try {
      const payload = await signalOffer({ sdp, type, sessionId });
      console.log('[RTC] raw Gateway answer:', JSON.stringify(payload, null, 2));
      const answer = normalizeAnswer(payload);
      return { ok: true, answer };
    } catch (e) {
      console.error('[RTC] signaling failed:', e);
      return { ok: false, error: e?.message || String(e) };
    }
  });
}

module.exports = { registerWebRTC };
