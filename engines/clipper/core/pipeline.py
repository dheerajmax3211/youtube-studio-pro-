"""End-to-end PeakCut/Opus-grade clipping pipeline for YouTube Studio Pro."""
import uuid
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable

from .downloader import VideoDownloader
from .transcriber import Transcriber
from .curator import ViralityCurator
from .composer import ClipComposer
from .sync_check import check_clip
from .config import PROJECTS_DIR, OUTPUT_DIR

class ClippingPipeline:
    """Orchestrates ingestion, high-speed local transcription, sliding-window curation,
    multi-beat story arc discovery, AI suspense hook intro generation, and hardware rendering.
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        progress_callback: Optional[Callable[[str, int, str], None]] = None
    ):
        self.project_id = project_id or str(uuid.uuid4())[:8]
        self.progress_callback = progress_callback or (lambda step, pct, msg: None)

    def _update_progress(self, step: str, percent: int, message: str):
        print(f"[{percent}%] {step}: {message}", flush=True)
        self.progress_callback(step, percent, message)

    def run(
        self,
        source_url_or_file: str,
        min_clip_duration: int = 25,
        max_clip_duration: int = 60,
        target_clips: int = 3,
        layout: str = "blur",
        subtitle_style: str = "bounce",
        ai_provider: str = "openrouter",
        api_key: Optional[str] = None,
        ai_model: Optional[str] = None,
        curation_mode: str = "story_arc",
        enable_ai_hook: bool = True,
        render_all_clips: bool = True
    ) -> Dict[str, Any]:
        downloader = VideoDownloader(self.project_id)

        # 1. Ingestion
        self._update_progress("Ingestion", 10, "Fetching video and extracting audio stream...")
        if source_url_or_file.startswith(("http://", "https://")):
            metadata = downloader.download_youtube(source_url_or_file)
        else:
            metadata = downloader.import_local_file(source_url_or_file)

        # 2. Local Transcription + Loudness Energy Analysis
        self._update_progress("Transcription", 35, "Running local speech transcription with Parakeet TDT & energy analysis...")
        transcriber = Transcriber(self.project_id)
        transcript = transcriber.transcribe()

        # 3. Virality Curation (Multi-Beat Story Arc or Focused Climax)
        mode_label = "Multi-Beat Story Arc (Setup -> Payoff)" if curation_mode == "story_arc" else "Focused Single Climax"
        self._update_progress("Curation", 60, f"Watching the video and reading the transcript to map its stories, then building {mode_label} clips ({min_clip_duration}s - {max_clip_duration}s)... (about 2-3 min for a 20-min video)")
        curator = ViralityCurator(
            project_id=self.project_id,
            provider=ai_provider,
            api_key=api_key,
            model=ai_model or "google/gemini-2.5-flash"
        )
        clips = curator.curate_clips(
            min_duration=min_clip_duration,
            max_duration=max_clip_duration,
            target_clips=target_clips,
            curation_mode=curation_mode
        )

        # 4. Rendering with Kinetic Subtitles, AI Suspense Hook, and Multi-Beat Stitching
        rendered_clips = []
        if render_all_clips and clips:
            composer = ClipComposer(self.project_id, api_key=api_key)
            total = len(clips)
            for idx, clip in enumerate(clips):
                pct = 70 + int((idx / total) * 28)
                clip_title = clip.get("title", f"Clip {idx+1}")
                dur = clip.get("duration", 0)
                hook_flag = " + AI Hook" if enable_ai_hook and clip.get("hook_narration") else ""
                story_flag = f" ({clip.get('segment_count', 1)} beats)" if clip.get("is_story_arc") else ""

                self._update_progress(
                    "Rendering",
                    pct,
                    f"Rendering clip {idx+1}/{total}: '{clip_title}' ({dur:.1f}s{story_flag}{hook_flag})..."
                )
                render_result, sync = None, None
                for software in (False, True):  # re-render once with the software encoder if sync fails
                    render_result = composer.render_clip(
                        video_path=metadata["video_path"],
                        clip=clip,
                        layout=layout,
                        subtitle_style=subtitle_style,
                        enable_ai_hook=enable_ai_hook,
                        burn_subtitles=True,
                        force_software=software
                    )
                    sync = check_clip(render_result["video_path"], metadata["video_path"],
                                      str(PROJECTS_DIR / self.project_id / "audio.wav"),
                                      render_result["timeline"], render_result["layout"], render_result["fg_h"])
                    worst = max([abs(p.get("audio_lag_ms", 0)) for p in sync["parts"] if p.get("audio_conf", 0) >= 0.5] or [0])
                    print(f"🔊 [Sync] {clip.get('id')}: {'OK' if sync['ok'] else 'FAIL'} — {sync['measured_parts']} part(s) "
                          f"measured, worst audio offset {worst:.0f} ms {'; '.join(sync['problems'])}", flush=True)
                    if sync["ok"]:
                        break
                clip["sync_check"] = {k: sync[k] for k in ("ok", "problems", "measured_parts", "parts")}
                if not sync["ok"]:
                    self._update_progress("Rendering", pct, f"Withheld '{clip_title}': audio/video out of sync ({'; '.join(sync['problems'])})")
                    continue
                clip["rendered_mp4"] = render_result["video_path"]
                clip["cover_path"] = render_result["cover_path"]
                clip["final_duration"] = render_result["duration"]
                clip["has_ai_hook"] = render_result.get("has_ai_hook", False)
                clip["hook_type"] = render_result.get("hook_type", "none")
                rendered_clips.append(clip)

        final = rendered_clips if render_all_clips else clips
        withheld = len(clips) - len(final) if render_all_clips else 0
        note = f" ({withheld} withheld: failed the sync check)" if withheld else ""
        self._update_progress("Complete", 100, f"Created {len(final)} clip(s) that passed the quality gate and sync check{note}")

        result = {
            "project_id": self.project_id,
            "metadata": metadata,
            "clips": final,
            "total_clips": len(final),
            "output_dir": str(OUTPUT_DIR / self.project_id)
        }
        return result
