"""Clip curation: decides WHICH moments become clips and exactly where they start and end.

Pipeline
1. Speech: transcript split into numbered sentences (core.editorial.build_sentences).
2. Sight: a visual timeline of what happens on screen (core.visual) is merged in, so
   payoffs that are only SEEN (someone wins, falls, crosses the line) are not missed.
3. Story map: one pass over the WHOLE video splits it into distinct stories (each
   challenge / anecdote / topic) and picks at most one clip per story, each built as
   setup (who, what, stakes) -> development -> visible/said outcome -> reaction.
4. Review: a second pass reads each draft as a stranger would, with frames from the
   clip, and must state the clip's point. Clips without a clear point are dropped;
   weak openings/endings are moved to the right sentence.
5. Local rules enforce whole sentences, no filler/dangling openers, no unfinished
   endings, length limits (trim the front, never the payoff), one clip per story.
6. Every clip gets a cold-open hook: the most gripping line or visual moment inside it.
7. Cut points are moved from approximate word times onto real silence in the audio.
"""
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from .ai_client import MultiAIClient
from .config import DEFAULT_AI_PROVIDER, DEFAULT_MODEL, DEFAULT_OPENROUTER_KEY, PROJECTS_DIR
from .editorial import (
    build_sentences,
    fit_range,
    frame_rms,
    is_complete_end,
    normalize_segments,
    snap_end_to_silence,
    snap_start_to_silence,
    span,
    starts_dangling,
    word_aligned_window,
)
from .visual import VideoAnalyzer, VisionClient, frame_at, scene_changes, snap_to_scene_cuts

CATEGORIES = {"funny", "fail", "clutch", "rage", "shock", "take", "story", "insight", "challenge", "other"}
COLD_OPEN_MIN, COLD_OPEN_MAX = 1.5, 7.0
VISUAL_TEASER = (1.6, 2.2)  # seconds before / after a visual peak used as the teaser
SCORE_WEIGHTS = {"hook": 0.3, "flow": 0.2, "value": 0.4, "trend": 0.1}
JUDGE_MODEL = os.getenv("CLIP_JUDGE_MODEL", "google/gemini-2.5-pro")  # stronger model for story map + final judging
AD_PATTERN = re.compile(r"\b(sponsor(ed)?|promo code|use code|link in the description|scan the qr|start your (free )?(trial|store)|"
                        r"shopify|squarespace|nordvpn|raid shadow|honey\b|brilliant\.org|audible|hellofresh)\b", re.I)
MAX_PROMPT_SENTENCES = 6000  # beyond this (~3h of speech) the video is processed in chunks

MAP_SCHEMA = {
    "type": "object",
    "properties": {"stories": {"type": "array", "items": {"type": "object", "properties": {
        "story": {"type": "integer"}, "name": {"type": "string"},
        "from": {"type": "integer"}, "to": {"type": "integer"},
        "stakes": {"type": "string"}, "outcome": {"type": "string"},
        "has_clear_outcome": {"type": "boolean"}, "short_potential": {"type": "integer"}},
        "required": ["story", "name", "from", "to", "stakes", "outcome", "has_clear_outcome", "short_potential"]}}},
    "required": ["stories"],
}

MAP_PROMPT = """You are the head editor of a top short-form channel. Map this whole video into its distinct stories so each can become its own Short.

Timeline of "{title}" ({duration_min:.0f} min):
- `#id [start-end] text` = a spoken sentence (seconds). (LOUD) = shouting, laughter, cheering.
- `   SEEN [t] ...` = what is visible on screen at second t, "action" 0-10.

A story is one self-contained unit: one challenge/attempt, one anecdote, one argument, one tutorial step, one joke. Cover the whole video; stories must not overlap.
A story starts where THIS story is introduced, never at a video-wide intro that previews several stories.
Sponsor reads, ads, channel intros/outros and "subscribe" segments are their own stories: name them starting with "AD:" and give short_potential 0.
For each story give: story (number), name, from/to (sentence ids covering ALL of it, from the moment it is introduced to the final reaction), stakes (what is at stake / the question), outcome (how it ends, said or seen), has_clear_outcome, short_potential 0-100 (how strong it is as a standalone Short: clear stakes, tension, satisfying payoff, emotion).

Return JSON: {{"stories": [...]}}

<timeline>
{timeline}
</timeline>
"""

