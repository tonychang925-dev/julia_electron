"""Deploy ElevenLabs handler to S2S — no pip, no shell escaping issues."""
import os
import shutil

BASE = "/root/miniconda3/lib/python3.10/site-packages/speech_to_speech"

# 1. Copy handler
src = "/root/elevenlabs_handler_final.py"
dst = os.path.join(BASE, "TTS", "elevenlabs_handler.py")
shutil.copy(src, dst)
print("1. Handler deployed:", dst)

# 2. Delete facebookMMS
fb = os.path.join(BASE, "TTS", "facebookmms_handler.py")
if os.path.exists(fb):
    os.remove(fb)
    print("2. facebookMMS deleted:", fb)
else:
    print("2. facebookMMS already gone")

# 3. Patch CLI args
p1 = os.path.join(BASE, "arguments_classes", "module_arguments.py")
with open(p1) as f:
    c = f.read()
old1 = 'Literal["chatTTS", "facebookMMS", "pocket", "kokoro", "qwen3"]'
new1 = 'Literal["chatTTS", "facebookMMS", "pocket", "kokoro", "qwen3", "elevenlabs"]'
if "elevenlabs" not in c:
    c = c.replace(old1, new1)
    with open(p1, "w") as f:
        f.write(c)
    print("3. P1 patched")
else:
    print("3. P1 already patched")

# 4. Patch s2s_pipeline
p2 = os.path.join(BASE, "s2s_pipeline.py")
with open(p2) as f:
    c = f.read()

insert = """    elif module_kwargs.tts == "elevenlabs":
        from speech_to_speech.TTS.elevenlabs_handler import ElevenLabsTTSHandler
        return ElevenLabsTTSHandler(
            stop_event,
            queue_in=lm_response_queue,
            queue_out=send_audio_chunks_queue,
            setup_args=(should_listen,),
            setup_kwargs={
                "api_key": os.environ.get("ELEVENLABS_API_KEY", ""),
                "voice_id": os.environ.get("ELEVENLABS_VOICE_ID", ""),
                "model": "eleven_v3",
            },
        )
"""

old2 = '    else:\n        raise ValueError('
if "elevenlabs" not in c:
    c = c.replace(old2, insert + "\n" + old2)
    with open(p2, "w") as f:
        f.write(c)
    print("4. P2 patched")
else:
    print("4. P2 already patched")

# 5. Clear cache
for root, dirs, files in os.walk(BASE):
    for d in list(dirs):
        if d == "__pycache__":
            import shutil
            shutil.rmtree(os.path.join(root, d))
    for f in files:
        if f.endswith(".pyc"):
            os.remove(os.path.join(root, f))
print("5. Cache cleared")

print("ALL DONE")
