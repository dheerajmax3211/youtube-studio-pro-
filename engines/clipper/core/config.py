import os
import shutil
from pathlib import Path

# Base Paths
CORE_DIR = Path(__file__).resolve().parent
CLIPPER_DIR = CORE_DIR.parent
ENGINES_DIR = CLIPPER_DIR.parent
PROJECTS_DIR = CLIPPER_DIR / "projects"
OUTPUT_DIR = CLIPPER_DIR / "output"
ASSETS_DIR = CLIPPER_DIR / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"
MODELS_DIR = ASSETS_DIR / "models"

# Speech Model Path
ASR_MODEL_NAME = os.getenv("ASR_MODEL_NAME", "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8")
ASR_MODEL_DIR = MODELS_DIR / ASR_MODEL_NAME

PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FONTS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Binary Paths
HERMES_FFMPEG = Path.home() / ".hermes/tools/ffmpeg-9.0.1-darwin-arm64/ffmpeg"
FFMPEG_PATH = str(HERMES_FFMPEG) if HERMES_FFMPEG.exists() else (shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg")
FFPROBE_PATH = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
YT_DLP_PATH = shutil.which("yt-dlp") or str(Path.home() / ".local/bin/yt-dlp")
WHISPER_CMD = shutil.which("whisper-ctranslate2") or str(Path.home() / ".local/bin/whisper-ctranslate2")

# Hardware Acceleration on Apple Silicon
USE_VIDEOTOOLBOX = True
HW_CODEC = "h264_videotoolbox"

# Default AI Settings
DEFAULT_AI_PROVIDER = os.getenv("AI_PROVIDER", "openrouter")
DEFAULT_OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEFAULT_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
DEFAULT_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "google/gemini-2.5-flash")

# Video Targets
OUT_W = 1080
OUT_H = 1920
OUT_FPS = 30
