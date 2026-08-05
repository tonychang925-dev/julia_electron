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

    // ── Verify Chromium AEC actually active ──
    const micTrack = stream.getAudioTracks()[0];
    const settings = micTrack.getSettings();
    console.log('[MIC settings]', JSON.stringify(settings, null, 2));
    if (settings.echoCancellation !== true) {
      console.error('[AEC] Chromium echoCancellation is NOT active! Settings:', settings);
    } else {
      console.log('[AEC] echoCancellation confirmed active');
    }

    const pc = new RTCPeerConnection({ iceServers: [] });

    // ── Remote TTS audio: WebRTC remote track ONLY ──
    pc.ontrack = async (event) => {
      const track = event.track;
      if (track.kind !== 'audio') return;

      this._onTrackCount = (this._onTrackCount ?? 0) + 1;
      console.log('[RTC_RX_AUDIO]', {
        trackId: track.id, readyState: track.readyState, muted: track.muted,
        streamCount: event.streams.length, onTrackCount: this._onTrackCount,
      });

      if (!this._audioEl) {
        this._audioEl = new Audio();
        this._audioEl.autoplay = true;
        this._audioEl.playsInline = true;
        this._audioEl.muted = false;
        this._audioEl.volume = 1;
      }

      // Only rebind if track not already connected
      const currentTracks = this._audioEl.srcObject instanceof MediaStream
        ? this._audioEl.srcObject.getAudioTracks() : [];
      if (!currentTracks.some((t) => t.id === track.id)) {
        const stream = event.streams[0] ?? new MediaStream([track]);
        this._audioEl.srcObject = stream;
      }

      if (this._audioEl.paused) {
        try {
          await this._audioEl.play();
          console.log('[RTC_AUDIO_PLAYING]', track.id);
        } catch (error) {
          console.error('[RTC_AUDIO_PLAY_FAILED]', error);
        }
      }
    };

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    this._stream = stream;

    if (gen !== this._generation) { pc.close(); stream.getTracks().forEach((t) => t.stop()); throw new DOMException('Superseded', 'AbortError'); }
    this._pc = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await _waitForIceGathering(pc);
    if (gen !== this._generation) throw new DOMException('Superseded', 'AbortError');

    // ── Log transceiver table before signaling ──
    console.table(pc.getTransceivers().map((tr) => ({
      mid: tr.mid,
      direction: tr.direction,
      currentDirection: tr.currentDirection,
      sender: tr.sender?.track?.kind ?? null,
      receiver: tr.receiver?.track?.kind ?? null,
      receiverState: tr.receiver?.track?.readyState ?? null,
    })));

    const localDesc = pc.localDescription;
    const result = await API.rtcSignal({
      sdp: localDesc.sdp, type: localDesc.type,
      sessionId: sessionId || 'tony-main',
    });
    if (!result.ok) throw new Error(result.error);

    await pc.setRemoteDescription(new RTCSessionDescription(result.answer));
    await _waitForConnection(pc);
    if (gen !== this._generation) throw new DOMException('Superseded', 'AbortError');

    // ── Log post-connect transceiver state ──
    console.table(pc.getTransceivers().map((tr) => ({
      mid: tr.mid,
      direction: tr.direction,
      currentDirection: tr.currentDirection,
      sender: tr.sender?.track?.kind ?? null,
      receiver: tr.receiver?.track?.kind ?? null,
      receiverState: tr.receiver?.track?.readyState ?? null,
    })));

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