COMPOSE_PROMPT = """You are editing ONE story from a long video into a {min_len}-{max_len} second Short that a stranger understands with zero context.

Story: "{name}". Stakes: {stakes}. Outcome: {outcome}.
Its timeline (`#id [start-end] text` = spoken sentence; `SEEN [t]` = what is on screen at second t, action 0-10):
{timeline}

Build the clip from up to three ranges of consecutive sentence ids, in chronological order. "from"/"to" are SENTENCE IDS (the number after #, between {first_id} and {last_id}), never seconds:
- setup (REQUIRED, 3-15 s): the sentences where WHO, WHAT and the STAKES are stated plainly, ideally the host explaining the challenge and the prize. The stakes must be those of the SAME attempt the payoff shows: if the story has several rounds (e.g. four beams, several shots), use the lines that set up the round you show in the payoff (or its prize), not an earlier round. It must open on a strong, complete line: never on filler or a reply ("Yeah", "Okay", "Yes", "Oh"), never on a line that needs earlier context.
- middle (optional): the key escalation/tension, only if time allows.
- payoff (REQUIRED): the decisive ACTION itself (the attempt, the shot, the walk, the argument's turning point: start it at least 8-15 s before the outcome so the viewer watches it happen), then the OUTCOME (said or seen), then 1-3 sentences of reaction/confirmation ("She did it!", the prize or donation line). Its last sentence must close the story. Use the SEEN lines to find when the outcome happens and make sure the payoff ends AFTER it.
- The setup must be about THIS story only: never a video-wide intro that lists other people or other challenges, never a sponsor read.
{mode_rules}
Also return:
- outcome_time: the second the outcome happens (from SEEN or speech).
- The teaser (cold_open / cold_open_time) must come from the tension BEFORE outcome_time: it should make people need to see the result, never reveal it.
- cold_open: id of the most gripping 2-7 s sentence near the climax (not the clip's first sentence) or -1; cold_open_time: second of the most dramatic visual moment (action >= 7) inside the clip, or -1. This is the teaser shown before the clip.
- point: the one-sentence takeaway ("A former foster kid crosses a 1.5-inch beam and wins $100,000 for foster children").
- hook_title: on-screen headline, max 8 words, concrete stakes ("Cross a 1.5-inch beam for $100K"). hook: 2-4 word ALL CAPS badge. hook_narration: 12-20 word voice-over of the stakes.
- hook_score, flow_score, value_score, trend_score (0-100), title (<70 chars), description, hashtags (5, no #), highlight_words (4-6 spoken words), category (funny, fail, clutch, rage, shock, take, story, insight, challenge, other).

{feedback}
Return JSON: {{"setup": {{"from": 0, "to": 0}}, "middle": null, "payoff": {{"from": 0, "to": 0}}, "outcome_time": 0, "cold_open": -1, "cold_open_time": -1, "point": "", "hook_title": "", "hook": "", "hook_narration": "", "hook_score": 0, "flow_score": 0, "value_score": 0, "trend_score": 0, "title": "", "description": "", "hashtags": [], "highlight_words": [], "category": ""}}
"""

COMPOSE_MODE_RULES = {
    "story_arc": "Use separate setup / middle / payoff ranges when the story is longer than the limit; if it fits, setup and payoff may simply be one continuous run.",
    "single_moment": "The final clip must be ONE continuous run: setup, middle and payoff must be adjacent (payoff.from = setup.to + 1 or middle.to + 1).",
}

JUDGE_PROMPT = """You are the final quality gate for a Shorts channel. Each clip below is shown EXACTLY as it will be published: the teaser that plays first, then the clip's sentences in order (`#id [start-end] text`), with "--- JUMP CUT ---" where footage was removed, and what is visible on screen (`SEEN [t]`). Frames from each clip follow the text.

Judge each clip as a viewer who has NEVER seen the source video. Be strict: publishing a clip without a point hurts the channel more than publishing nothing.
- is_ad: it is (or mostly is) a sponsor read, ad, channel intro/outro or a call to subscribe.
- delivers_point: the clip's STATED POINT (given above each clip) is clearly delivered by the end: the viewer could repeat it after watching. FAIL if the point is only implied, needs outside knowledge, is contradicted (e.g. scoreboard vs. speech), or the clip proves something else.
- matches_title: the clip really shows what its title and headline promise.
- opening_sets_stakes: within the first ~10 s the viewer learns who/what this is about and what is at stake. An opening that previews other stories or talks about the video as a whole FAILS.
- setup_matches_payoff: the setup and the payoff are about the same attempt / round / topic.
- shows_decisive_moment: the actual attempt / climax / key argument is in the clip, not only the setup and the aftermath.
- outcome_clear: the viewer knows how it ended (said or visible).
- ends_cleanly: the last line closes the story: not mid-thought, not the start of a new topic, not a cliffhanger. (A single SEEN frame in the clip's final second may already belong to the next shot of the source; judge the ending by what is said and shown before that.)
- jump_cuts_ok: after every jump cut the viewer can still follow.
- makes_sense: 0-10.
- problems: concrete problems naming sentence ids or seconds (e.g. "#640 opens on a video-wide intro", "the walk itself (#612-#628) is cut out"). Empty if none.
- summary: one sentence: what happens and how it ends.

Return JSON: {{"verdicts": [{{"index": 0, "is_ad": false, "delivers_point": true, "matches_title": true, "opening_sets_stakes": true, "setup_matches_payoff": true, "shows_decisive_moment": true, "outcome_clear": true, "ends_cleanly": true, "jump_cuts_ok": true, "makes_sense": 9, "problems": [], "summary": "..."}}]}}

{clips}
"""

JUDGE_CHECKS = ("delivers_point", "matches_title", "opening_sets_stakes", "setup_matches_payoff", "shows_decisive_moment",
                "outcome_clear", "ends_cleanly", "jump_cuts_ok")
PASS_SCORE = 8


def loud_zscore(db: np.ndarray) -> np.ndarray:
    if len(db) < 5:
        return np.zeros(len(db), dtype=np.float32)
    return (db - np.median(db)) / (db.std() + 1e-6)


def _sentence_loud(sentences: List[Dict[str, Any]], loud_z: np.ndarray) -> None:
    for s in sentences:
        seg = loud_z[int(s["s"]): int(s["e"]) + 1] if len(loud_z) else []
        s["loud"] = bool(len(seg) and float(np.max(seg)) > 1.5)
        s["energy"] = float(np.mean(seg)) if len(seg) else 0.0


def _as_list(result: Any, key: str) -> List[Dict[str, Any]]:
    if isinstance(result, dict):
        for k in (key, "items", "clips", "reviews"):
            if isinstance(result.get(k), list):
                return result[k]
        return []
    return result if isinstance(result, list) else []


