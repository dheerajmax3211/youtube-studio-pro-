"""Automatic audio/video sync check for rendered clips.

For every part of a rendered clip (teaser, each beat) we know which second of the source it
came from. We measure, in the middle of each part (away from fades and whooshes):
- audio offset: cross-correlate the clip's audio with the source audio -> milliseconds,
- video offset: compare the clip's frame with the source frames +/-3 frames around where it
  should be (same scaling/crop as the renderer, caption areas excluded) -> frames.
A clip fails if audio is off by more than 40 ms, video by more than 1 frame, or the two
disagree by more than 45 ms. Parts with nothing measurable (silence, a static picture) are
reported as unmeasured rather than failed.
"""
import subprocess
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .config import FFMPEG_PATH, OUT_FPS, OUT_H, OUT_W

SR = 16000
MAX_AUDIO_LAG = 0.25
AUDIO_TOL_MS = 40.0
AV_TOL_MS = 45.0
VIDEO_TOL_FRAMES = 1
MIN_AUDIO_CONF = 0.5
MIN_VIDEO_CONF = 0.3
SEARCH_FRAMES = 3


# ------------------------------------------------------------------ measurement primitives

def audio_lag(ref: np.ndarray, test: np.ndarray, sr: int = SR, max_lag: float = MAX_AUDIO_LAG) -> Tuple[float, float]:
    """ref covers [t - max_lag, t + len(test) + max_lag] of the source; test is the rendered audio
    that should equal ref[max_lag:]. Returns (lag_seconds, confidence 0..1).
    lag > 0 means the rendered audio is LATE (it plays source sound from earlier)."""
    ref = ref.astype(np.float64) - ref.mean()
    test = test.astype(np.float64) - test.mean()
    n, m = len(ref), len(test)
    if m < sr // 4 or n < m:
        return 0.0, 0.0
    size = 1 << int(np.ceil(np.log2(n + m)))
    corr = np.fft.irfft(np.fft.rfft(ref, size) * np.conj(np.fft.rfft(test, size)), size)[: n - m + 1]
    # normalise by the energy of each ref window
    csum = np.concatenate([[0.0], np.cumsum(ref ** 2)])
    win = np.sqrt(np.maximum(csum[m:] - csum[:-m], 1e-12)) * np.sqrt((test ** 2).sum() + 1e-12)
    ncc = corr / win[: len(corr)]
    best = int(np.argmax(ncc))
    expected = int(round(max_lag * sr))
    return (expected - best) / sr, float(max(0.0, ncc[best]))


def video_lag(rendered: np.ndarray, candidates: List[np.ndarray]) -> Tuple[int, float]:
    """candidates are source frames at offsets -k..+k. Returns (frame_offset, confidence 0..1)."""
    k = len(candidates) // 2
    diffs = np.array([float(np.mean(np.abs(rendered - c))) for c in candidates])
    order = np.argsort(diffs)
    best, second = diffs[order[0]], diffs[order[1]] if len(diffs) > 1 else diffs[order[0]]
    spread = float(diffs.max() - best)
    conf = 0.0 if spread < 1e-3 else float(min(1.0, (second - best) / (spread + 1e-6) + 0.0))
    if second - best < 1e-4:
        conf = 0.0
    return int(order[0]) - k, conf


def verdict(parts: List[Dict[str, Any]], fps: int = OUT_FPS) -> Dict[str, Any]:
    problems, measured = [], 0
    for i, p in enumerate(parts):
        a_ok = p.get("audio_conf", 0) >= MIN_AUDIO_CONF
        v_ok = p.get("video_conf", 0) >= MIN_VIDEO_CONF
        if a_ok or v_ok:
            measured += 1
        if a_ok and abs(p["audio_lag_ms"]) > AUDIO_TOL_MS:
            problems.append(f"part {i}: audio off by {p['audio_lag_ms']:.0f} ms")
        if "video_lag_ms" not in p and "video_lag_frames" in p:
            p["video_lag_ms"] = p["video_lag_frames"] * 1000.0 / fps
        if v_ok and abs(p["video_lag_ms"]) > VIDEO_TOL_FRAMES * 1000.0 / fps + 1.0:
            problems.append(f"part {i}: picture off by {p['video_lag_ms']:.0f} ms")
        if a_ok and v_ok:
            av = p["audio_lag_ms"] - p["video_lag_ms"]
            p["av_offset_ms"] = round(av, 1)
            if abs(av) > AV_TOL_MS:
                problems.append(f"part {i}: audio vs picture off by {av:.0f} ms")
    return {"ok": not problems, "problems": problems, "measured_parts": measured, "parts": parts}


