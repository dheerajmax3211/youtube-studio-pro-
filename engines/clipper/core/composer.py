"""9:16 vertical clip renderer.

Timeline of a finished clip:
  [cold open: the clip's most gripping line, real footage + hook headline]
  -> whoosh ->
  [beat 1] (-> whoosh -> [beat 2] -> ...)  ending on silence after the payoff.
If no cold-open line exists and the AI hook is on, a voice-over teaser is used instead.

Everything is rendered in ONE ffmpeg pass (per-part accurate seek + concat filter),
so audio and video share a single timeline: no AAC priming gaps or drift at joins,
no frozen transition frames. Joins get 15-30 ms micro-fades (no clicks) and the
final mix is loudness-normalised to -14 LUFS, the level Shorts/Reels/TikTok play at.
"""
import json
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .config import FFMPEG_PATH, FFPROBE_PATH, FONTS_DIR, OUT_FPS, OUT_H, OUT_W, OUTPUT_DIR
from .subtitles import build_ass_subtitles
from .suspense_audio import generate_suspense_riser, generate_whoosh, mix_voice_with_riser
from .voice import VoiceSynthesizer

HOOK_ON_SCREEN_SEC = 4.0
WHOOSH_SEC = 0.35
AUDIO_FMT = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"


def frames_to_seconds(d: float) -> float:
    """Round a duration to a whole number of output frames so audio and video stay on one grid."""
    return round(max(1, round(d * OUT_FPS)) / OUT_FPS, 6)


def get_video_dimensions(video_path: str) -> Tuple[int, int, float]:
    cmd = [FFPROBE_PATH, "-v", "error", "-select_streams", "v:0",
           "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", video_path]
    st = json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout)["streams"][0]
    try:
        num, den = st.get("r_frame_rate", "30/1").split("/")
        fps = float(num) / float(den)
    except Exception:
        fps = 30.0
    return int(st["width"]), int(st["height"]), fps


def has_audio_stream(video_path: str) -> bool:
    cmd = [FFPROBE_PATH, "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", video_path]
    return bool(subprocess.run(cmd, capture_output=True, text=True).stdout.strip())


def get_media_duration(path: str) -> float:
    cmd = [FFPROBE_PATH, "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", path]
    try:
        return float(subprocess.run(cmd, capture_output=True, text=True).stdout.strip())
    except ValueError:
        return 0.0


def get_audio_duration(audio_path: str) -> float:
    try:
        with wave.open(audio_path, "rb") as wf:
            return max(1.0, wf.getnframes() / float(wf.getframerate()))
    except Exception:
        return get_media_duration(audio_path) or 5.5


def calculate_geometry(src_w: int, src_h: int, layout: str) -> Tuple[str, int, float, float]:
    if src_h >= src_w and layout != "crop":
        layout = "crop"
    if layout == "blur":
        fg_h = min(OUT_H, int(round(OUT_W * src_h / src_w / 2)) * 2)
    elif layout == "zoom":
        fg_h = 1000
    else:
        fg_h = OUT_H
    top = (OUT_H - fg_h) // 2
    if layout == "crop":
        return layout, fg_h, 300, 1380
    return layout, fg_h, max(230, top - 190), min(1640, top + fg_h + 180)


def _esc(path: Path) -> str:
    return str(path).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


def video_chain(i: int, layout: str, fg_h: int, ass_path: Optional[Path], dur: float,
                hold_at: Optional[float] = None) -> str:
    """Filter chain turning input #i into a 1080x1920 part with burned captions -> [v{i}].
    hold_at: seconds into the part after which the picture freezes (audio keeps playing)."""
    n_frames = max(1, int(round(dur * OUT_FPS)))
    # Resample to the output frame rate FIRST, then cut by frame count: every part is exactly n frames.
    trim = f"fps=fps={OUT_FPS}:start_time=0,trim=end_frame={n_frames},setpts=PTS-STARTPTS"
    if hold_at is not None and 0.5 < hold_at < dur:
        held = max(1, int(round(hold_at * OUT_FPS)))
        trim = (f"fps=fps={OUT_FPS}:start_time=0,trim=end_frame={held},setpts=PTS-STARTPTS,"
                f"tpad=stop_mode=clone:stop={n_frames - held}")
    if layout == "crop":
        base = (f"[{i}:v]{trim},scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=increase,"
                f"crop={OUT_W}:{OUT_H},setsar=1")
    else:
        base = (
            f"[{i}:v]{trim},split=2[a{i}][b{i}];"
            f"[a{i}]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=8:3,"
            f"scale={OUT_W}:{OUT_H},eq=brightness=-0.14:saturation=1.15[bg{i}];"
            f"[b{i}]scale={OUT_W}:{fg_h}:force_original_aspect_ratio=increase,crop={OUT_W}:{fg_h}[fg{i}];"
            f"[bg{i}][fg{i}]overlay=0:(H-h)/2,setsar=1"
        )
    subs = f",ass='{_esc(ass_path)}':fontsdir='{_esc(FONTS_DIR)}'" if ass_path else ""
    return f"{base}{subs},format=yuv420p[v{i}]"


