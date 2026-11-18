"""Visual analysis: what actually happens on screen, not just what is said.

Samples a frame every few seconds, sends them in batches to the vision model
(Gemini 2.5 Flash by default), and gets back a short description of each frame plus an
"action" score (0-10: falls, wins, reveals, big reactions score high). The result is a
visual timeline that is merged with the transcript, so clip picking and review can see
payoffs that are never spoken ("she makes it across", "he falls in the water").

Cached per project in visual.json. If no vision-capable provider is available, it
returns an empty timeline and the rest of the pipeline still works from speech alone.
"""
import base64
import json
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from .ai_client import PROVIDERS, parse_json_response
from .config import FFMPEG_PATH

BATCH = 24
VISION_PROMPT = """These are frames from one video, in order. Each image is preceded by its timestamp in seconds.
For EVERY frame return a short factual description (max 18 words) of what is visibly happening: who, doing what, and the outcome if visible (e.g. "woman reaches end of narrow beam, arms raised, crowd cheering"). Include any big on-screen text or numbers.
Also rate "action" 0-10: how much a viewer would care about this exact moment (10 = a win, fall, reveal, shock or huge reaction; 0 = static talking or b-roll).
Return JSON: {"frames": [{"t": 12.0, "desc": "...", "action": 3}]}"""


def sample_frames(video_path: str, out_dir: Path, step: float) -> List[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    tail = ["-i", video_path, "-an", "-vf", f"fps=1/{step},scale=448:-2", "-q:v", "5", str(out_dir / "f_%05d.jpg")]
    p = subprocess.run([FFMPEG_PATH, "-y", "-v", "error", "-hwaccel", "videotoolbox", *tail], capture_output=True)
    if p.returncode != 0:  # codec not supported by hardware decoder
        subprocess.run([FFMPEG_PATH, "-y", "-v", "error", "-threads", "0", *tail], check=True, capture_output=True)
    return sorted(out_dir.glob("f_*.jpg"))


def frame_at(video_path: str, t: float, out: Path) -> Optional[Path]:
    p = subprocess.run([FFMPEG_PATH, "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", video_path, "-vframes", "1",
                        "-vf", "scale=448:-2", "-q:v", "5", str(out)], capture_output=True)
    return out if p.returncode == 0 and out.exists() else None


def _b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


class VisionClient:
    """Minimal multimodal chat call for OpenAI-compatible providers (OpenRouter, OpenAI) and Gemini."""

    def __init__(self, provider: str, api_key: Optional[str], model: str):
        self.provider = provider
        self.api_key = api_key or ""
        self.model = model
        info = PROVIDERS.get(provider, {})
        self.proto = info.get("proto", "")
        self.base_url = info.get("base_url", "").rstrip("/")

    @property
    def available(self) -> bool:
        return bool(self.api_key) and self.provider in ("openrouter", "openai", "gemini")

    def ask(self, prompt: str, images: List[tuple], timeout: float = 180.0) -> Any:
        """images: [(label, Path)]. Returns parsed JSON."""
        if self.proto == "gemini":
            parts = [{"text": prompt}]
            for label, path in images:
                parts += [{"text": label}, {"inline_data": {"mime_type": "image/jpeg", "data": _b64(path)}}]
            r = httpx.post(f"{self.base_url}/{self.model}:generateContent?key={self.api_key}",
                           json={"contents": [{"parts": parts}],
                                 "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}},
                           timeout=timeout)
            r.raise_for_status()
            return parse_json_response(r.json()["candidates"][0]["content"]["parts"][0]["text"])

        content = [{"type": "text", "text": prompt}]
        for label, path in images:
            content += [{"type": "text", "text": label},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{_b64(path)}"}}]
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        if self.provider == "openrouter":
            headers["X-Title"] = "YouTube Studio Pro"
        r = httpx.post(f"{self.base_url}/chat/completions", headers=headers, timeout=timeout, json={
            "model": self.model, "temperature": 0.2, "response_format": {"type": "json_object"},
            "messages": [{"role": "user", "content": content}],
        })
        r.raise_for_status()
        return parse_json_response(r.json()["choices"][0]["message"]["content"])


class VideoAnalyzer:
    def __init__(self, project_dir: Path, video_path: str, client: VisionClient):
        self.project_dir = project_dir
        self.video_path = video_path
        self.client = client
        self.cache = project_dir / "visual.json"

    def analyze(self, duration: float) -> List[Dict[str, Any]]:
        if self.cache.exists():
            try:
                return json.loads(self.cache.read_text())["frames"]
            except Exception:
                pass
        if not self.client.available:
            print("ℹ️ [Visual] No vision-capable provider; clip picking will use speech only.", flush=True)
            return []

        step = max(4.0, duration / 360.0)  # ~360 frames max, every 4 s for short videos
        with tempfile.TemporaryDirectory() as tmp:
            paths = sample_frames(self.video_path, Path(tmp), step)
            items = [(round(i * step, 1), p) for i, p in enumerate(paths)]
            batches = [items[i:i + BATCH] for i in range(0, len(items), BATCH)]
            print(f"👁️ [Visual] Analysing {len(items)} frames (every {step:.0f}s) in {len(batches)} batches...", flush=True)

            def run(batch):
                for attempt in range(2):
                    try:
                        res = self.client.ask(VISION_PROMPT, [(f"t={t}", p) for t, p in batch])
                        frames = res.get("frames", res) if isinstance(res, dict) else res
                        return [f for f in frames if isinstance(f, dict) and "t" in f]
                    except Exception as e:
                        err = e
                print(f"⚠️ [Visual] batch at {batch[0][0]}s failed ({err})", flush=True)
                return []

            with ThreadPoolExecutor(max_workers=4) as pool:
                results = list(pool.map(run, batches))

        frames = sorted(
            ({"t": float(f["t"]), "desc": str(f.get("desc", ""))[:160], "action": int(f.get("action", 0) or 0)}
             for batch in results for f in batch),
            key=lambda f: f["t"],
        )
        self.cache.write_text(json.dumps({"step": step, "frames": frames}, indent=1))
        print(f"👁️ [Visual] {len(frames)} frames described", flush=True)
        return frames


def scene_changes(video_path: str, t0: float, t1: float, thresh: float = 0.3) -> List[float]:
    """Exact scene-cut times (seconds, absolute) between t0 and t1."""
    t0 = max(0.0, t0)
    p = subprocess.run(
        [FFMPEG_PATH, "-hide_banner", "-ss", f"{t0:.3f}", "-t", f"{max(0.1, t1 - t0):.3f}", "-i", video_path, "-an",
         "-vf", f"scale=160:-2,select='gt(scene,{thresh})',showinfo", "-f", "null", "-"],
        capture_output=True, text=True)
    out = []
    for line in p.stderr.splitlines():
        if "pts_time:" in line:
            try:
                out.append(round(t0 + float(line.split("pts_time:")[1].split()[0]), 3))
            except ValueError:
                pass
    return out


def snap_to_scene_cuts(video_path: str, start: float, end: float, first_word_s: float, last_word_e: float,
                       window: float = 1.2) -> tuple:
    """Keep a cut from showing a sliver of the neighbouring scene: if a scene change lies between the
    last word and the end (or between the start and the first word), cut exactly on it."""
    if not video_path:
        return start, end
    tail = [c for c in scene_changes(video_path, end - window, end + 0.05) if last_word_e - 0.05 <= c <= end]
    if tail:
        end = tail[0] - 0.034
    head = [c for c in scene_changes(video_path, start - 0.05, start + window) if start < c <= first_word_s + 0.05]
    if head:
        start = head[-1]
    return round(start, 3), round(end, 3)
