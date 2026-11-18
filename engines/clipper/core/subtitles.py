"""Creator-grade ASS Subtitle & Vector Hook Badge Engine.
Renders precise word-by-word kinetic pop captions with custom color palettes,
highlight words, and vector rounded rectangle hook cards.
"""
import re
import struct
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from PIL import ImageFont

from .config import FONTS_DIR, OUT_W, OUT_H

# ASS colors are &HBBGGRR&
STYLES = {
    "bounce": {
        "label": "Bounce",
        "font": "Poppins ExtraBold",
        "size": 132,
        "base": "FFFFFF",
        "active": "00F0FF",      # Electric Cyan
        "strong": "00D7FF",      # Neon Gold
        "outline": 7,
        "pop": 112,
        "upper": True,
        "per": 3
    },
    "hype": {
        "label": "Hype",
        "font": "Anton",
        "size": 148,
        "base": "FFFFFF",
        "active": "3C3CFF",      # High Energy Crimson Red
        "strong": "00D7FF",      # Gold Accent
        "outline": 7,
        "pop": 114,
        "upper": True,
        "per": 2
    },
    "clean": {
        "label": "Clean",
        "font": "Poppins ExtraBold",
        "size": 100,
        "base": "FFFFFF",
        "active": "6BD7FF",      # Sky Cyan
        "strong": "FFFFFF",
        "outline": 5,
        "pop": 106,
        "upper": False,
        "per": 4
    },
    "hormozi": {
        "label": "Hormozi",
        "font": "Impact",
        "size": 140,
        "base": "FFFFFF",
        "active": "00E5FF",      # Bright Yellow/Gold
        "strong": "00FF7F",      # Spring Green
        "outline": 8,
        "pop": 115,
        "upper": True,
        "per": 3
    }
}

HOOK_STYLE = {
    "font": "Poppins ExtraBold",
    "size": 96,
    "ink": "14100E",
    "box": "FFFFFF",
    "pad_x": 36,
    "pad_y": 22,
    "radius": 26,
    "max_w": 900
}

FONT_FILES = {
    "Poppins ExtraBold": "Poppins-ExtraBold.ttf",
    "Anton": "Anton-Regular.ttf",
    "Archivo Black": "ArchivoBlack-Regular.ttf",
    "Impact": "Impact.ttf",
    "ArialBlack": "ArialBlack.ttf"
}

CAP_MAX_W = 960

class _Font:
    """Measures font metrics from TrueType tables and PIL so words never jitter or shift during pop animation."""
    _cache: Dict[str, Any] = {}

    def __init__(self, name: str):
        path = FONTS_DIR / FONT_FILES.get(name, "Poppins-ExtraBold.ttf")
        if not path.exists():
            path = Path("/System/Library/Fonts/Supplemental/Impact.ttf")

        d = path.read_bytes()
        tables = {}
        for i in range(struct.unpack(">H", d[4:6])[0]):
            tag, _, off, _ = struct.unpack(">4sIII", d[12 + 16 * i: 28 + 16 * i])
            tables[tag] = off
        self.upm = struct.unpack(">H", d[tables[b"head"] + 18: tables[b"head"] + 20])[0]
        o = tables[b"OS/2"]
        self.asc, self.desc = struct.unpack(">HH", d[o + 74: o + 78])
        self.cap = struct.unpack(">h", d[o + 88: o + 90])[0] or int(self.upm * 0.7)
        self.path = str(path)
        self._pil_font = ImageFont.truetype(self.path, 200)

    @classmethod
    def get(cls, name: str):
        if name not in cls._cache:
            try:
                cls._cache[name] = cls(name)
            except Exception:
                cls._cache[name] = cls("Poppins ExtraBold")
        return cls._cache[name]

    def em(self, size: float) -> float:
        return size * self.upm / (self.asc + self.desc)

    def width(self, text: str, size: float) -> float:
        try:
            return self._pil_font.getlength(text) * self.em(size) / 200
        except Exception:
            return len(text) * self.em(size) * 0.62

    def cap_shift(self, size: float) -> float:
        return ((self.asc - self.desc) / 2 - self.cap / 2) * size / (self.asc + self.desc)

def _clean_text(text: Any) -> str:
    return re.sub(r"[\x00-\x1f\x7f]+", " ", re.sub(r"[{}\\]", "", str(text or ""))).strip()

def _clean_key(word: str) -> str:
    return re.sub(r"[^a-z0-9']", "", word.lower())