# ------------------------------------------------------------------ media extraction

def _pcm(path: str, t: float, dur: float) -> np.ndarray:
    p = subprocess.run([FFMPEG_PATH, "-v", "error", "-ss", f"{max(0.0, t):.3f}", "-t", f"{dur:.3f}", "-i", path,
                        "-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def _region(layout: str, fg_h: int) -> Tuple[str, int, int]:
    """(source transform, crop height, crop y) of a caption-free area of the 1080x1920 output."""
    if layout == "crop":
        return (f"scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=increase,crop={OUT_W}:{OUT_H}", 640, 540)
    top = (OUT_H - fg_h) // 2
    h = int(fg_h * 0.7) // 2 * 2
    return (f"scale={OUT_W}:{fg_h}:force_original_aspect_ratio=increase,crop={OUT_W}:{fg_h},pad={OUT_W}:{OUT_H}:0:{top}",
            h, top + (fg_h - h) // 2)


def frames_with_times(path: str, t_from: float, t_to: float, pre: str, h: int, y: int) -> List[Tuple[float, np.ndarray]]:
    """Decode the frames whose ABSOLUTE timestamps lie in [t_from, t_to] (no seek ambiguity:
    -copyts keeps the file's own timestamps), cropped to the comparison region, as grayscale."""
    vf = (f"select='between(t\\,{t_from:.4f}\\,{t_to:.4f})',showinfo,"
          f"{pre + ',' if pre else ''}crop={OUT_W}:{h}:0:{y},scale=96:-2,format=gray")
    p = subprocess.run([FFMPEG_PATH, "-hide_banner", "-ss", f"{max(0.0, t_from - 3.0):.3f}", "-copyts", "-i", path,
                        "-an", "-vf", vf, "-fps_mode", "passthrough", "-f", "rawvideo", "-"], capture_output=True)
    times = []
    for line in p.stderr.decode(errors="ignore").splitlines():
        if "showinfo" in line and "pts_time:" in line:
            try:
                times.append(float(line.split("pts_time:")[1].split()[0]))
            except ValueError:
                pass
    w, hh = 96, int(round(h * 96 / OUT_W / 2)) * 2
    data = np.frombuffer(p.stdout, dtype=np.uint8)
    n = min(len(times), len(data) // (w * hh) if hh else 0)
    return [(times[i], data[i * w * hh:(i + 1) * w * hh].reshape(hh, w).astype(np.float32) / 255.0) for i in range(n)]


# ------------------------------------------------------------------ clip check

def check_clip(rendered: str, source_video: str, source_audio: Optional[str], timeline: List[Dict[str, Any]],
               layout: str, fg_h: int) -> Dict[str, Any]:
    pre, h, y = _region(layout, fg_h)
    parts = []
    for part in timeline:
        if part.get("src_start") is None:
            continue  # generated voice-over teaser: nothing in the source to compare with
        d = float(part["dur"])
        usable_end = min(d, float(part.get("hold_at") or d)) - 0.6
        lo = 0.6
        if usable_end - lo < 1.0:
            continue
        win = min(3.0, usable_end - lo)
        off = lo + (usable_end - lo - win) / 2  # centre of the usable range
        out_t, src_t = part["out_start"] + off, part["src_start"] + off
        res = {"kind": part.get("kind", ""), "out_t": round(out_t, 2), "src_t": round(src_t, 2)}

        test = _pcm(rendered, out_t, win)
        ref = _pcm(source_audio or source_video, src_t - MAX_AUDIO_LAG, win + 2 * MAX_AUDIO_LAG)
        lag, conf = audio_lag(ref, test, SR, MAX_AUDIO_LAG)
        res.update(audio_lag_ms=round(lag * 1000, 1), audio_conf=round(conf, 2))

        mid = out_t + win / 2
        rend = frames_with_times(rendered, mid, mid + 0.05, "", h, y)
        vl_ms, vc = 0.0, 0.0
        if rend:
            t_r, img = rend[0]
            expected = part["src_start"] + (t_r - part["out_start"])  # source moment this frame should show
            cands = frames_with_times(source_video, expected - 0.12, expected + 0.12, pre, h, y)
            if len(cands) >= 3 and cands[0][1].shape == img.shape:
                k, vc = video_lag(img, [c for _, c in cands])
                best_t = cands[k + len(cands) // 2][0]
                vl_ms = (expected - best_t) * 1000.0  # > 0: picture shows older footage = picture is late
        res.update(video_lag_ms=round(vl_ms, 1), video_conf=round(vc, 2))
        parts.append(res)
    return verdict(parts)
