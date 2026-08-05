const API = window.juliaAPI;

const _wait = (pc, event, resolveCheck, rejectCheck, timeoutMs) => {
  if (resolveCheck(pc)) return Promise.resolve();
  if (rejectCheck?.(pc)) return Promise.reject(new Error(`${pc.connectionState || pc.iceGatheringState}`));
  return new Promise((resolve, reject) => {
    let timer = null; let settled = false;
    const cleanup = () => { pc.removeEventListener(event, handler); if (timer) clearTimeout(timer); };
    const handler = () => {
      if (settled) return;
      if (resolveCheck(pc)) { settled = true; cleanup(); resolve(); return; }
      if (rejectCheck?.(pc)) { settled = true; cleanup(); reject(new Error(pc.connectionState)); }
    };
    pc.addEventListener(event, handler);
    timer = setTimeout(() => { if (settled) return; settled = true; cleanup(); reject(new Error(`${event} timeout`)); }, timeoutMs);
  });
};

const _waitForIceGathering = (pc, timeoutMs = 5000) =>
  _wait(pc, 'icegatheringstatechange', (p) => p.iceGatheringState === 'complete', null, timeoutMs);

const _waitForConnection = (pc, timeoutMs = 10000) =>
  _wait(pc, 'connectionstatechange',
    (p) => p.connectionState === 'connected',
    (p) => ['failed', 'closed'].includes(p.connectionState),
    timeoutMs);

const WebRTCVoice = {
  _pc: null,
  _stream: null,
  _audioEl: null,
  _generation: 0,

  async connect(sessionId) {
    const gen = ++this._generation;
    _cleanupLocal(this);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    if (gen !== this._generation) { stream.getTracks().forEach((t) => t.stop()); throw new DOMException('Superseded', 'AbortError'); }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.ontrack = (event) => {
      if (!this._audioEl) { this._audioEl = new Audio(); this._audioEl.autoplay = true; }
      this._audioEl.srcObject = event.streams[0];
    };

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Local refs only if still current generation
    if (gen !== this._generation) { pc.close(); stream.getTracks().forEach((t) => t.stop()); throw new DOMException('Superseded', 'AbortError'); }
    this._stream = stream;
    this._pc = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await _waitForIceGathering(pc);
    if (gen !== this._generation) throw new DOMException('Superseded', 'AbortError');

    const localDesc = pc.localDescription;
    const result = await API.rtcSignal({
      sdp: localDesc.sdp, type: localDesc.type,
      sessionId: sessionId || 'tony-main',
    });
    if (!result.ok) throw new Error(result.error);

    await pc.setRemoteDescription(new RTCSessionDescription(result.answer));
    await _waitForConnection(pc);
    if (gen !== this._generation) throw new DOMException('Superseded', 'AbortError');

    return { connected: true };
  },

  disconnect() {
    this._generation += 1;
    _cleanupLocal(this);
  },
};

const _cleanupLocal = (self) => {
  if (self._audioEl) { self._audioEl.srcObject = null; self._audioEl.pause(); self._audioEl = null; }
  if (self._stream) { self._stream.getTracks().forEach((t) => t.stop()); self._stream = null; }
  if (self._pc) { self._pc.close(); self._pc = null; }
};

export default WebRTCVoice;