def audio_chain(i: int, dur: float, has_audio: bool, last: bool) -> str:
    """Input #i audio trimmed to exactly dur with click-free edges -> [a{i}]."""
    fade_out = 0.25 if last else 0.03
    n = int(round(int(round(dur * OUT_FPS)) * 48000 / OUT_FPS))  # samples in exactly the part's frames
    if has_audio:
        src = f"[{i}:a]{AUDIO_FMT},atrim=end_sample={n},asetpts=PTS-STARTPTS"
    else:
        src = f"anullsrc=r=48000:cl=stereo,aformat=sample_fmts=fltp,atrim=end_sample={n}"
    return (f"{src},apad=whole_len={n},afade=t=in:st=0:d=0.015,"
            f"afade=t=out:st={max(0.0, dur - fade_out):.4f}:d={fade_out}[a{i}]")


def build_teaser_ass(hook: str, narration: str, duration: float, out_path: Path) -> Path:
    """ASS overlay for the voice-over teaser (used only when no cold-open line exists)."""
    escaped_hook = hook.replace("{", "").replace("}", "").upper()
    words = narration.replace("{", "").replace("}", "").split()
    half = max(1, len(words) // 2)
    p1, p2 = " ".join(words[:half]), " ".join(words[half:])
    dur_ts, split_ts = f"0:00:{duration:05.2f}", f"0:00:{duration * 0.48:05.2f}"
    out_path.write_text(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {OUT_W}
PlayResY: {OUT_H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TeaserHook,Poppins ExtraBold,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H0080000000,1,0,0,0,100,100,0,0,1,8,0,5,60,60,0,1
Style: TeaserNarr,Poppins ExtraBold,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H0080000000,0,0,0,0,100,100,0,0,1,6,0,2,60,60,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 2,0:00:00.00,{dur_ts},TeaserHook,,0,0,0,,{{\\an5\\pos(540,680)\\c&H00D7FF&\\t(0,300,\\fscx106\\fscy106)}}{escaped_hook}
Dialogue: 3,0:00:00.00,{split_ts},TeaserNarr,,0,0,0,,{{\\an2\\pos(540,1480)}}{p1}
Dialogue: 3,{split_ts},{dur_ts},TeaserNarr,,0,0,0,,{{\\an2\\pos(540,1480)\\c&H00F0FF&}}{p2}
""", encoding="utf-8")
    return out_path


class ClipComposer:
    """Renders a curated clip (cold open + beats) into a finished vertical short."""

    def __init__(self, project_id: str, api_key: Optional[str] = None):
        self.project_id = project_id
        self.output_dir = OUTPUT_DIR / project_id
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.api_key = api_key
        self.voice_synth = VoiceSynthesizer(api_key=api_key)

    # ------------------------------------------------------------------ teaser fallback

    def _render_tts_teaser(self, clip, video_path, work_dir: Path) -> Optional[Path]:
        """Still-frame + AI voice-over teaser; only used when no cold-open line was found."""
        narration, hook = clip.get("hook_narration", ""), clip.get("hook", "")
        if not narration:
            return None
        try:
            voice_wav = work_dir / "hook_voice.wav"
            self.voice_synth.synthesize(narration, str(voice_wav))
            dur = max(3.0, min(7.5, get_audio_duration(str(voice_wav)) + 0.3))
            riser_wav, mixed_wav = work_dir / "hook_riser.wav", work_dir / "hook_mixed.wav"
            generate_suspense_riser(dur, str(riser_wav))
            mix_voice_with_riser(str(voice_wav), str(riser_wav), str(mixed_wav), ffmpeg_path=FFMPEG_PATH)

            last = clip["segments"][-1]
            frame = work_dir / "teaser_frame.jpg"
            subprocess.run([FFMPEG_PATH, "-y", "-ss", f"{(last['start'] + last['end']) / 2:.2f}", "-i", video_path,
                            "-vframes", "1", "-q:v", "2", str(frame)], capture_output=True, check=True)
            ass = build_teaser_ass(hook, narration, dur, work_dir / "teaser.ass")
            vf = (
                f"[0:v]fps={OUT_FPS},split=2[ta][tb];"
                "[ta]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=8:3,"
                f"scale={OUT_W}:{OUT_H},eq=brightness=-0.22:saturation=1.2[tbg];"
                "[tb]scale=1000:1000:force_original_aspect_ratio=increase,crop=1000:1000[tfg];"
                f"[tbg][tfg]overlay=40:(H-h)/2,setsar=1,ass='{_esc(ass)}':fontsdir='{_esc(FONTS_DIR)}',format=yuv420p[tv]"
            )
            out = work_dir / "teaser_tts.mp4"
            subprocess.run([FFMPEG_PATH, "-y", "-loop", "1", "-i", str(frame), "-i", str(mixed_wav),
                            "-filter_complex", vf, "-map", "[tv]", "-map", "1:a", "-c:v", "libx264",
                            "-preset", "veryfast", "-crf", "18", "-c:a", "pcm_s16le", "-ar", "48000",
                            "-t", f"{dur:.3f}", str(out)], capture_output=True, check=True)
            return out
        except Exception as e:
            print(f"⚠️ [Composer] Voice-over teaser skipped ({e})", flush=True)
            return None

    # ------------------------------------------------------------------ main render

    def render_clip(
        self,
        video_path: str,
        clip: Dict[str, Any],
        layout: str = "blur",
        subtitle_style: str = "bounce",
        enable_ai_hook: bool = True,
        burn_subtitles: bool = True,
        force_software: bool = False,
    ) -> Dict[str, Any]:
        clip_id = clip.get("id", "clip_1")
        hook = clip.get("hook", "")
        highlight = clip.get("highlight_words", [])
        segments = clip.get("segments") or [{
            "start": float(clip.get("start") or 0), "end": float(clip.get("end") or 0),
            "words": clip.get("words", []), "beat": "payoff", "label": "Clip",
        }]

        work_dir = self.output_dir / f"work_{clip_id}"
        work_dir.mkdir(parents=True, exist_ok=True)
        src_w, src_h, _ = get_video_dimensions(video_path)
        layout, fg_h, hook_y, cap_y = calculate_geometry(src_w, src_h, layout)
        src_audio = has_audio_stream(video_path)

        # Parts cut from the source video: (start, end, words, hook_text, hold_from)
        parts: List[Tuple[float, float, List[Dict[str, Any]], str, Optional[float]]] = []
        cold = clip.get("cold_open") if enable_ai_hook else None
        if cold:
            parts.append((float(cold["start"]), float(cold["end"]), cold.get("words", []), hook, None))
        for idx, seg in enumerate(segments):
            parts.append((float(seg["start"]), float(seg["end"]), seg.get("words", []),
                          hook if (idx == 0 and not cold) else "", seg.get("hold_from")))

        tts_teaser = self._render_tts_teaser(clip, video_path, work_dir) if (enable_ai_hook and not cold) else None

        inputs: List[str] = []
        filters: List[str] = []
        labels: List[str] = []
        timeline: List[Dict[str, Any]] = []
        durations: List[float] = []
        n_in = 0

        if tts_teaser:
            d = frames_to_seconds(get_media_duration(str(tts_teaser)))
            inputs += ["-i", str(tts_teaser)]
            filters.append(f"[0:v]fps={OUT_FPS},scale={OUT_W}:{OUT_H},setsar=1,format=yuv420p[v0]")
            filters.append(f"[0:a]{AUDIO_FMT},afade=t=out:st={max(0, d - 0.03):.3f}:d=0.03[a0]")
            labels.append("[v0][a0]")
            durations.append(d)
            timeline.append({"kind": "voiceover", "src_start": None, "dur": d})
            n_in = 1

        for k, (s, e, words, part_hook, hold_from) in enumerate(parts):
            timeline.append({"kind": "teaser" if (cold and k == 0) else "segment", "src_start": s,
                             "dur": frames_to_seconds(e - s), "hold_at": (float(hold_from) - s) if hold_from else None})
            i = n_in
            d = frames_to_seconds(e - s)  # whole frames: no drift at the joins
            ass_path = None
            if burn_subtitles or part_hook:
                ass_path = work_dir / f"part_{k}.ass"
                ass_path.write_text(build_ass_subtitles(
                    words=words if burn_subtitles else [], start=s, end=e, hook=part_hook,
                    style_name=subtitle_style, highlight_words=highlight, hook_y=hook_y, cap_y=cap_y,
                    beat_badge=None, hook_duration=(d if cold and k == 0 else HOOK_ON_SCREEN_SEC),
                ), encoding="utf-8")
            inputs += ["-ss", f"{s:.3f}", "-t", f"{d + 0.1:.3f}", "-i", video_path]
            filters.append(video_chain(i, layout, fg_h, ass_path, d,
                                       hold_at=(float(hold_from) - s) if hold_from else None))
            filters.append(audio_chain(i, d, src_audio, last=(k == len(parts) - 1)))
            labels.append(f"[v{i}][a{i}]")
            durations.append(d)
            n_in += 1

        n_parts = len(labels)
        filters.append(f"{''.join(labels)}concat=n={n_parts}:v=1:a=1[vcat][acat]")

        # Whoosh on every cut (teaser -> clip, beat -> beat), landing just before the cut.
        cut_times, t = [], 0.0
        for d in durations[:-1]:
            t += d
            cut_times.append(t)
        if cut_times:
            whoosh = work_dir / "whoosh.wav"
            generate_whoosh(WHOOSH_SEC, str(whoosh))
            inputs += ["-i", str(whoosh)]
            w = n_in
            filters.append(f"[{w}:a]{AUDIO_FMT},volume=0.55,asplit={len(cut_times)}" +
                           "".join(f"[w{j}]" for j in range(len(cut_times))))
            for j, ct in enumerate(cut_times):
                ms = int(max(0.0, ct - WHOOSH_SEC * 0.6) * 1000)
                filters.append(f"[w{j}]adelay={ms}|{ms}[wd{j}]")
            mix_in = "[acat]" + "".join(f"[wd{j}]" for j in range(len(cut_times)))
            filters.append(f"{mix_in}amix=inputs={len(cut_times) + 1}:duration=first:normalize=0[amix]")
            a_final = "[amix]"
        else:
            a_final = "[acat]"
        filters.append(f"{a_final}loudnorm=I=-14:TP=-1.5:LRA=11,{AUDIO_FMT}[aout]")

        final_mp4 = self.output_dir / f"{clip_id}_{layout}.mp4"
        graph = ";".join(filters)
        (work_dir / "filter.txt").write_text(graph, encoding="utf-8")

        def encode(vcodec: List[str]) -> subprocess.CompletedProcess:
            return subprocess.run(
                [FFMPEG_PATH, "-y", *inputs, "-filter_complex", graph, "-map", "[vcat]", "-map", "[aout]",
                 *vcodec, "-r", str(OUT_FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                 "-movflags", "+faststart", str(final_mp4)],
                capture_output=True, text=True,
            )

        p = encode(["-c:v", "libx264", "-preset", "fast", "-crf", "19"]) if force_software else \
            encode(["-c:v", "h264_videotoolbox", "-b:v", "8500k", "-allow_sw", "1"])
        if p.returncode != 0:
            print("⚠️ [Composer] VideoToolbox failed, falling back to libx264", flush=True)
            p = encode(["-c:v", "libx264", "-preset", "fast", "-crf", "19"])
        if p.returncode != 0:
            raise RuntimeError(f"Render failed for {clip_id}: {p.stderr[-1500:]}")

        final_dur = round(get_media_duration(str(final_mp4)) or sum(durations), 2)
        final_jpg = self.output_dir / f"{clip_id}_cover.jpg"
        cover_t = durations[0] / 2 if cold else max(0.5, final_dur * 0.55)
        subprocess.run([FFMPEG_PATH, "-y", "-ss", f"{cover_t:.2f}", "-i", str(final_mp4), "-vframes", "1",
                        "-q:v", "2", str(final_jpg)], capture_output=True)

        shutil.rmtree(work_dir, ignore_errors=True)
        return {
            "id": clip_id,
            "video_path": str(final_mp4),
            "cover_path": str(final_jpg),
            "duration": final_dur,
            "layout": layout,
            "is_story_arc": len(segments) > 1,
            "segment_count": len(segments),
            "has_ai_hook": bool(cold or tts_teaser),
            "hook_type": "cold_open" if cold else ("voiceover" if tts_teaser else "none"),
            "timeline": [dict(t, out_start=round(sum(durations[:j]), 3)) for j, t in enumerate(timeline)],
            "fg_h": fg_h,
        }
