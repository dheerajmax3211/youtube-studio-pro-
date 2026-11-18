import json
import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from .config import FFMPEG_PATH, YT_DLP_PATH, PROJECTS_DIR

class VideoDownloader:
    """Handles downloading YouTube videos and extracting audio/metadata."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.project_dir = PROJECTS_DIR / project_id
        self.project_dir.mkdir(parents=True, exist_ok=True)
        self.video_path = self.project_dir / "source.mp4"
        self.audio_path = self.project_dir / "audio.wav"
        self.metadata_path = self.project_dir / "metadata.json"

    def get_info_from_url(self, url: str) -> Dict[str, Any]:
        """Fetch metadata without downloading."""
        cmd = [
            YT_DLP_PATH,
            "--dump-json",
            "--no-playlist",
            url
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def download_youtube(self, url: str) -> Dict[str, Any]:
        """Download YouTube video at best quality up to 1080p, and extract audio."""
        if self.video_path.exists() and self.audio_path.exists() and self.metadata_path.exists():
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)

        print(f"📥 [Downloader] Fetching YouTube video: {url}")
        
        # Download best video (<= 1080p) + best audio combined
        cmd = [
            YT_DLP_PATH,
            "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best",
            "--merge-output-format", "mp4",
            "--no-playlist",
            "-o", str(self.video_path),
            "--write-info-json",
            url
        ]
        subprocess.run(cmd, check=True)

        # Extract audio to 16kHz mono WAV for Whisper
        self.extract_audio()

        # Parse downloaded info json
        info_files = list(self.project_dir.glob("*.info.json"))
        metadata = {}
        if info_files:
            with open(info_files[0], "r", encoding="utf-8") as f:
                info_data = json.load(f)
                metadata = {
                    "id": self.project_id,
                    "title": info_data.get("title", "Untitled"),
                    "duration": info_data.get("duration", 0),
                    "channel": info_data.get("uploader", "Unknown"),
                    "thumbnail": info_data.get("thumbnail", ""),
                    "width": info_data.get("width", 1920),
                    "height": info_data.get("height", 1080),
                    "source_url": url,
                    "video_path": str(self.video_path),
                    "audio_path": str(self.audio_path)
                }
        else:
            metadata = {
                "id": self.project_id,
                "title": "YouTube Video",
                "source_url": url,
                "video_path": str(self.video_path),
                "audio_path": str(self.audio_path)
            }

        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return metadata

    def import_local_file(self, local_path: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Import a local video file."""
        src = Path(local_path)
        if not src.exists():
            raise FileNotFoundError(f"Source file not found: {local_path}")

        # Copy or hardlink
        if not self.video_path.exists():
            subprocess.run([FFMPEG_PATH, "-y", "-i", str(src), "-c", "copy", str(self.video_path)], check=True)

        self.extract_audio()

        metadata = {
            "id": self.project_id,
            "title": title or src.stem,
            "source_url": str(src),
            "video_path": str(self.video_path),
            "audio_path": str(self.audio_path)
        }

        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return metadata

    def extract_audio(self):
        """Extract 16kHz mono WAV from video."""
        cmd = [
            FFMPEG_PATH,
            "-y",
            "-i", str(self.video_path),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(self.audio_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
