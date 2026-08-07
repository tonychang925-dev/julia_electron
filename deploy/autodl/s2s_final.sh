#!/bin/bash
export PATH=/root/miniconda3/bin:$PATH
export HF_ENDPOINT=https://hf-mirror.com
export OPENAI_API_KEY=sk-9c627df8575e4b44822aa8b0bea0f04c

fuser -k 8765/tcp 2>/dev/null
sleep 2
nohup speech-to-speech \
  --ws_host 0.0.0.0 --ws_port 8765 \
  --mode realtime \
  --language zh \
  --stt faster-whisper \
  --faster_whisper_stt_model_name large-v3 \
  --faster_whisper_stt_gen_language zh \
  --tts melo \
  --llm_backend chat-completions \
  --responses_api_base_url http://127.0.0.1:8089/v1 \
  --model_name julia-brain \
  > /tmp/s2s_final.log 2>&1 &
echo "PID=$!"
