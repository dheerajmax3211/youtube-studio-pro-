"""High-performance word-level speech transcription using sherpa-onnx & Parakeet TDT.
Runs locally at 10x-20x real-time on CPU / Apple Silicon.
Also computes per-second RMS loudness for audio excitement detection.
"""
import os
import json
import time
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import soundfile as sf

from .config import PROJECTS_DIR, ASR_MODEL_DIR, FFMPEG_PATH, WHISPER_CMD

class Transcriber:
    """Fast local transcriber with exact word-level timestamps and audio loudness marks."""

    def __init__(self, project_id: str, model_dir: Optional[Path] = None):
        self.project_id = project_id
        self.project_dir = PROJECTS_DIR / project_id
        self.audio_path = self.project_dir / "audio.wav"
        self.transcript_path = self.project_dir / "transcript.json"
        self.model_dir = model_dir or ASR_MODEL_DIR
        self._recognizer = None

    def _get_recognizer(self):
        if self._recognizer is not None:
            return self._recognizer

        import sherpa_onnx
        d = self.model_dir
        if not d.exists() or not (d / "tokens.txt").exists():
            raise FileNotFoundError(f"ASR model not found at {d}")

        encoder = str(d / "encoder.int8.onnx")
        decoder = str(d / "decoder.int8.onnx")
        joiner = str(d / "joiner.int8.onnx")
        tokens = str(d / "tokens.txt")

        cpus = os.cpu_count() or 4
        threads = 4 if cpus >= 8 else max(2, cpus - 2)

        self._recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=encoder,
            decoder=decoder,
            joiner=joiner,
            tokens=tokens,
            num_threads=threads,
            sample_rate=16000,
            feature_dim=80,
            decoding_method="greedy_search",
            model_type="nemo_transducer",
            provider="cpu"
        )
        return self._recognizer

    def _audio_chunks(self, audio: np.ndarray, lo: float = 12.0, hi: float = 24.0):
        """Split at quietest points (RMS energy minima) between lo and hi seconds so words are never cut."""
        sr, hop = 16000, 800  # 50ms frames
        n = len(audio)
        frames = n // hop
        if frames == 0:
            return
        x = audio[: frames * hop].reshape(frames, hop).astype(np.float32)
        rms = np.sqrt((x ** 2).mean(axis=1))
        pos = 0
        while pos < n:
            if n - pos <= hi * sr:
                yield pos, n
                return
            a, b = (pos + int(lo * sr)) // hop, (pos + int(hi * sr)) // hop
            cut = (a + int(np.argmin(rms[a:b]))) * hop + hop // 2
            yield pos, cut
            pos = cut

    def _extract_words_from_tokens(self, tokens: List[str], timestamps: List[float], a: int, b: int) -> List[Dict[str, Any]]:
        out = []
        off = a / 16000.0
        seg_end = b / 16000.0
        cur, gap = None, False
        for tok, t in zip(tokens, timestamps):
            new_word = tok.startswith((" ", "▁")) or gap
            piece = tok.replace("▁", " ").strip()
            if not piece:
                gap = True
                continue
            gap = False
            is_punct = all(not c.isalnum() for c in piece)
            if cur is None or (new_word and not is_punct):
                if cur:
                    out.append(cur)
                cur = {"w": piece, "s": round(off + t, 2), "e": round(off + t + 0.12, 2)}
            else:
                cur["w"] += piece
                cur["e"] = round(off + t + 0.12, 2)
        if cur:
            cur["e"] = min(cur["e"], round(seg_end, 2))
            out.append(cur)
        return out

    def compute_loudness_db(self, audio: np.ndarray) -> np.ndarray:
        """Compute RMS level in dB for each 1-second block of 16kHz audio."""
        n = len(audio) // 16000
        if n == 0:
            return np.zeros(1, dtype=np.float32)
        x = audio[: n * 16000].reshape(n, 16000).astype(np.float32) / 32768.0
        rms = np.sqrt((x ** 2).mean(axis=1) + 1e-10)
        return (20 * np.log10(rms)).astype(np.float32)

    def transcribe(self, force: bool = False, on_progress: Optional[Any] = None) -> Dict[str, Any]:
        """Transcribe audio into word timestamps + loudness dB vector."""
        if self.transcript_path.exists() and not force:
            with open(self.transcript_path, "r", encoding="utf-8") as f:
                return json.load(f)

        if not self.audio_path.exists():
            raise FileNotFoundError(f"Audio file not found at {self.audio_path}")

        print(f"🎙️ [Transcriber] Reading 16kHz audio from {self.audio_path.name}...")
        audio_data, sr = sf.read(str(self.audio_path), dtype="int16")
        if sr != 16000:
            # Resample via ffmpeg if not 16k
            tmp_wav = self.project_dir / "resampled_16k.wav"
            subprocess.run([
                FFMPEG_PATH, "-y", "-i", str(self.audio_path),
                "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(tmp_wav)
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            audio_data, sr = sf.read(str(tmp_wav), dtype="int16")
            tmp_wav.unlink(missing_ok=True)

        loudness_db = self.compute_loudness_db(audio_data)

        # Try sherpa-onnx first
        words = []
        try:
            rec = self._get_recognizer()
            chunks = list(self._audio_chunks(audio_data))
            total_chunks = len(chunks)

            for idx, (a, b) in enumerate(chunks):
                seg = audio_data[a:b].astype(np.float32) / 32768.0
                if len(seg) < 4800 or float(np.sqrt((seg ** 2).mean())) < 0.003:
                    continue  # Silence

                stream = rec.create_stream()
                stream.accept_waveform(16000, seg)
                rec.decode_stream(stream)

                tokens = list(stream.result.tokens)
                timestamps = [float(t) for t in stream.result.timestamps]
                piece_words = self._extract_words_from_tokens(tokens, timestamps, a, b)
                for w in piece_words:
                    if words and words[-1]["w"] == w["w"] and words[-1]["s"] == w["s"]:
                        continue
                    words.append(w)

                if on_progress:
                    on_progress((idx + 1) / max(1, total_chunks))

            # Snap word ends
            for i, w in enumerate(words):
                nxt = words[i + 1]["s"] if i + 1 < len(words) else w["e"] + 0.4
                w["e"] = round(max(w["s"] + 0.08, min(nxt, max(w["e"], w["s"] + 0.6))), 2)

        except Exception as e:
            print(f"⚠️ [Transcriber] sherpa-onnx fallback due to: {e}. Attempting whisper...")
            words = self._transcribe_whisper_fallback()

        result = {
            "project_id": self.project_id,
            "duration": round(len(audio_data) / 16000.0, 2),
            "words": words,
            "loudness_db": loudness_db.tolist() if isinstance(loudness_db, np.ndarray) else []
        }

        with open(self.transcript_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)

        return result

    def _transcribe_whisper_fallback(self) -> List[Dict[str, Any]]:
        """Fallback to whisper-ctranslate2 if available."""
        cmd = [
            WHISPER_CMD,
            str(self.audio_path),
            "--model", "base",
            "--output_dir", str(self.project_dir),
            "--output_format", "json",
            "--word_timestamps", "True"
        ]
        subprocess.run(cmd, check=True)
        raw_json_path = self.project_dir / "audio.json"
        if not raw_json_path.exists():
            candidates = [c for c in self.project_dir.glob("*.json") if c.name not in ["metadata.json", "transcript.json"]]
            if candidates:
                raw_json_path = candidates[0]
            else:
                return []

        with open(raw_json_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        words = []
        for seg in raw_data.get("segments", []):
            for w in seg.get("words", []):
                cleaned = w.get("word", "").strip()
                if cleaned:
                    words.append({
                        "w": cleaned,
                        "s": round(w.get("start", 0.0), 2),
                        "e": round(w.get("end", 0.0), 2)
                    })
        return words
