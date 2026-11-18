#!/usr/bin/env python3
import sys
import os
import json
import argparse
import re
import shutil
from pathlib import Path

# Add clipper root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from core.pipeline import ClippingPipeline

def emit_progress(step: str, percent: int, msg: str):
    payload = {
        "type": "progress",
        "step": step,
        "percent": percent,
        "message": msg
    }
    print(json.dumps(payload), flush=True)

def slim_clip(clip: dict) -> dict:
    """Drop per-word timing data: the app doesn't use it, and it makes the result line huge."""
    out = {k: v for k, v in clip.items() if k != "words"}
    out["segments"] = [{k: v for k, v in s.items() if k != "words"} for s in clip.get("segments", [])]
    if isinstance(clip.get("cold_open"), dict):
        out["cold_open"] = {k: v for k, v in clip["cold_open"].items() if k != "words"}
    return out


def publish_clip(clip: dict, out_dir: Path, project_id: str) -> dict:
    """Copy the finished video and cover into the app's Clips folder and point the result at the copies."""
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^A-Za-z0-9]+", "-", clip.get("title", "clip")).strip("-")[:50] or "clip"
    base = f"{slug}_{project_id}_{clip.get('id', 'clip')}"
    for key, ext in (("rendered_mp4", ".mp4"), ("cover_path", ".jpg")):
        src = clip.get(key)
        if src and Path(src).exists():
            dst = out_dir / f"{base}{ext}"
            shutil.copy2(src, dst)
            clip[key] = str(dst)
    clip["video_path"] = clip.get("rendered_mp4", "")
    return clip


def main():
    parser = argparse.ArgumentParser(description="YouTube Studio Pro Clipper Bridge")
    parser.add_argument("--source", required=True, help="YouTube URL or local video path")
    parser.add_argument("--min-duration", type=int, default=25)
    parser.add_argument("--max-duration", type=int, default=60)
    parser.add_argument("--clips", type=int, default=3)
    parser.add_argument("--layout", default="blur", choices=["blur", "fit", "crop", "zoom"])
    parser.add_argument("--style", default="bounce", choices=["bounce", "hype", "clean", "hormozi"])
    parser.add_argument("--ai-provider", default="openrouter")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--model", default=None)
    parser.add_argument("--curation-mode", default="story_arc", choices=["story_arc", "single_moment"])
    parser.add_argument("--enable-ai-hook", action="store_true", default=True)
    parser.add_argument("--disable-ai-hook", dest="enable_ai_hook", action="store_false")
    parser.add_argument("--project-dir", default=None)
    parser.add_argument("--output-dir", default=None, help="Folder to copy finished clips into (the app's Clips folder)")

    args = parser.parse_args()

    layout = "blur" if args.layout in ("blur", "fit") else args.layout
    style = args.style

    emit_progress("Starting", 5, "Initializing PeakCut-grade Clipper Engine on Apple Silicon...")

    pipeline = ClippingPipeline(
        progress_callback=emit_progress
    )

    try:
        result = pipeline.run(
            source_url_or_file=args.source,
            min_clip_duration=args.min_duration,
            max_clip_duration=args.max_duration,
            target_clips=args.clips,
            layout=layout,
            subtitle_style=style,
            ai_provider=args.ai_provider,
            api_key=args.api_key,
            ai_model=args.model,
            curation_mode=args.curation_mode,
            enable_ai_hook=args.enable_ai_hook,
            render_all_clips=True
        )

        clips = [slim_clip(c) for c in result["clips"]]
        if args.output_dir:
            clips = [publish_clip(c, Path(args.output_dir), result["project_id"]) for c in clips]

        final_payload = {
            "type": "complete",
            "status": "success",
            "project_id": result["project_id"],
            "total_clips": len(clips),
            "clips": clips
        }
        print(json.dumps(final_payload), flush=True)

    except Exception as e:
        import traceback
        err_msg = str(e)
        err_payload = {
            "type": "error",
            "status": "failed",
            "error": err_msg,
            "trace": traceback.format_exc()
        }
        print(json.dumps(err_payload), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
