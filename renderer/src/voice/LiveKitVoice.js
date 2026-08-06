/** V2-1 LiveKit Voice Client — mature WebRTC via livekit-client SDK.

 *  Electron mic → LiveKit → Agent → remote audio → Electron speaker.
 *  No RTCPeerConnection, no SDP, no /rtc/offer, no custom audio pipeline.
 */
import { Room, RoomEvent } from 'livekit-client';

const ROOM = 'julia-voice-v2-1';
const IDENTITY = 'tony-electron';

const log = (tag, detail) => console.log(`[${tag}]`, detail || '');

const LiveKitVoice = {
  _room: null,
  _state: 'disconnected',
  _onState: null,
  _audioElements: null,

  async connect({ onState } = {}) {
    this._onState = onState;
    this._setState('connecting');
    log('LK_ROOM_CONNECTING');

    try {
      const resp = await fetch(`http://127.0.0.1:8100/livekit/token?room=${ROOM}&identity=${IDENTITY}`);
      const { url, token } = await resp.json();
      if (!token) throw new Error('No token from Gateway');

      const room = new Room();
      this._room = room;
      this._audioElements = new Map();

      room.on(RoomEvent.Connected, () => {
        log('LK_ROOM_CONNECTED');
        this._setState('connected');
      });

      room.on(RoomEvent.Disconnected, () => {
        log('LK_ROOM_DISCONNECTED');
        this._setState('disconnected');
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        log('LK_AUDIO_PLAYBACK_STATUS', {
          canPlaybackAudio: room.canPlaybackAudio,
        });
      });

      room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
        if (track.kind !== 'audio') return;

        const sid = pub.trackSid || track.sid;
        log('LK_AUDIO_TRACK_SUBSCRIBED', { participant: participant.identity, sid });

        const el = track.attach();
        el.muted = false;
        el.autoplay = true;
        el.playsInline = true;
        el.setAttribute('data-track-sid', sid);

        el.onplaying = () => log('LK_AUDIO_PLAYING', sid);
        el.onpause = () => log('LK_AUDIO_PAUSED', sid);
        el.onerror = () => log('LK_AUDIO_ELEMENT_ERROR', el.error);

        el.play()
          .then(() => log('LK_AUDIO_PLAY_OK', sid))
          .catch((e) => {
            log('LK_AUDIO_PLAY_BLOCKED', {
              name: e?.name, message: e?.message,
              canPlaybackAudio: room.canPlaybackAudio,
            });
          });

        document.body.appendChild(el);
        this._audioElements.set(sid, { track, element: el });
        log('LK_AUDIO_ATTACHED', {
          sid,
          canPlaybackAudio: room.canPlaybackAudio,
        });
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, _pub) => {
        const sid = track.sid;
        const item = this._audioElements?.get(sid);
        if (item) {
          try { item.track.detach(item.element); } catch {}
          item.element.remove();
          this._audioElements.delete(sid);
          log('LK_AUDIO_DETACHED', sid);
        }
      });

      await room.connect(url, token);

      await room.localParticipant.setMicrophoneEnabled(true);
      log('LK_MIC_ENABLED');
      this._setState('live');

    } catch (e) {
      log('LK_ERROR', e.message);
      this._setState('error');
    }
  },

  async startAudio() {
    if (!this._room) return;
    await this._room.startAudio();
    log('LK_AUDIO_START_OK', {
      canPlaybackAudio: this._room.canPlaybackAudio,
    });
  },

  disconnect() {
    if (this._audioElements) {
      this._audioElements.forEach(({ track, element }) => {
        try { track.detach(element); } catch {}
        element.remove();
      });
      this._audioElements.clear();
    }
    if (this._room) {
      this._room.disconnect();
      this._room = null;
    }
    this._setState('disconnected');
  },

  _setState(state) {
    this._state = state;
    if (this._onState) this._onState(state);
  },

  get state() { return this._state; },
  get isLive() { return this._state === 'live'; },
};

export default LiveKitVoice;
