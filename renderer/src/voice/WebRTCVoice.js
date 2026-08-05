const API = window.juliaAPI;

/**
 * WebRTCVoice — getUserMedia with AEC → RTCPeerConnection → Gateway.
 * App in /Applications + mic permission in System Settings needed.
 */
const WebRTCVoice = {
  _pc: null,
  _stream: null,
  _audioEl: null,

  async connect() {
    // 1. Mic with Chromium AEC — macOS shows permission dialog on first call
    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    // 2. Create peer connection
    this._pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // 3. Add mic track
    this._stream.getTracks().forEach((track) => this._pc.addTrack(track, this._stream));

    // 4. Handle remote audio (TTS return)
    this._pc.ontrack = (event) => {
      if (!this._audioEl) {
        this._audioEl = new Audio();
        this._audioEl.autoplay = true;
      }
      this._audioEl.srcObject = event.streams[0];
    };

    // 5. Create offer
    const offer = await this._pc.createOffer();
    await this._pc.setLocalDescription(offer);

    // 6. Signal to Gateway
    const result = await API.rtcSignal({ sdp: offer.sdp, type: offer.type, sessionId: 'tony-main' });
    if (!result.ok) throw new Error(result.error);

    await this._pc.setRemoteDescription(new RTCSessionDescription(result.answer));

    return { connected: true };
  },

  disconnect() {
    if (this._audioEl) { this._audioEl.srcObject = null; this._audioEl = null; }
    if (this._stream) { this._stream.getTracks().forEach((t) => t.stop()); this._stream = null; }
    if (this._pc) { this._pc.close(); this._pc = null; }
  },
};

export default WebRTCVoice;
