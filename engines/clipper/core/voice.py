import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from openai import OpenAI

from .config import DEFAULT_OPENROUTER_KEY, FFMPEG_PATH

class VoiceSynthesizer:
    """Generates AI voiceovers for Hook Intros and Storyteller narration."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or DEFAULT_OPENROUTER_KEY

    def synthesize(self, text: str, output_path: str, voice: str = "alloy") -> str:
        """Synthesize speech to valid WAV/MP3 using OpenRouter Fish Audio or macOS system voice fallback."""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        codec = ["-c:a", "libmp3lame", "-b:a", "192k"] if output_path.endswith(".mp3") else ["-c:a", "pcm_s16le"]

        # 1. Try OpenRouter Fish Audio if API key is present
        if self.api_key:
            try:
                client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=self.api_key,
                    default_headers={
                        "HTTP-Referer": "https://github.com/mac-opus-clipper",
                        "X-Title": "MacOpus Video Clipper"
                    }
                )
                response = client.audio.speech.create(
                    model="fish-audio/s2.1-pro-free:free",
                    voice=voice,
                    input=text
                )
                raw_data = response.read()
                if len(raw_data) > 1000:
                    with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as tmp:
                        tmp_raw = tmp.name
                        tmp.write(raw_data)

                    cmd = [
                        FFMPEG_PATH, "-y",
                        "-f", "s16le",
                        "-ar", "44100",
                        "-ac", "1",
                        "-i", tmp_raw,
                        *codec,
                        "-ar", "44100",
                        output_path
                    ]
                    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                    if os.path.exists(tmp_raw):
                        os.remove(tmp_raw)
                    return output_path
            except Exception as e:
                print(f"⚠️ [Voice] OpenRouter notice ({e}), using system voice...")

        # 2. High-quality macOS system voice fallback
        return self._synthesize_macos(text, output_path)

    def _synthesize_macos(self, text: str, output_path: str) -> str:
        """Use macOS native speech synthesis."""
        with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as tmp:
            tmp_aiff = tmp.name

        try:
            cmd_say = ["say", "-v", "Daniel", "-r", "185", text, "-o", tmp_aiff]
            res = subprocess.run(cmd_say, capture_output=True)
            if res.returncode != 0:
                subprocess.run(["say", "-r", "185", text, "-o", tmp_aiff], check=True)

            codec = ["-c:a", "libmp3lame", "-b:a", "192k"] if output_path.endswith(".mp3") else ["-c:a", "pcm_s16le"]
            cmd_ffmpeg = [
                FFMPEG_PATH, "-y",
                "-i", tmp_aiff,
                *codec,
                "-ar", "44100",
                output_path
            ]
            subprocess.run(cmd_ffmpeg, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return output_path
        finally:
            if os.path.exists(tmp_aiff):
                os.remove(tmp_aiff)
