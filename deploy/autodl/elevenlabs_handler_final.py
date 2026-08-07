"""
ElevenLabs TTS Handler for HF speech-to-speech v0.2.12.
Contract:
  - Input: TTSInput(text) or EndOfResponse
  - Output: np.int16 PCM16 mono @ 16000 Hz, or AUDIO_RESPONSE_DONE
  - ElevenLabs returns pcm_16000 → yield int16 directly

Fixes (P0 audit):
  P0-1: Use ElevenLabs pcm_16000 — no resampling needed. Native 16kHz pipeline.
  P0-2: Yield AUDIO_RESPONSE_DONE on EndOfResponse
  P0-3: Installed in S2S fork directory, not patched into site-packages
"""
from __future__ import annotations

import asyncio
import logging
import os
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
        output_format: str = "pcm_16000",
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

        self._loop = asyncio.new_event_loop()

    def process(self, item: TTSIn) -> Iterator[TTSOut]:
        # P0-2: EndOfResponse must yield AUDIO_RESPONSE_DONE
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

        async def _fetch_raw() -> bytes:
            timeout = aiohttp.ClientTimeout(total=60, sock_connect=15)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                headers = {
                    "xi-api-key": self._api_key,
                    "Content-Type": "application/json",
                }
                async with session.post(url, json=payload, headers=headers) as resp:
                    resp.raise_for_status()
                    raw = b""
                    async for chunk, _ in resp.content.iter_chunks():
                        raw += chunk
                    return raw

        try:
            raw = self._loop.run_until_complete(_fetch_raw())
            # ElevenLabs pcm_16000 → s16le PCM → yield as int16 directly
            pcm = np.frombuffer(raw, dtype=np.int16).copy()
            yield pcm

        except Exception as e:
            logger.error("ElevenLabs TTS failed: %s", e)
            # Sentence failed — no audio for this chunk.
            # DONE is only yielded by EndOfResponse (one authoritative lifecycle close).

    def cleanup(self) -> None:
        if self._loop:
            self._loop.close()
            self._loop = None