def _format_ts(t: float) -> str:
    t = max(0.0, t)
    h, m = int(t // 3600), int(t % 3600 // 60)
    return f"{h}:{m:02d}:{t % 60:05.2f}"

def _build_hook_events(hook: str, duration: float, y: float) -> List[str]:
    f, size = _Font.get(HOOK_STYLE["font"]), HOOK_STYLE["size"]
    words = hook.split()
    if not words:
        return []

    lines = [" ".join(words)]
    if f.width(lines[0], size) > HOOK_STYLE["max_w"] and len(words) > 1:
        cut = min(
            range(1, len(words)),
            key=lambda i: max(f.width(" ".join(words[:i]), size), f.width(" ".join(words[i:]), size))
        )
        lines = [" ".join(words[:cut]), " ".join(words[cut:])]

    widest = max(f.width(l, size) for l in lines)
    if widest > HOOK_STYLE["max_w"]:
        size = max(40, int(size * HOOK_STYLE["max_w"] / widest))
        widest = max(f.width(l, size) for l in lines)

    line_h = f.em(size) * 1.16
    bw, bh = widest + 2 * HOOK_STYLE["pad_x"], line_h * len(lines) + 2 * HOOK_STYLE["pad_y"]
    x0, y0, r = (OUT_W - bw) / 2, y - bh / 2, min(HOOK_STYLE["radius"], bh / 2)
    x1, y1 = x0 + bw, y0 + bh
    n = lambda v: f"{v:.0f}"

    box_path = (
        f"m {n(x0 + r)} {n(y0)} l {n(x1 - r)} {n(y0)} b {n(x1)} {n(y0)} {n(x1)} {n(y0)} {n(x1)} {n(y0 + r)} "
        f"l {n(x1)} {n(y1 - r)} b {n(x1)} {n(y1)} {n(x1)} {n(y1)} {n(x1 - r)} {n(y1)} "
        f"l {n(x0 + r)} {n(y1)} b {n(x0)} {n(y1)} {n(x0)} {n(y1)} {n(x0)} {n(y1 - r)} "
        f"l {n(x0)} {n(y0 + r)} b {n(x0)} {n(y0)} {n(x0)} {n(y0)} {n(x0 + r)} {n(y0)}"
    )

    span = f"{_format_ts(0)},{_format_ts(duration)}"
    events = [
        f"Dialogue: 3,{span},Hook,,0,0,0,,{{\\an7\\pos(0,0)\\fad(160,0)\\c&H{HOOK_STYLE['box']}&\\p1}}{box_path}{{\\p0}}"
    ]
    for i, line in enumerate(lines):
        cy = y - line_h * (len(lines) - 1) / 2 + i * line_h - f.cap_shift(size)
        events.append(f"Dialogue: 4,{span},Hook,,0,0,0,,{{\\an5\\pos({OUT_W // 2},{cy:.0f})\\fad(160,0)\\fs{size}}}{line}")
    return events

def _group_words(words: List[Dict[str, Any]], per: int) -> List[List[Dict[str, Any]]]:
    out, cur = [], []
    for w in words:
        if cur and (
            len(cur) >= per or
            sum(len(x["w"]) for x in cur) + len(w["w"]) > 16 or
            w["s"] - cur[-1]["e"] > 0.45 or
            cur[-1]["w"][-1:] in ".?!"
        ):
            out.append(cur)
            cur = []
        cur.append(w)
    if cur:
        out.append(cur)
    return out

def _word_time(w: Dict[str, Any], key1: str, key2: str, default: float = 0.0) -> float:
    v = w.get(key1)
    if v is not None:
        try:
            return float(v)
        except (ValueError, TypeError):
            pass
    v = w.get(key2)
    if v is not None:
        try:
            return float(v)
        except (ValueError, TypeError):
            pass
    return default

def build_ass_subtitles(
    words: List[Dict[str, Any]],
    start: float,
    end: float,
    hook: str,
    style_name: str = "bounce",
    highlight_words: Optional[List[str]] = None,
    hook_y: float = 300,
    cap_y: float = 1380,
    beat_badge: Optional[str] = None,
    hook_duration: Optional[float] = None
) -> str:
    """Generate complete ASS subtitle script with vector hook badge and word-pop animations.
    hook_duration limits how long the hook headline stays on screen (default: whole segment)."""
    st = STYLES.get(style_name.lower(), STYLES["bounce"])
    strong_set = {_clean_key(h) for h in (highlight_words or []) if _clean_key(h)}

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {OUT_W}
PlayResY: {OUT_H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{st['font']},{st['size']},&H00{st['base']},&H00{st['base']},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,{st['outline']},0,5,0,0,0,1
Style: Hook,{HOOK_STYLE['font']},{HOOK_STYLE['size']},&H00{HOOK_STYLE['ink']},&H00{HOOK_STYLE['ink']},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1
Style: BeatBadge,Poppins ExtraBold,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,4,0,7,50,0,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    duration = end - start
    events = _build_hook_events(_clean_text(hook), min(duration, hook_duration or duration), hook_y)

    if beat_badge:
        clean_badge = _clean_text(beat_badge).upper()
        events.append(f"Dialogue: 3,{_format_ts(0.0)},{_format_ts(duration)},BeatBadge,,0,0,0,,{{\\an7\\pos(64,96)\\c&H00F0FF&\\shad1\\4c&H80000000&}}⚡ {clean_badge}")
    f = _Font.get(st["font"])

    inside = []
    for w in words:
        s_val = _word_time(w, "s", "start", 0.0)
        e_val = _word_time(w, "e", "end", s_val + 0.3)
        text_val = _clean_text(w.get("w") if w.get("w") is not None else w.get("word", ""))
        if s_val >= start - 0.05 and s_val < end and text_val:
            inside.append({"w": text_val, "s": s_val, "e": e_val})

    inside = sorted(inside, key=lambda w: w["s"])

    for i, w in enumerate(inside[:-1]):
        w["e"] = max(w["s"], min(w["e"], inside[i + 1]["s"]))

    groups = _group_words(inside, st["per"])
    for gi, g in enumerate(groups):
        g_start = max(0.0, g[0]["s"] - start)
        g_end = min(g[-1]["e"] + 0.25, (groups[gi + 1][0]["s"] - start) if gi + 1 < len(groups) else duration)
        if g_end - g_start < 0.02:
            continue

        texts = [re.sub(r"[.,;:]+$", "", x["w"]).upper() if st["upper"] else re.sub(r"[.,;:]+$", "", x["w"]) for x in g]
        size = st["size"]
        gap = f.width("n n", size) - 2 * f.width("n", size) + (2 * st["outline"] + 6) * size / st["size"]
        total = sum(f.width(t, size) for t in texts) + gap * (len(texts) - 1)

        if total > CAP_MAX_W:
            size = max(36, int(size * CAP_MAX_W / total))
            gap = f.width("n n", size) - 2 * f.width("n", size) + (2 * st["outline"] + 6) * size / st["size"]
            total = sum(f.width(t, size) for t in texts) + gap * (len(texts) - 1)

        cy = cap_y - f.cap_shift(size)
        x = (OUT_W - total) / 2

        for i, (w, t) in enumerate(zip(g, texts)):
            wd = f.width(t, size)
            p = max(104, min(st["pop"], 100 + int(2200 / max(wd, 1))))
            pos = f"\\an5\\pos({x + wd / 2:.0f},{cy:.0f})\\fs{size}"
            x += wd + gap
            a = max(g_start, w["s"] - start)
            b = (g[i + 1]["s"] - start) if i + 1 < len(g) else g_end
            base_col = st["strong"] if _clean_key(w["w"]) in strong_set else st["base"]

            if a - g_start >= 0.02:
                events.append(f"Dialogue: 1,{_format_ts(g_start)},{_format_ts(a)},Cap,,0,0,0,,{{{pos}\\c&H{base_col}&}}{t}")
            if b - a >= 0.02:
                events.append(
                    f"Dialogue: 2,{_format_ts(a)},{_format_ts(b)},Cap,,0,0,0,,{{{pos}\\c&H{st['active']}&\\fscx94\\fscy94"
                    f"\\t(0,90,\\fscx{p}\\fscy{p})\\t(90,200,\\fscx{p - 5}\\fscy{p - 5})}}{t}"
                )
            if g_end - b >= 0.02:
                events.append(
                    f"Dialogue: 1,{_format_ts(b)},{_format_ts(g_end)},Cap,,0,0,0,,{{{pos}\\c&H{base_col}&\\fscx{p - 5}\\fscy{p - 5}"
                    f"\\t(0,90,\\fscx100\\fscy100)}}{t}"
                )

    return header + "\n".join(events) + "\n"
