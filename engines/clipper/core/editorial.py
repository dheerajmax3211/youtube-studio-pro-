"""Editorial rules that decide exactly where a clip starts and ends.

A clip is always a run of whole sentences:
- it never starts on a dangling connective ("And...", "But...", "That's why...")
  without the sentence that gives it context,
- it never ends on an unfinished thought ("...and the best part is", "...the reason is,"),
- if it is too long it loses sentences from the FRONT, never the payoff at the end,
- the final cut points are moved off the transcript's approximate word times onto
  real silence in the audio, so no syllable gets clipped and no breath is left dangling.
"""
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np

TERMINAL = (".", "?", "!")
_TRAIL = "\"')]”’"

DANGLING_START_WORDS = {
    "and", "but", "so", "because", "cause", "'cause", "or", "which", "then",
    "also", "plus", "nor", "yet", "whereas", "although", "though",
}
FILLER_OPENERS = {
    "yeah", "yes", "yep", "yup", "no", "nope", "okay", "ok", "oh", "um", "uh", "well", "right",
    "alright", "exactly", "true", "sure", "wow", "whoa", "dude", "bro", "man", "hey", "hmm", "ah",
}
DANGLING_START_PHRASES =("that's why", "that is why", "this is why", "which is why", "and so")

DANGLING_END_WORDS = {
    "and", "but", "so", "or", "because", "the", "a", "an", "to", "of", "with", "for",
    "in", "on", "at", "from", "that", "which", "if", "like", "is", "was", "are", "were",
    "um", "uh", "my", "your", "our", "their", "his", "her", "its", "this", "these", "those",
    "than", "as", "about", "into", "when", "while", "where", "whether", "just",
}


def _strip(word: str) -> str:
    return word.rstrip(_TRAIL)


def _ends_terminal(word: str) -> bool:
    return _strip(word).endswith(TERMINAL)


