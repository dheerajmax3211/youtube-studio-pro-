#!/usr/bin/env python3
import sys
import os
import json
import argparse
import subprocess
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
HYPERFRAMES_ENGINE = ENGINE_DIR / "hyperframes_engine.mjs"

DEFAULT_OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")

def find_node_bin():
    candidates = [
        "/Users/dheerajsrinivasa/.local/bin/node",
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node"
    ]
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    return "node"

def main():
    parser = argparse.ArgumentParser(description="YouTube Studio Pro HyperFrames Premium Bridge")
    parser.add_argument("--topic", required=True)
    parser.add_argument("--duration", type=int, default=60)
    parser.add_argument("--format", default="vertical")
    parser.add_argument("--avatar", action="store_true", default=False)
    parser.add_argument("--avatar-pos", default="bottom_right")
    parser.add_argument("--voice", default="dheeraj")
    parser.add_argument("--caption-style", default="hormozi")
    parser.add_argument("--bgm-mood", default="auto")
    parser.add_argument("--no-bgm", action="store_true", default=False)
    parser.add_argument("--theme", default="auto")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--output", required=True)

    args = parser.parse_args()

    api_key = args.api_key or DEFAULT_OPENROUTER_KEY

    node_bin = find_node_bin()
    cmd = [
        node_bin, str(HYPERFRAMES_ENGINE),
        "--topic", args.topic,
        "--duration", str(args.duration),
        "--output", str(Path(args.output).resolve()),
        "--api-key", api_key,
        "--avatar-pos", args.avatar_pos,
        "--bgm-mood", args.bgm_mood,
        "--theme", args.theme
    ]
    if not args.avatar:
        cmd.append("--no-avatar")
    if args.no_bgm or args.bgm_mood == "none":
        cmd.append("--no-bgm")

    env = os.environ.copy()
    current_path = env.get("PATH", "")
    prefix_paths = "/Users/dheerajsrinivasa/.local/bin:/opt/homebrew/bin:/usr/local/bin"
    env["PATH"] = f"{prefix_paths}:{current_path}"

    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env
    )

    for line in iter(proc.stdout.readline, ''):
        line = line.strip()
        if not line:
            continue
        # Forward JSON progress directly to stdout
        if line.startswith("{") and line.endswith("}"):
            print(line, flush=True)
        else:
            # If standard log, emit as progress message
            if any(k in line.lower() for k in ["check:", "rendering", "encoding", "frame", "compilation"]):
                print(json.dumps({"type": "progress", "percent": 85, "step": "Rendering", "message": line[:100]}), flush=True)

    proc.stdout.close()
    returncode = proc.wait()
    if returncode != 0:
        print(json.dumps({"type": "error", "message": f"HyperFrames failed with exit code {returncode}"}), flush=True)
        sys.exit(returncode)

if __name__ == "__main__":
    main()
