const API = window.juliaAPI;

const _wait = (pc, event, resolveCheck, timeoutMs) => {
  if (resolveCheck(pc)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let timer = null;
    const handler = () => {
      try {
        if (resolveCheck(pc)) {
          pc.removeEventListener(event, handler);
          if (timer) clearTimeout(timer);
          resolve();
        }
      } catch {}
    };
    pc.addEventListener(event, handler);
    if (timeoutMs) {
      timer = setTimeout(() => {
        pc.removeEventListener(event, handler);
        reject(new Error(`${event} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }
  });
};

const _waitForIceGathering = (pc, timeoutMs = 5000) =>
  _wait(pc, 'icegatheringstatechange', (p) => p.iceGatheringState === 'complete', timeoutMs);

const _waitForConnection = (pc, timeoutMs = 10000) =>
  _wait(pc, 'connectionstatechange', (p) => p.connectionState === 'connected', timeoutMs);

const WebRTCVoice = {
  _pc: null,
  _stream: null,
  _audioEl: null,

  async connect(sessionId) {
    this.disconnect();

    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });

    this._pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this._stream.getTracks().forEach((track) => this._pc.addTrack(track, this._stream));

    this._pc.ontrack = (event) => {
      if (!this._audioEl) { this._audioEl = new Audio(); this._audioEl.autoplay = true; }
      this._audioEl.srcObject = event.streams[0];
    };

    const offer = await this._pc.createOffer();
    await this._pc.setLocalDescription(offer);
    await _waitForIceGathering(this._pc);

    const localDesc = this._pc.localDescription;
    const result = await API.rtcSignal({
      sdp: localDesc.sdp,
      type: localDesc.type,
      sessionId: sessionId || 'tony-main',
    });
    if (!result.ok) throw new Error(result.error);

    await this._pc.setRemoteDescription(new RTCSessionDescription(result.answer));
    await _waitForConnection(this._pc);

    return { connected: true };
  },

  disconnect() {
    if (this._audioEl) { this._audioEl.srcObject = null; this._audioEl.pause(); this._audioEl = null; }
    if (this._stream) { this._stream.getTracks().forEach((t) => t.stop()); this._stream = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
  },
};

export default WebRTCVoice;
