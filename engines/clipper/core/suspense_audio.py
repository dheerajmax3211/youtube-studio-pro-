"""Cinema-grade Suspense Riser, Impact Boom & Whoosh SFX Engine.
Generates pure 48kHz stereo procedural audio effects for dramatic Hook Intros
and multi-beat story transitions without external audio asset dependencies.
"""
import math
import wave
import struct
import subprocess
from pathlib import Path
from typing import Optional
import numpy as np

def generate_suspense_riser(
    duration: float = 5.5,
    out_path: Optional[str] = None,
    sr: int = 48000
) -> str:
    """Generate a Hollywood movie-trailer tension riser with sub-bass drone,
    exponential pitch ascent, rushing air swell, and a drop-point cutoff.
    """
    if out_path is None:
        out_path = f"/tmp/suspense_riser_{int(duration * 1000)}.wav"
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

    n_samples = int(sr * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)

    # 1. Deep Sub-Bass Tension Drone (45 Hz with 0.8 Hz subtle beating)
    drone_fade_in = np.clip(t / 0.8, 0, 1.0)
    drone_pulse = 0.5 + 0.5 * np.cos(2 * np.pi * 0.8 * t)
    drone = 0.28 * drone_fade_in * drone_pulse * np.sin(2 * np.pi * 48 * t)

    # 2. Exponential Pitch Riser (Sweeps from 110 Hz up to 1950 Hz)
    f_start = 110.0
    f_end = 1950.0
    # Phase integral of f(t) = f_start * (f_end / f_start) ** ( (t / duration) ** 2.0 )
    curve_pow = 1.9
    norm_t = (t / duration) ** curve_pow
    ratio = f_end / f_start
    log_ratio = np.log(ratio)
    # Integral of a^(u) du
    phase = 2 * np.pi * f_start * duration * (np.power(ratio, norm_t) - 1.0) / (log_ratio * curve_pow + 1e-6)
    
    # Tension sweep amplitude swells exponentially towards the climax
    sweep_amp = 0.42 * (t / duration) ** 2.2
    sweep = sweep_amp * np.sin(phase)

    # 3. White / Pink Filtered Noise Swell (Rushing air windup)
    noise_raw = np.random.uniform(-1.0, 1.0, n_samples)
    noise_amp = 0.22 * (t / duration) ** 3.0
    noise_part = noise_raw * noise_amp

    # 4. Climax Drop Impact Transient (At duration - 0.15s)
    impact = np.zeros(n_samples, dtype=np.float32)
    impact_idx = max(0, int((duration - 0.22) * sr))
    impact_len = n_samples - impact_idx
    if impact_len > 0:
        imp_t = np.linspace(0, impact_len / sr, impact_len, endpoint=False)
        # Deep 55Hz sub drop with exponential decay
        sub_drop = 0.65 * np.exp(-imp_t * 9.0) * np.sin(2 * np.pi * 55 * imp_t)
        # Crisp mid punch click
        punch = 0.35 * np.exp(-imp_t * 35.0) * np.sin(2 * np.pi * 140 * imp_t)
        impact[impact_idx:] = sub_drop + punch

    # Stereo Spatialization (Riser pans slightly from left to right as tension mounts)
    pan = 0.5 + 0.35 * (t / duration) # 0.5 (center) -> 0.85 (right)
    left = drone * 0.7 + sweep * (1.0 - pan) + noise_part * 0.5 + impact * 0.5
    right = drone * 0.7 + sweep * pan + noise_part * 0.5 + impact * 0.5

    # Peak normalization
    left = np.clip(left, -0.92, 0.92)
    right = np.clip(right, -0.92, 0.92)

    interleaved = np.empty((n_samples, 2), dtype=np.int16)
    interleaved[:, 0] = (left * 32767).astype(np.int16)
    interleaved[:, 1] = (right * 32767).astype(np.int16)

    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(interleaved.tobytes())

    return out_path

def generate_whoosh(
    duration: float = 0.38,
    out_path: Optional[str] = None,
    sr: int = 48000
) -> str:
    """Generate a clean cinematic whoosh transition sound effect for inter-beat cuts."""
    if out_path is None:
        out_path = f"/tmp/whoosh_{int(duration * 1000)}.wav"
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

    n_samples = int(sr * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)

    # Bell-shaped amplitude envelope
    mid = duration * 0.5
    env = np.exp(-((t - mid) / (duration * 0.28)) ** 2)

    # Pitch sweep down from 700Hz to 120Hz
    f_sweep = 700.0 - 580.0 * (t / duration)
    phase = 2 * np.pi * np.cumsum(f_sweep) / sr
    sweep = 0.30 * env * np.sin(phase)

    # Noise whoosh
    noise = np.random.uniform(-1.0, 1.0, n_samples)
    noise_part = 0.40 * env * noise

    # Sub whoosh thud at midpoint
    sub = 0.35 * env * np.sin(2 * np.pi * 65 * t)

    mix = np.clip(sweep + noise_part + sub, -0.92, 0.92)
    pcm = (mix * 32767).astype(np.int16)

    # Stereo stereo spread
    pan = np.linspace(0.2, 0.8, n_samples)
    interleaved = np.empty((n_samples, 2), dtype=np.int16)
    interleaved[:, 0] = (pcm * (1.0 - pan)).astype(np.int16)
    interleaved[:, 1] = (pcm * pan).astype(np.int16)

    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(interleaved.tobytes())

    return out_path

def generate_impact_hit(
    duration: float = 1.2,
    out_path: Optional[str] = None,
    sr: int = 48000
) -> str:
    """Generate a deep cinematic payoff impact boom for clip conclusions."""
    if out_path is None:
        out_path = f"/tmp/impact_hit_{int(duration * 1000)}.wav"
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

    n_samples = int(sr * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)

    # Deep sub-bass boom decaying over 1 second
    decay = np.exp(-t * 3.8)
    sub = 0.70 * decay * np.sin(2 * np.pi * 50 * t)

    # Mid frequency body
    mid_decay = np.exp(-t * 9.0)
    mid = 0.25 * mid_decay * np.sin(2 * np.pi * 115 * t)

    # Initial transient crack
    crack_decay = np.exp(-t * 40.0)
    crack = 0.20 * crack_decay * np.random.uniform(-1.0, 1.0, n_samples)

    mix = np.clip(sub + mid + crack, -0.92, 0.92)
    pcm = (mix * 32767).astype(np.int16)

    interleaved = np.empty((n_samples, 2), dtype=np.int16)
    interleaved[:, 0] = pcm
    interleaved[:, 1] = pcm

    with wave.open(out_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(interleaved.tobytes())

    return out_path

def mix_voice_with_riser(
    voice_wav: str,
    riser_wav: str,
    out_wav: str,
    ffmpeg_path: str = "ffmpeg"
) -> str:
    """Mix spoken voiceover with tension riser audio using FFmpeg audio ducking."""
    Path(out_wav).parent.mkdir(parents=True, exist_ok=True)

    # Voice at 0dB, Riser at -11dB ducked to -18dB during active speech, swelling at end
    filter_complex = (
        "[1:a]volume=0.32[riser];"
        "[0:a]volume=1.0[voice];"
        "[voice][riser]amix=inputs=2:duration=first:dropout_transition=2[out]"
    )

    cmd = [
        ffmpeg_path, "-y",
        "-i", voice_wav,
        "-i", riser_wav,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:a", "pcm_s16le",
        "-ar", "48000",
        "-ac", "2",
        out_wav
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return out_wav