def build_sentences(words: List[Dict[str, Any]], max_len: float = 20.0) -> List[Dict[str, Any]]:
    """Group transcript words into sentences: {id, s, e, text, w0, w1}.

    Uses punctuation when the transcript has it, otherwise speech pauses.
    Very long unpunctuated runs are split at the best pause after max_len seconds.
    """
    if not words:
        return []
    punctuated = sum(1 for w in words if _ends_terminal(w["w"])) >= max(2, len(words) // 80)
    pause = 1.0 if punctuated else 0.6

    sentences: List[Dict[str, Any]] = []
    start_idx = 0

    def flush(end_idx: int):
        chunk = words[start_idx:end_idx + 1]
        prev_terminal = sentences[-1]["terminal"] if sentences else True
        sentences.append({
            "id": len(sentences),
            "s": float(chunk[0]["s"]),
            "e": float(chunk[-1]["e"]),
            "text": " ".join(w["w"] for w in chunk),
            "w0": start_idx,
            "w1": end_idx,
            # In punctuated transcripts a pause-split is mid-sentence: not a clean boundary.
            "terminal": (not punctuated) or _ends_terminal(chunk[-1]["w"]),
            "continues": punctuated and not prev_terminal,
        })

    for i, w in enumerate(words):
        gap = (words[i + 1]["s"] - w["e"]) if i + 1 < len(words) else 99.0
        cur_len = w["e"] - words[start_idx]["s"]
        next_len = (words[i + 1]["e"] - words[start_idx]["s"]) if i + 1 < len(words) else 0.0
        boundary = (
            (punctuated and _ends_terminal(w["w"]))
            or gap >= pause
            or (cur_len >= max_len and gap >= 0.25)
            or next_len > max_len * 1.5
        )
        if boundary or i == len(words) - 1:
            flush(i)
            start_idx = i + 1

    # ASR sometimes puts a full stop mid-sentence; a lowercase next word gives it away.
    if punctuated:
        for prev, cur in zip(sentences, sentences[1:]):
            first = cur["text"].lstrip("\"'“‘")[:1]
            if first.isalpha() and first.islower():
                cur["continues"] = True
                prev["terminal"] = False
    return sentences


def is_complete_end(sentence: Dict[str, Any]) -> bool:
    """True when the sentence lands a finished thought."""
    text = sentence["text"].strip()
    if not text or sentence.get("terminal") is False:
        return False
    if _strip(text).endswith(TERMINAL):
        return True
    if _strip(text).endswith((",", ";", ":", "-", "—")):
        return False
    last = _strip(text.split()[-1]).strip(".,;:!?").lower()
    return last not in DANGLING_END_WORDS


def starts_dangling(sentence: Dict[str, Any]) -> bool:
    """True when the sentence leans on something said before it."""
    if sentence.get("continues"):
        return True
    text = sentence["text"].strip().lower().lstrip("\"'“‘")
    if text.startswith(DANGLING_START_PHRASES):
        return True
    tokens = text.split()
    if not tokens:
        return False
    first = tokens[0].strip(".,;:!?")
    if first in DANGLING_START_WORDS:
        return True
    # "Who has won seven gold medals." is the tail of an earlier sentence; "Who can do it?" is a real opener.
    if first in ("who", "whose", "whom") and not _strip(text).endswith("?"):
        return True
    # "Yeah, ...", "Okay, ...", "Oh my gosh." — a reply/reaction, not an opening.
    if first in FILLER_OPENERS and (tokens[0].endswith((",", ".", "!", "?")) or len(tokens) <= 4):
        return True
    return False


def span(sentences: Sequence[Dict[str, Any]], i0: int, i1: int) -> float:
    return float(sentences[i1]["e"] - sentences[i0]["s"])


def fit_range(
    sentences: Sequence[Dict[str, Any]],
    i0: int,
    i1: int,
    min_len: float,
    max_len: float,
) -> Tuple[int, int]:
    """Adjust a sentence range [i0, i1] so it is a self-contained clip within length limits."""
    n = len(sentences)
    if n == 0:
        return 0, 0
    i0, i1 = max(0, min(i0, n - 1)), max(0, min(i1, n - 1))
    if i1 < i0:
        i0, i1 = i1, i0

    # 1. Give a dangling opener its context.
    while starts_dangling(sentences[i0]) and i0 > 0 and span(sentences, i0 - 1, i1) <= max_len:
        i0 -= 1

    # 2. Never end on an unfinished thought (extend up to 3 sentences, even past max; front gets trimmed).
    extra = 0
    while not is_complete_end(sentences[i1]) and i1 + 1 < n and extra < 3:
        i1 += 1
        extra += 1

    # 3. Too long: cut from the front, keep the payoff.
    while span(sentences, i0, i1) > max_len and i0 < i1:
        i0 += 1
    if starts_dangling(sentences[i0]) and i0 < i1 and span(sentences, i0 + 1, i1) >= min_len:
        i0 += 1

    # 4. Too short: grow forward to the next complete ending, else backward for context.
    while span(sentences, i0, i1) < min_len:
        j = i1 + 1
        while j < n and not is_complete_end(sentences[j]):
            j += 1
        if j < n and span(sentences, i0, j) <= max_len:
            i1 = j
            continue
        if i0 > 0 and span(sentences, i0 - 1, i1) <= max_len:
            i0 -= 1
            while starts_dangling(sentences[i0]) and i0 > 0 and span(sentences, i0 - 1, i1) <= max_len:
                i0 -= 1
            continue
        break
    return i0, i1


def normalize_segments(ranges: Sequence[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """Sort sentence ranges chronologically and merge overlapping/adjacent ones."""
    clean = sorted((max(0, int(a)), int(b)) for a, b in ranges if int(b) >= max(0, int(a)))
    merged: List[Tuple[int, int]] = []
    for a, b in clean:
        if merged and a <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))
    return merged


# ---------------------------------------------------------------- audio-level cut refinement

HOP = 0.02  # 20 ms analysis frames


def frame_rms(audio: np.ndarray, sr: int = 16000, hop: float = HOP) -> np.ndarray:
    """Per-frame RMS (0..1) of int16 or float audio."""
    x = audio.astype(np.float32)
    if audio.dtype == np.int16:
        x = x / 32768.0
    step = max(1, int(sr * hop))
    n = len(x) // step
    if n == 0:
        return np.zeros(1, dtype=np.float32)
    return np.sqrt((x[: n * step].reshape(n, step) ** 2).mean(axis=1) + 1e-12).astype(np.float32)


def quiet_mask(rms: np.ndarray) -> np.ndarray:
    floor = float(np.percentile(rms, 10))
    speech = float(np.percentile(rms, 95))
    thresh = max(floor * 3.0, speech * 0.08, 1e-4)
    return rms < thresh


def snap_end_to_silence(
    rms: np.ndarray, t: float, max_shift: float = 0.6, hop: float = HOP,
    min_quiet: float = 0.1, tail: float = 0.12,
) -> float:
    """Move a cut that follows the last word to where the voice actually stops."""
    quiet = quiet_mask(rms)
    i = int(t / hop)
    hi = min(len(rms), int((t + max_shift) / hop))
    need = max(1, int(min_quiet / hop))
    run = 0
    for k in range(max(0, i), hi):
        run = run + 1 if quiet[k] else 0
        if run >= need:
            onset = (k - need + 1) * hop
            return round(onset + tail, 3)
    return round(t + max_shift, 3)


def snap_start_to_silence(
    rms: np.ndarray, t: float, max_shift: float = 0.4, hop: float = HOP, preroll: float = 0.08,
) -> float:
    """Move a cut that precedes the first word back to where the voice actually starts."""
    quiet = quiet_mask(rms)
    i = min(len(rms) - 1, int(t / hop))
    lo = max(0, int((t - max_shift) / hop))
    j = i
    while j > lo and not quiet[j]:
        j -= 1
    if quiet[j]:
        return round(max(0.0, j * hop + hop - preroll), 3)
    return round(max(0.0, t - min(0.05, max_shift)), 3)


def word_aligned_window(words: List[Dict[str, Any]], s: float, e: float, max_back: float = 1.5) -> Tuple[float, float]:
    """Adjust a time window so it starts at a word start and ends right after a word that
    closes a phrase (punctuation or a pause), never in the middle of a word or phrase."""
    idx = [i for i, w in enumerate(words) if w["e"] > s and w["s"] < e]
    if not idx:
        return s, e
    i0, i1 = idx[0], idx[-1]
    if words[i1]["e"] > e + 0.6 and i1 > i0:
        i1 -= 1

    def closes(i):
        gap = (words[i + 1]["s"] - words[i]["e"]) if i + 1 < len(words) else 9.0
        return _strip(words[i]["w"]).endswith((".", "!", "?", ",")) or gap >= 0.25

    # Start on a phrase start: skip forward past the tail of a phrase already in progress.
    if i0 > 0 and not closes(i0 - 1):
        k = i0
        while k < i1 and not closes(k) and words[k]["s"] - words[i0]["s"] < max_back:
            k += 1
        if closes(k) and k + 1 <= i1:
            i0 = k + 1
    s = float(words[i0]["s"])

    j = i1
    while j > i0 and not closes(j) and words[i1]["e"] - words[j]["e"] < max_back:
        j -= 1
    end_i = j if closes(j) else i1
    e = float(words[end_i]["e"]) + 0.05
    if end_i + 1 < len(words):
        e = min(e, float(words[end_i + 1]["s"]) - 0.02)
    return round(s, 3), round(e, 3)
