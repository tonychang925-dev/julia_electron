"""
ElevenLabs TTS Handler for HF speech-to-speech v0.2.12.
Contract:
  - Input: TTSInput(text) or EndOfResponse
  - Output: np.int16 PCM16 mono @ 16000 Hz (S2S pipeline rate), or AUDIO_RESPONSE_DONE
  - ElevenLabs returns pcm_24000 → linear resample 24k→16k → yield int16

Fixes (P0 audit v3):
  P0-1: Validate PCM response (content-type, magic bytes, alignment, size)
  P0-2: Runtime SHA verification — log imported file path
  P0-4: PCM diagnostics — log RMS, peak, duration; save /tmp/el_debug.wav on first call
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import wave
from threading import Event
from typing import Iterator

import aiohttp
import numpy as np

from speech_to_speech.baseHandler import BaseHandler
from speech_to_speech.pipeline.handler_types import TTSIn, TTSOut
from speech_to_speech.pipeline.messages import AUDIO_RESPONSE_DONE, EndOfResponse

logger = logging.getLogger(__name__)
API_BASE = "https://api.elevenlabs.io/v1"

# S2S internal pipeline sample rate (must match HF server PIPELINE_SAMPLE_RATE)
PIPELINE_RATE = 16000

# P0-2: SHA of this file at import time — visible in S2S startup log
try:
    with open(__file__, "rb") as _f:
        _sha = hashlib.sha256(_f.read()).hexdigest()[:16]
except Exception:
    _sha = "unknown"
logger.info("ElevenLabsHandler loaded from %s SHA=%s", __file__, _sha)


class ElevenLabsTTSHandler(BaseHandler[TTSIn, TTSOut]):
    _loop: asyncio.AbstractEventLoop | None = None

    def setup(
        self, should_listen: Event, *,
        api_key: str = "",
        voice_id: str = "",
        model: str = "eleven_v3",
        stability: float = 0.3,
        similarity_boost: float = 0.8,
        style: float = 0.6,
        output_format: str = "pcm_24000",
        cancel_scope = None,
        speculative_turns = None,
    ) -> None:
        self._api_key = api_key or os.environ.get("ELEVENLABS_API_KEY", "")
        self._voice_id = voice_id or os.environ.get("ELEVENLABS_VOICE_ID", "")
        self._model = model
        self._stability = stability
        self._similarity_boost = similarity_boost
        self._style = style
        self._output_format = output_format
        self.cancel_scope = cancel_scope
        self.speculative_turns = speculative_turns

        if not self._api_key:
            raise ValueError("ElevenLabs API key required")
        if not self._voice_id:
            raise ValueError("ElevenLabs voice ID required")

        self._debug_saved = False
        self._loop = asyncio.new_event_loop()

    def process(self, item: TTSIn) -> Iterator[TTSOut]:
        if isinstance(item, EndOfResponse):
            yield AUDIO_RESPONSE_DONE
            return

        text = item.text.strip()
        if not text:
            return

        url = (
            f"{API_BASE}/text-to-speech/{self._voice_id}/stream"
            f"?output_format={self._output_format}"
        )
        payload = {
            "text": text,
            "model_id": self._model,
            "voice_settings": {
                "stability": self._stability,
                "similarity_boost": self._similarity_boost,
                "style": self._style,
                "use_speaker_boost": True,
            },
        }

        async def _fetch_raw() -> tuple[bytes, str | None, int]:
            timeout = aiohttp.ClientTimeout(total=60, sock_connect=15)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                headers = {
                    "xi-api-key": self._api_key,
                    "Content-Type": "application/json",
                }
                async with session.post(url, json=payload, headers=headers) as resp:
                    resp.raise_for_status()
                    ct = resp.headers.get("Content-Type", "")
                    rid = resp.headers.get("request-id", "")
                    raw = b""
                    async for chunk, _ in resp.content.iter_chunks():
                        raw += chunk
                    return raw, ct, resp.status

        try:
            raw, content_type, status = self._loop.run_until_complete(_fetch_raw())

            # P0-1: Validate response is actually PCM, not MP3/WAV/JSON/HTML
            logger.info(
                "EL response status=%s content_type=%s bytes=%d",
                status, content_type, len(raw),
            )

            if len(raw) == 0:
                logger.error("ElevenLabs returned empty body")
                return

            if len(raw) % 2 != 0:
                logger.error("ElevenLabs PCM unaligned: %d bytes", len(raw))
                return

            if raw[:3] == b"ID3" or raw[:4] == b"RIFF":
                logger.error("ElevenLabs returned encoded audio (not raw PCM): %r", raw[:16])
                return

            if raw[:1] == b"{" or raw[:1] == b"<":
                logger.error("ElevenLabs returned text (JSON/HTML) instead of PCM: %r", raw[:64])
                return

            # P0-4: PCM diagnostics
            pcm_24k = np.frombuffer(raw, dtype="<i2").copy()
            rms_24k = float(np.sqrt(np.mean(pcm_24k.astype(np.float64) ** 2)))
            peak_24k = int(np.max(np.abs(pcm_24k)))
            dur_24k = len(pcm_24k) / 24000.0
            logger.info(
                "EL_PCM_24k samples=%d duration=%.2fs rms=%.0f peak=%d",
                len(pcm_24k), dur_24k, rms_24k, peak_24k,
            )

            # Resample 24k→16k for S2S pipeline
            samples_24k_f = pcm_24k.astype(np.float32) / 32768.0
            n_out = int(len(samples_24k_f) * 16000 / 24000)
            indices = np.linspace(0, len(samples_24k_f) - 1, n_out)
            floor = np.floor(indices).astype(int)
            ceil = np.clip(floor + 1, 0, len(samples_24k_f) - 1)
            frac = (indices - floor).astype(np.float32)
            resampled = samples_24k_f[floor] * (1.0 - frac) + samples_24k_f[ceil] * frac
            pcm_16k = np.clip(resampled * 32767, -32768, 32767).astype(np.int16)

            rms_16k = float(np.sqrt(np.mean(pcm_16k.astype(np.float64) ** 2)))
            logger.info("EL_PCM_16k samples=%d rms=%.0f", len(pcm_16k), rms_16k)

            # P0-4: Save debug WAV on first call
            if not self._debug_saved:
                self._debug_saved = True
                try:
                    buf = __import__("io").BytesIO()
                    with wave.open(buf, "wb") as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(16000)
                        wf.writeframes(pcm_16k.tobytes())
                    with open("/tmp/el_handler_debug.wav", "wb") as f:
                        f.write(buf.getvalue())
                    logger.info("EL debug WAV saved to /tmp/el_handler_debug.wav")
                except Exception as e:
                    logger.warning("Failed to save debug WAV: %s", e)

            yield pcm_16k

        except Exception as e:
            logger.error("ElevenLabs TTS failed: %s", e)
            # Sentence failed — no audio. DONE only from EndOfResponse.

    def cleanup(self) -> None:
        if self._loop:
            self._loop.close()
            self._loop = None