def _int(v: Any, default: int = -1) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _float(v: Any, default: float = -1.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _overall_score(raw: Dict[str, Any]) -> int:
    total = sum(w * max(0, min(100, _int(raw.get(f"{k}_score"), 70))) for k, w in SCORE_WEIGHTS.items())
    potential = _int(raw.get("short_potential"), -1)
    if potential >= 0:  # how strong the story is, judged against the whole video
        total = 0.5 * total + 0.5 * potential
    sense = _int(raw.get("makes_sense"), -1)
    if sense >= 0:  # reviewer's "does it make sense" verdict weighs heavily
        total = 0.6 * total + 0.4 * sense * 10
    return int(round(total))


def visual_lines(frames: List[Dict[str, Any]], t0: float, t1: float) -> List[str]:
    return [f"   SEEN [{f['t']:.0f}] {f['desc']} (action {f['action']})" for f in frames if t0 <= f["t"] < t1]


class ViralityCurator:
    """Finds complete, self-contained clips and decides their exact cut points."""

    def __init__(
        self,
        project_id: str,
        provider: str = DEFAULT_AI_PROVIDER,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
    ):
        self.project_id = project_id
        self.project_dir = PROJECTS_DIR / project_id
        self.transcript_path = self.project_dir / "transcript.json"
        self.clips_path = self.project_dir / "clips.json"
        self.audio_path = self.project_dir / "audio.wav"
        self.provider = provider.lower()
        self.model = model
        self.api_key = api_key or (DEFAULT_OPENROUTER_KEY if self.provider == "openrouter" else None)
        if self.provider in ("gemini", "openai", "groq", "anthropic") and not self.api_key:
            env_key = os.getenv(f"{self.provider.upper()}_API_KEY", "")
            if env_key:
                self.api_key = env_key
                if self.provider == "gemini" and self.model.startswith("google/"):
                    self.model = self.model.split("/", 1)[1]
            elif DEFAULT_OPENROUTER_KEY:
                # "Auto (Gemini 2.5 Flash)" with no Gemini key: same model via the configured OpenRouter key.
                print(f"ℹ️ [Curator] No {self.provider} key set; using OpenRouter ({model}).", flush=True)
                self.provider, self.api_key = "openrouter", DEFAULT_OPENROUTER_KEY
                if "/" not in self.model:
                    self.model = DEFAULT_MODEL
        self.frames: List[Dict[str, Any]] = []
        self.video_path = self._video_path()
        self.title = ""

    def _video_path(self) -> str:
        try:
            meta = json.loads((self.project_dir / "metadata.json").read_text())
            if Path(meta.get("video_path", "")).exists():
                self.title = meta.get("title", "")
                return meta["video_path"]
        except Exception:
            pass
        local = self.project_dir / "source.mp4"
        return str(local) if local.exists() else ""

    # ------------------------------------------------------------------ public

    def curate_clips(
        self,
        min_duration: int = 25,
        max_duration: int = 60,
        target_clips: int = 3,
        curation_mode: str = "story_arc",
        force: bool = False,
    ) -> List[Dict[str, Any]]:
        if self.clips_path.exists() and not force:
            try:
                cached = json.loads(self.clips_path.read_text(encoding="utf-8")).get("clips", [])
                if cached and cached[0].get("engine") == "story_v4":
                    return cached
            except Exception:
                pass

        if not self.transcript_path.exists():
            raise FileNotFoundError(f"Transcript not found at {self.transcript_path}")
        t_data = json.loads(self.transcript_path.read_text(encoding="utf-8"))
        words = t_data.get("words", [])
        if not words:
            raise ValueError("No words found in transcript to curate.")

        duration = float(t_data.get("duration") or words[-1]["e"])
        loud_db = np.array(t_data.get("loudness_db") or [], dtype=np.float32)
        loud_z = loud_zscore(loud_db) if len(loud_db) else np.zeros(int(duration) + 1, dtype=np.float32)

        sentences = build_sentences(words)
        _sentence_loud(sentences, loud_z)

        min_len = float(min(min_duration, max(5.0, duration * 0.6)))
        max_len = float(max(min_len + 1.0, min(max_duration, duration)))

        use_ai = self.provider not in ("loudness", "none", "energy") and (self.api_key or self.provider == "ollama")
        rms = self._load_rms()

        def build(raw):
            return self._assemble(raw, sentences, words, rms, min_len, max_len, duration, curation_mode)

        clips: List[Dict[str, Any]] = []
        if use_ai:
            if self.video_path:
                try:
                    vc = VisionClient(self.provider, self.api_key, self.model)
                    self.frames = VideoAnalyzer(self.project_dir, self.video_path, vc).analyze(duration)
                except Exception as e:
                    print(f"⚠️ [Visual] analysis skipped ({e})", flush=True)
            try:
                clips = self._ai_curate(sentences, duration, min_len, max_len, target_clips, curation_mode, build)
            except Exception as e:
                print(f"⚠️ [Curator] AI curation failed ({e}); using local sentence/energy ranking.", flush=True)
                clips = []
        if not clips and not use_ai:
            clips = [c for c in (build(r) for r in self._local_pick(sentences, min_len, max_len, target_clips)) if c]

        clips = self._dedupe(clips)[:target_clips]
        clips.sort(key=lambda c: c["start"])  # publish in story order
        for i, c in enumerate(clips):
            c["id"] = f"clip_{i + 1}"
        print(f"✅ [Curator] {len(clips)} clips: " + " | ".join(f"{c['title']} ({c['duration']:.0f}s)" for c in clips),
              flush=True)

        self.clips_path.write_text(json.dumps({"clips": clips}, indent=2), encoding="utf-8")
        return clips

    # ------------------------------------------------------------------ AI passes

    def _client(self) -> MultiAIClient:
        return MultiAIClient(provider=self.provider, api_key=self.api_key, model=self.model)

    @staticmethod
    def _fmt(s: Dict[str, Any], tag: str = "") -> str:
        loud = "(LOUD) " if s.get("loud") else ""
        return f"#{s['id']} [{s['s']:.1f}-{s['e']:.1f}] {tag}{loud}{s['text'][:300]}"

    def _timeline(self, sents: List[Dict[str, Any]], tag: str = "") -> List[str]:
        """Sentences interleaved with what is seen on screen during/after each one."""
        out = []
        for i, s in enumerate(sents):
            out.append(self._fmt(s, tag))
            nxt = sents[i + 1]["s"] if i + 1 < len(sents) else s["e"] + 4
            out += visual_lines(self.frames, s["s"], max(s["e"], nxt))
        return out

    def _ai_curate(self, sentences, duration, min_len, max_len, target_clips, curation_mode, build):
        """Map stories -> compose -> assemble final cut -> judge -> repair once -> judge again."""
        from concurrent.futures import ThreadPoolExecutor
        stories = self._map_stories(sentences, duration)
        pool_size = min(len(stories), target_clips + 3, 9)
        queue = stories[:pool_size]
        approved: List[Dict[str, Any]] = []

        def compose_build(args):
            st, fb = args
            raw = self._compose(st, sentences, min_len, max_len, curation_mode, fb)
            return build(raw) if raw else None

        for attempt in range(2):  # first pass, then one repair pass with the judge's feedback
            jobs = [(st, st.get("_feedback", "")) for st in queue]
            with ThreadPoolExecutor(max_workers=4) as pool:
                cands = [c for c in pool.map(compose_build, jobs) if c]
            verdicts = self._judge(cands, sentences)
            retry = []
            for c, v in zip(cands, verdicts):
                c["makes_sense"] = v.get("makes_sense")
                c["review_summary"] = v.get("summary", "")
                c["judge"] = {k: v.get(k) for k in (*JUDGE_CHECKS, "is_ad", "problems")}
                if v["passed"]:
                    c["score"] = _overall_score({**c.get("_raw", {}), "makes_sense": v["makes_sense"]})
                    approved.append(c)
                    print(f"   ✅ PASS '{c['title']}' ({v['makes_sense']}/10): {v.get('summary', '')}", flush=True)
                else:
                    print(f"   ❌ FAIL '{c['title']}': {'; '.join(v['problems'])[:300]}", flush=True)
                    st = next((s for s in queue if s["story"] == c.get("story")), None)
                    if st is not None and not v.get("is_ad"):
                        st["_feedback"] = "\n".join(f"- {p}" for p in v["problems"])
                        retry.append(st)
            done = {c.get("story") for c in approved}
            queue = [st for st in retry if st["story"] not in done]
            if not queue or len({c.get("story") for c in approved}) >= target_clips:
                break
            print(f"🔁 [Curator] repairing {len(queue)} clip(s) with the judge's feedback", flush=True)
        print(f"🧐 [Curator] {len(approved)} clip(s) approved by the quality gate", flush=True)
        return approved

    def _strong_client(self) -> MultiAIClient:
        model = JUDGE_MODEL
        if self.provider == "gemini" and model.startswith("google/"):
            model = model.split("/", 1)[1]
        if self.provider not in ("openrouter", "gemini"):
            model = self.model  # other providers: use the configured model
        return MultiAIClient(provider=self.provider, api_key=self.api_key, model=model)

    def _ask_strong(self, prompt, schema=None, images=None):
        """Ask the stronger model (falls back to the default model if it is unavailable)."""
        for client in (self._strong_client(), self._client()):
            try:
                if images:
                    vc = VisionClient(self.provider, self.api_key, client.model)
                    if vc.available:
                        return vc.ask(prompt, images, timeout=240.0)
                res, _ = client.ask(prompt, schema=schema)
                return res
            except Exception as e:
                print(f"⚠️ [Curator] {client.model} failed ({str(e)[:160]}); retrying with fallback", flush=True)
        raise RuntimeError("both models failed")

    def _map_stories(self, sentences, duration) -> List[Dict[str, Any]]:
        n = len(sentences)
        stories = []
        for i in range(0, n, MAX_PROMPT_SENTENCES):
            chunk = sentences[i:i + MAX_PROMPT_SENTENCES]
            result = self._ask_strong(MAP_PROMPT.format(
                title=self.title or "untitled", duration_min=duration / 60,
                timeline="\n".join(self._timeline(chunk))), schema=MAP_SCHEMA)
            for st in _as_list(result, "stories"):
                if not isinstance(st, dict):
                    continue
                a, b = _int(st.get("from")), _int(st.get("to"))
                if 0 <= a <= b < n:
                    st["story"] = len(stories)
                    st["is_ad"] = str(st.get("name", "")).upper().startswith("AD:") or bool(
                        AD_PATTERN.search(" ".join(sentences[k]["text"] for k in range(a, b + 1))) and
                        _int(st.get("short_potential"), 0) < 30)
                    stories.append(st)
        stories = [st for st in stories if not st["is_ad"]]
        stories.sort(key=lambda s: (bool(s.get("has_clear_outcome")), _int(s.get("short_potential"), 0)), reverse=True)
        for st in stories:
            print(f"   📖 {st['name']} (#{st['from']}-#{st['to']}, potential {st.get('short_potential')}, "
                  f"outcome: {'yes' if st.get('has_clear_outcome') else 'no'})", flush=True)
        return stories

    def _compose(self, st, sentences, min_len, max_len, curation_mode, feedback: str = ""):
        n = len(sentences)
        a, b = max(0, _int(st["from"]) - 2), min(n - 1, _int(st["to"]) + 2)
        fb = ""
        if feedback:
            fb = ("A previous version of this clip was REJECTED by the quality gate for these reasons:\n"
                  f"{feedback}\nFix every one of them (choose different sentence ranges where needed).\n")
        prompt = COMPOSE_PROMPT.format(
            min_len=int(min_len), max_len=int(max_len), name=st.get("name", ""), first_id=a, last_id=b,
            stakes=st.get("stakes", ""), outcome=st.get("outcome", ""),
            timeline="\n".join(self._timeline(sentences[a:b + 1])), feedback=fb,
            mode_rules=COMPOSE_MODE_RULES.get(curation_mode, COMPOSE_MODE_RULES["story_arc"]))
        res = None
        for attempt in range(2):
            try:
                res, _ = self._client().ask(prompt)
            except Exception as e:
                print(f"⚠️ [Curator] could not compose '{st.get('name')}' ({e})", flush=True)
                return None
            if isinstance(res, dict) and isinstance(res.get("setup"), dict) and isinstance(res.get("payoff"), dict):
                break
            prompt += (f"\n\nYour previous answer was unusable. setup and payoff are REQUIRED objects with "
                       f"\"from\"/\"to\" sentence ids between {a} and {b}.")
        if not isinstance(res, dict):
            return None

        def to_id(v, end=False):
            """Sentence id in [a, b]; a value that is really a time in seconds is mapped to its sentence."""
            v = _float(v)
            if a <= v <= b and v == int(v):
                return int(v)
            hits = [k for k in range(a, b + 1) if sentences[k]["s"] - 0.5 <= v <= sentences[k]["e"] + 0.5]
            return (hits[-1] if end else hits[0]) if hits else None

        segs = []
        for beat in ("setup", "middle", "payoff"):
            r = res.get(beat)
            if not isinstance(r, dict):
                continue
            f, t = to_id(r.get("from")), to_id(r.get("to"), end=True)
            if f is not None and t is not None and f <= t:
                segs.append({"from": f, "to": t, "beat": beat})
        if _int(res.get("cold_open")) > b:
            res["cold_open"] = to_id(res["cold_open"]) if to_id(res["cold_open"]) is not None else -1
        if not any(x["beat"] == "setup" for x in segs) or not any(x["beat"] == "payoff" for x in segs):
            print(f"   ✂️  '{st.get('name')}': no usable setup/payoff", flush=True)
            return None
        res["segments"], res["story"], res["_story"] = segs, st["story"], st
        res["short_potential"] = _int(st.get("short_potential"), 70)
        res.setdefault("title", st.get("name", ""))
        return res

    def _clip_block(self, i: int, clip: Dict[str, Any], sentences) -> str:
        lines = [f'### Clip {i}: title "{clip["title"]}" | headline "{clip["hook_title"]}" | {clip["duration"]:.0f}s',
                 f'STATED POINT: "{clip.get("conclusion_summary") or "(none given)"}"']
        co = clip.get("cold_open")
        if co:
            lines.append(f"[TEASER plays first, {co['end'] - co['start']:.1f}s from {co['start']:.0f}s]: {co['text'] or '(no speech)'}")
            lines += visual_lines(self.frames, co["start"] - 2, co["end"] + 2)
            lines.append("--- clip starts ---")
        for j, seg in enumerate(clip["segments"]):
            if j:
                lines.append("--- JUMP CUT ---")
            a, b = seg["sentence_range"]
            vis_end = seg.get("hold_from", seg["end"])
            for k in range(a, b + 1):  # only what is actually inside the cut
                lines.append(self._fmt(sentences[k]))
                t1 = min(vis_end, sentences[k + 1]["s"] if k + 1 <= b else vis_end)
                lines += visual_lines(self.frames, max(seg["start"], sentences[k]["s"]), t1)
            if "hold_from" in seg:
                lines.append(f"   [picture holds on the frame at {seg['hold_from']:.0f}s until the line finishes]")
        lines.append("--- clip ends ---")
        return "\n".join(lines)

    def _clip_images(self, i: int, clip: Dict[str, Any], tmp: Path) -> List[tuple]:
        if not self.video_path:
            return []
        segs = clip["segments"]
        total = sum(s["duration"] for s in segs)
        out = []
        for k, frac in enumerate((0.08, 0.35, 0.6, 0.82, 0.97)):
            pos, t = frac * total, segs[-1]["end"]
            for sg in segs:
                if pos <= sg["duration"]:
                    t = sg["start"] + pos
                    break
                pos -= sg["duration"]
            p = frame_at(self.video_path, t, tmp / f"c{i}_{k}.jpg")
            if p:
                out.append((f"Clip {i}, frame at {t:.0f}s:", p))
        return out

    def _judge(self, clips: List[Dict[str, Any]], sentences) -> List[Dict[str, Any]]:
        """Judge the FINAL cuts. Returns one verdict per clip (passed: bool, problems: [...])."""
        if not clips:
            return []
        with tempfile.TemporaryDirectory() as tmp:
            images = []
            for i, c in enumerate(clips):
                images += self._clip_images(i, c, Path(tmp))
            prompt = JUDGE_PROMPT.format(clips="\n\n".join(self._clip_block(i, c, sentences) for i, c in enumerate(clips)))
            try:
                result = self._ask_strong(prompt + "\n\nFrames from the clips follow.", images=images)
            except Exception as e:
                print(f"⚠️ [Curator] judge unavailable ({e}); clips are not approved", flush=True)
                return [{"passed": False, "problems": ["judge unavailable"]} for _ in clips]
        verdicts = {_int(v.get("index")): v for v in _as_list(result, "verdicts") if isinstance(v, dict)}
        out = []
        for i, c in enumerate(clips):
            v = verdicts.get(i, {"problems": ["not judged"]})
            failed = [k for k in JUDGE_CHECKS if v.get(k) is not True]
            if not (c.get("conclusion_summary") or "").strip():
                failed.append("no stated point")
            sense = _int(v.get("makes_sense"), 0)
            ad = bool(v.get("is_ad")) or bool(AD_PATTERN.search(" ".join(w["w"] for w in c["words"])))
            problems = [str(x) for x in (v.get("problems") or [])]
            problems += [f"check failed: {k}" for k in failed]
            if ad:
                problems.append("this is an ad / sponsor read")
            v.update(passed=(not ad and not failed and sense >= PASS_SCORE), makes_sense=sense,
                     problems=problems, is_ad=ad)
            out.append(v)
        return out

    # ------------------------------------------------------------------ no-AI ranking

    def _local_pick(self, sentences, min_len, max_len, target_clips):
        """Rank every self-contained sentence range by energy and hook cues. Contiguous only."""
        n = len(sentences)
        candidates = []
        for i in range(n):
            if starts_dangling(sentences[i]):
                continue
            a, b = fit_range(sentences, i, i, min_len, max_len)
            if a != i or not (min_len <= span(sentences, a, b) <= max_len) or not is_complete_end(sentences[b]):
                continue
            first = sentences[a]["text"].lower()
            hook = 10 * ("?" in first) + 8 * bool(re.search(r"\d", first)) + 5 * bool(re.search(r"\byou\b", first))
            energy = float(np.mean([sentences[k]["energy"] for k in range(a, b + 1)]))
            payoff = 15 * sentences[b].get("loud", False) + 10 * any(sentences[k].get("loud") for k in range(max(a, b - 2), b + 1))
            score = int(max(40, min(95, 60 + 12 * energy + hook + payoff)))
            candidates.append({
                "segments": [{"from": a, "to": b, "beat": "payoff"}],
                "cold_open": -1,
                "hook_title": " ".join(sentences[a]["text"].split()[:8]).rstrip(",.;:"),
                "hook": "WATCH THIS",
                "point": sentences[b]["text"][:200],
                "score": score,
                "title": " ".join(sentences[a]["text"].split()[:10])[:70],
                "category": "other",
            })
        candidates.sort(key=lambda c: c["score"], reverse=True)
        picked = []
        for c in candidates:
            a, b = c["segments"][0]["from"], c["segments"][0]["to"]
            if all(b < p["segments"][0]["from"] or a > p["segments"][0]["to"] for p in picked):
                picked.append(c)
            if len(picked) >= target_clips:
                break
        return picked

    # ------------------------------------------------------------------ assembly

    def _load_rms(self) -> Optional[np.ndarray]:
        try:
            import soundfile as sf
            audio, sr = sf.read(str(self.audio_path), dtype="int16")
            if audio.ndim > 1:
                audio = audio.mean(axis=1).astype(np.int16)
            return frame_rms(audio, sr)
        except Exception as e:
            print(f"⚠️ [Curator] Audio unavailable for silence snapping ({e})", flush=True)
            return None

    def _refine_cut(self, words, w0: int, w1: int, rms, duration) -> Tuple[float, float]:
        """Exact cut times for words[w0..w1], moved onto real silence."""
        s, e = float(words[w0]["s"]), float(words[w1]["e"])
        prev_end = float(words[w0 - 1]["e"]) if w0 > 0 else 0.0
        next_start = float(words[w1 + 1]["s"]) if w1 + 1 < len(words) else duration
        if rms is not None:
            s = snap_start_to_silence(rms, s, max_shift=max(0.0, min(0.4, s - prev_end - 0.02)))
            e = snap_end_to_silence(rms, e, max_shift=max(0.0, min(0.7, next_start - e - 0.03)))
        else:
            s = max(prev_end, s - 0.08)
            e = min(next_start, e + 0.25)
        return round(max(0.0, s), 3), round(min(duration, e), 3)

    def _pick_cold_open(self, raw, segs, sentences, words, rms, duration) -> Optional[Dict[str, Any]]:
        """Every clip gets a teaser: the tension right BEFORE the outcome (never the result itself),
        cut on word boundaries. AI line -> AI visual moment -> visual peak -> loudest line."""
        inside = [k for a, b in segs for k in range(a, b + 1)]
        first = segs[0][0]
        outcome_t = _float(raw.get("outcome_time"))
        limit = outcome_t - 0.2 if outcome_t > 0 else sentences[segs[-1][1]]["e"]

        story_lo = sentences[first]["s"]

        def from_sentence(k):
            if k < 0 or k >= len(sentences) or k == first or sentences[k]["s"] < story_lo:
                return None
            sent = sentences[k]
            if not (COLD_OPEN_MIN <= sent["e"] - sent["s"] <= COLD_OPEN_MAX) or sent["e"] > limit + 0.5:
                return None
            if starts_dangling(sent) and len(sent["text"].split()) > 6:
                return None
            cs, ce = self._refine_cut(words, sent["w0"], sent["w1"], rms, duration)
            return {"start": cs, "end": ce, "text": sent["text"], "words": words[sent["w0"]:sent["w1"] + 1],
                    "source": "line"}

        def from_time(t):
            if t <= 0 or not (story_lo + 2.0 <= t <= limit + 0.5):
                return None
            s, e = max(0.0, t - VISUAL_TEASER[0]), min(duration, t + VISUAL_TEASER[1], limit)
            if e - s < COLD_OPEN_MIN:
                s = max(0.0, e - 3.5)
            s, e = word_aligned_window(words, s, e)
            e = min(e, limit + 0.3)
            if rms is not None:
                s = snap_start_to_silence(rms, s, max_shift=0.3)
            if e - s < COLD_OPEN_MIN:
                return None
            ws = [w for w in words if w["s"] >= s - 0.05 and w["e"] <= e + 0.05]
            return {"start": round(s, 3), "end": round(e, 3), "text": " ".join(w["w"] for w in ws),
                    "words": ws, "source": "visual"}

        co = from_sentence(_int(raw.get("cold_open"))) or from_time(_float(raw.get("cold_open_time")))
        if co:
            return co

        # Automatic: the most dramatic moment between 30% of the clip and the outcome.
        t0 = sentences[segs[0][0]]["s"]
        cut = t0 + 0.3 * (limit - t0)
        peaks = [f for f in self.frames if cut <= f["t"] <= limit - 0.5 and f["action"] >= 6]
        for f in sorted(peaks, key=lambda f: f["action"], reverse=True):
            co = from_time(f["t"])
            if co:
                return co
        lines = [k for k in range(first + 1, len(sentences)) if cut <= sentences[k]["s"] and sentences[k]["e"] <= limit + 0.5]
        lines.sort(key=lambda k: (sentences[k].get("loud", False), sentences[k]["energy"]), reverse=True)
        for k in lines:
            co = from_sentence(k)
            if co:
                return co
        return None

    def _assemble(self, raw, sentences, words, rms, min_len, max_len, duration, curation_mode):
        n = len(sentences)
        segs = [(_int(s.get("from")), _int(s.get("to"))) for s in raw.get("segments", []) if isinstance(s, dict)]
        segs = [(a, min(b, n - 1)) for a, b in normalize_segments(segs) if 0 <= a < n]
        if not segs:
            return None
        if curation_mode != "story_arc":
            segs = [(segs[0][0], segs[-1][1])]
        segs = segs[:3]

        # The clip must run past the moment the outcome happens.
        outcome_t = _float(raw.get("outcome_time"))
        if outcome_t > 0:
            a, b = segs[-1]
            while b + 1 < n and sentences[b]["e"] < outcome_t + 1.0 and sentences[b + 1]["s"] < outcome_t + 8:
                b += 1
            segs[-1] = (a, b)
            # ...and must include the decisive action leading up to it (>= 8 s before the outcome).
            prev_end = segs[-2][1] if len(segs) > 1 else -1
            while a - 1 > prev_end and sentences[a]["s"] > outcome_t - 8.0:
                a -= 1
            segs[-1] = (a, b)
            segs = normalize_segments(segs)

        if len(segs) == 1:
            segs = [fit_range(sentences, segs[0][0], segs[0][1], min_len, max_len)]
        else:
            segs = self._fit_story(segs, sentences, min_len, max_len, outcome_t)
        total = sum(span(sentences, a, b) for a, b in segs)
        if total < min_len * 0.8 or total > max_len * 1.15:
            print(f"   ✂️  '{raw.get('title', '')}' dropped: {total:.0f}s outside {min_len:.0f}-{max_len:.0f}s", flush=True)
            return None
        if not is_complete_end(sentences[segs[-1][1]]) or starts_dangling(sentences[segs[0][0]]):
            print(f"   ✂️  '{raw.get('title', '')}' dropped: no clean start/end available", flush=True)
            return None

        out_segments, clip_words = [], []
        labels = {"setup": "The Setup", "escalation": "The Turn", "payoff": "The Payoff"}
        order = {1: ["payoff"], 2: ["setup", "payoff"]}.get(len(segs), ["setup", "escalation", "payoff"])
        for idx, (a, b) in enumerate(segs):
            w0, w1 = sentences[a]["w0"], sentences[b]["w1"]
            s, e = self._refine_cut(words, w0, w1, rms, duration)
            if self.frames:  # video analysed: never show a sliver of the next/previous scene
                s, e = snap_to_scene_cuts(self.video_path, s, e, float(words[w0]["s"]), float(words[w1]["e"]))
            seg_words = words[w0:w1 + 1]
            clip_words.extend(seg_words)
            beat = order[idx] if len(segs) > 1 else "payoff"
            out_segments.append({
                "start": s, "end": e, "duration": round(e - s, 3),
                "beat": beat, "label": labels.get(beat, beat.title()),
                "sentence_range": [a, b], "words": seg_words,
            })

        # If the source cuts to a new scene right after a complete sentence near the end, end there:
        # the lines that follow are playing over the NEXT story's footage.
        if self.frames and self.video_path:
            a, b = segs[-1]
            lo = max(a, b - 3)
            cuts = scene_changes(self.video_path, sentences[lo]["s"], sentences[b]["e"] + 0.2)
            for k in range(b - 1, lo - 1, -1):
                hit = [c for c in cuts if sentences[k]["e"] - 0.15 <= c <= sentences[k + 1]["s"] + 0.6]
                shorter = sum(span(sentences, x, y) for x, y in segs[:-1]) + span(sentences, a, k)
                dropped = sentences[b]["e"] - sentences[k + 1]["s"]
                after_outcome = outcome_t > 0 and sentences[k + 1]["s"] >= outcome_t + 3.0
                if hit and after_outcome and dropped <= 2.5 and is_complete_end(sentences[k]) \
                        and shorter >= min_len * 0.8:
                    print(f"   🎬 '{raw.get('title', '')}': ends at scene cut {hit[0]:.1f}s (dropped "
                          f"'{' '.join(sentences[j]['text'] for j in range(k + 1, b + 1))[:60]}')", flush=True)
                    segs[-1] = (a, k)
                    break

        text = " ".join(sentences[k]["text"] for a, b in segs for k in range(a, b + 1))
        if len(AD_PATTERN.findall(text)) >= 2:
            print(f"   ✂️  '{raw.get('title', '')}' dropped: sponsor/ad read", flush=True)
            return None

        # Source L-cut: the video switches to the NEXT story before the last line finishes.
        # Hold this story's last frame from that cut so the line ends over the right picture.
        story = raw.get("_story") or {}
        if self.frames and self.video_path and story and out_segments:
            to = _int(story.get("to"), -1)
            if 0 <= to < n - 1:
                next_start = sentences[to + 1]["s"]
                last = out_segments[-1]
                cuts = [c for c in scene_changes(self.video_path, last["end"] - 4.5, last["end"])
                        if next_start - 4.5 <= c < last["end"] - 0.15 and c > last["start"] + 1.0]
                if cuts:
                    last["hold_from"] = round(cuts[0] - 0.04, 3)
                    print(f"   🧊 '{raw.get('title', '')}': holding last frame from {cuts[0]:.1f}s "
                          f"(source cuts to the next story before the line ends)", flush=True)

        cold_open = self._pick_cold_open(raw, segs, sentences, words, rms, duration)
        clip_dur = round(sum(x["duration"] for x in out_segments), 2)
        score = _int(raw.get("score"), -1)
        if score < 0:
            score = _overall_score(raw)
        cat = str(raw.get("category", "other")).lower()
        tags = raw.get("hashtags") or []
        if isinstance(tags, str):
            tags = tags.split()
        hw = raw.get("highlight_words") or []
        if isinstance(hw, str):
            hw = hw.split()
        hook_title = str(raw.get("hook_title") or raw.get("hook") or "").strip()
        point = str(raw.get("point") or raw.get("conclusion_summary") or "").strip()

        return {
            "engine": "story_v4",
            "_raw": {k: raw.get(k) for k in ("hook_score", "flow_score", "value_score", "trend_score", "short_potential")},
            "id": "",
            "story": _int(raw.get("story"), -1),
            "title": str(raw.get("title") or hook_title or "Clip")[:70],
            "hook": hook_title[:80] or str(raw.get("hook", "WATCH THIS")),
            "hook_badge": str(raw.get("hook", "")).upper()[:40],
            "hook_title": hook_title[:80],
            "hook_narration": str(raw.get("hook_narration") or "").strip(),
            "cold_open": cold_open,
            "conclusion_summary": point,
            "setup": str(raw.get("setup") or ""),
            "payoff": str(raw.get("payoff") or ""),
            "review_summary": str(raw.get("review_summary") or ""),
            "makes_sense": _int(raw.get("makes_sense"), None),
            "is_story_arc": len(out_segments) > 1,
            "segments": out_segments,
            "segment_count": len(out_segments),
            "start": out_segments[0]["start"],
            "end": out_segments[-1]["end"],
            "start_time": out_segments[0]["start"],
            "end_time": out_segments[-1]["end"],
            "duration": clip_dur,
            "score": score,
            "virality_score": score,
            "scores": {k: _int(raw.get(f"{k}_score"), None) for k in SCORE_WEIGHTS},
            "category": cat if cat in CATEGORIES else "other",
            "description": str(raw.get("description") or point)[:250],
            "hashtags": [re.sub(r"\W", "", str(t))[:30] for t in tags if t][:6],
            "highlight_words": [str(w).strip(" ,.?!") for w in hw if w][:6],
            "reason": str(raw.get("review_reason") or raw.get("reason") or point)[:200],
            "words": clip_words,
        }

    @staticmethod
    def _fit_story(segs, sentences, min_len, max_len, outcome_t) -> List[Tuple[int, int]]:
        """Fit a setup/(middle)/payoff clip to the length limits without losing the setup or the outcome."""
        n = len(sentences)
        segs = [list(s) for s in segs]

        # Clean opener: skip filler inside the setup, else pull in up to 3 sentences of context.
        while starts_dangling(sentences[segs[0][0]]) and segs[0][0] < segs[0][1]:
            segs[0][0] += 1
        back = 0
        while starts_dangling(sentences[segs[0][0]]) and segs[0][0] > 0 and back < 3:
            segs[0][0] -= 1
            back += 1
        # Clean ending: never stop on an unfinished thought.
        extra = 0
        while not is_complete_end(sentences[segs[-1][1]]) and segs[-1][1] + 1 < n and extra < 3:
            segs[-1][1] += 1
            extra += 1

        def total():
            return sum(span(sentences, a, b) for a, b in segs)

        # Too long: drop the middle, then shorten the payoff's lead-in (never past outcome-10s),
        # then shorten the end of the setup (its opening line stays).
        if total() > max_len and len(segs) == 3:
            segs.pop(1)
        keep_from = (outcome_t - 10.0) if outcome_t > 0 else float("inf")
        while total() > max_len:
            pa, pb = segs[-1]
            if len(segs) > 1 and pa < pb and sentences[pa + 1]["s"] <= keep_from:
                segs[-1][0] += 1
            elif len(segs) > 1 and segs[0][1] > segs[0][0]:
                segs[0][1] -= 1
            elif pa < pb:
                segs[-1][0] += 1
            else:
                break
        # Too short: add reaction after the payoff, then context before the setup.
        while total() < min_len:
            b = segs[-1][1]
            if b + 1 < n and sentences[b + 1]["s"] - sentences[b]["e"] < 2.0 and \
                    total() + (sentences[b + 1]["e"] - sentences[b]["e"]) <= max_len:
                segs[-1][1] += 1
                continue
            a = segs[0][0]
            if a > 0 and total() + (sentences[a]["s"] - sentences[a - 1]["s"]) <= max_len:
                segs[0][0] -= 1
                continue
            break
        while not is_complete_end(sentences[segs[-1][1]]) and segs[-1][0] < segs[-1][1]:
            segs[-1][1] -= 1  # growing may have stopped mid-thought; back off to a complete ending
        return normalize_segments([tuple(x) for x in segs])

    @staticmethod
    def _dedupe(clips: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """One clip per story, and no two clips sharing any sentence."""
        def sents(c):
            return {k for s in c["segments"] for k in range(s["sentence_range"][0], s["sentence_range"][1] + 1)}

        out = []
        for c in sorted(clips, key=lambda c: c["score"], reverse=True):
            same_story = c.get("story", -1) >= 0 and any(o.get("story") == c["story"] for o in out)
            if same_story or any(sents(c) & sents(o) for o in out):
                print(f"   ✂️  duplicate of a better clip: '{c['title']}'", flush=True)
                continue
            out.append(c)
        return out
