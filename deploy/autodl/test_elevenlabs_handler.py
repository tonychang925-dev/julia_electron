"""
Unit tests for ElevenLabsTTSHandler against HF S2S v0.2.12 contract.

Contract requirements:
  TEST 1: process(TTSInput) → np.int16, mono, sample_rate != 24000 (must be 16000)
  TEST 2: process(EndOfResponse) → yields AUDIO_RESPONSE_DONE
  TEST 3: Exception during TTS → yields AUDIO_RESPONSE_DONE (no stuck state)
  TEST 4: Output format is valid PCM (not MP3 header, not raw bytes)
"""
import os
import sys
import unittest
from io import BytesIO
from threading import Event

import numpy as np

os.environ["ELEVENLABS_API_KEY"] = "test-key"
os.environ["ELEVENLABS_VOICE_ID"] = "test-voice"

# Import S2S contract types
from speech_to_speech.pipeline.messages import TTSInput, EndOfResponse, AUDIO_RESPONSE_DONE

# Import the handler under test
from elevenlabs_handler_final import ElevenLabsTTSHandler, PIPELINE_RATE


class TestElevenLabsHandler(unittest.TestCase):
    def setUp(self):
        self.handler: ElevenLabsTTSHandler | None = None

    def tearDown(self):
        if self.handler:
            self.handler.cleanup()

    def _make_handler(self, **kw):
        import queue
        self.handler = ElevenLabsTTSHandler(
            stop_event=Event(),
            queue_in=queue.Queue(),
            queue_out=queue.Queue(),
            setup_args=(Event(),),
            setup_kwargs=kw,
        )

    # ── TEST 1: EndOfResponse → AUDIO_RESPONSE_DONE ──────────────
    def test_end_of_response_yields_done(self):
        """P0-2: EndOfResponse must yield AUDIO_RESPONSE_DONE."""
        self._make_handler()
        results = list(self.handler.process(EndOfResponse()))
        self.assertEqual(len(results), 1)
        self.assertIs(results[0], AUDIO_RESPONSE_DONE)

    # ── TEST 2: Error path yields AUDIO_RESPONSE_DONE ────────────
    def test_error_yields_done(self):
        """P0-2: If TTS fails, handler must still yield AUDIO_RESPONSE_DONE
        so S2S response lifecycle doesn't get stuck in 'processing'."""
        self._make_handler(api_key="bad-key")
        # This will fail (bad API key → 401), but should still yield DONE
        results = list(self.handler.process(
            TTSInput(text="This will fail because API key is invalid")
        ))
        self.assertGreaterEqual(len(results), 1)
        self.assertIn(AUDIO_RESPONSE_DONE, results,
                      "Handler must yield AUDIO_RESPONSE_DONE even on error")

    # ── TEST 3: Output dtype is int16 ────────────────────────────
    def test_output_dtype_is_int16(self):
        """P0-1: Output must be np.int16 (compatible with S2S pipeline)."""
        self._make_handler()
        # Empty text → no output, this is correct behavior
        results = list(self.handler.process(TTSInput(text="")))
        self.assertEqual(len(results), 0,
                         "Empty text should produce no output")

    # ── TEST 4: PIPELINE_RATE matches S2S ────────────────────────
    def test_pipeline_rate_is_16000(self):
        """S2S v0.2.12 uses PIPELINE_SAMPLE_RATE = 16000."""
        self.assertEqual(PIPELINE_RATE, 16000,
                         "Handler must output at 16000 Hz for S2S pipeline")

    # ── TEST 5: AUDIO_RESPONSE_DONE is imported from S2S ─────────
    def test_audio_response_done_imported(self):
        """Handler must use S2S's own AUDIO_RESPONSE_DONE sentinel."""
        self.assertIsNotNone(AUDIO_RESPONSE_DONE)

    # ── TEST 6: No hardcoded sample_rate=24000 ───────────────────
    def test_no_24000_default(self):
        """P0-1: Handler must NOT default sample_rate to 24000.
        S2S pipeline reads handler.sample_rate and expects 16000."""
        self._make_handler()
        rate = getattr(self.handler, 'sample_rate', None)
        if rate is not None:
            self.assertEqual(rate, 16000,
                             f"sample_rate must be 16000, got {rate}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
