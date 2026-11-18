"""Tests for the editorial rules that decide where a clip starts and ends.
Run: engines/.venv/bin/python3 -m unittest discover -s engines/clipper/tests
"""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.editorial import (  # noqa: E402
    build_sentences,
    is_complete_end,
    starts_dangling,
    fit_range,
    normalize_segments,
    frame_rms,
    snap_end_to_silence,
    snap_start_to_silence,
    span,
    word_aligned_window,
)


def make_words(text_with_times):
    """[(word, start, end), ...] -> transcript words."""
    return [{"w": w, "s": s, "e": e} for w, s, e in text_with_times]


def sentence_words(sentences, gap=0.3, word_dur=0.3):
    """Build words from a list of sentence strings, laid out back to back."""
    out, t = [], 0.0
    for sent in sentences:
        for w in sent.split():
            out.append({"w": w, "s": round(t, 2), "e": round(t + word_dur, 2)})
            t += word_dur + 0.05
        t += gap
    return out


class BuildSentencesTest(unittest.TestCase):
    def test_splits_on_terminal_punctuation(self):
        words = sentence_words(["I tried it.", "It failed badly.", "Then I fixed it!"])
        sents = build_sentences(words)
        self.assertEqual([s["text"] for s in sents], ["I tried it.", "It failed badly.", "Then I fixed it!"])
        self.assertEqual(sents[0]["s"], words[0]["s"])
        self.assertEqual(sents[-1]["e"], words[-1]["e"])
        self.assertEqual([s["id"] for s in sents], [0, 1, 2])

    def test_splits_unpunctuated_speech_on_long_pause(self):
        words = make_words([("so", 0.0, 0.3), ("yeah", 0.35, 0.6), ("next", 1.6, 1.9), ("thing", 1.95, 2.2)])
        sents = build_sentences(words)
        self.assertEqual(len(sents), 2)

    def test_pause_split_inside_punctuated_sentence_is_not_a_clean_boundary(self):
        words = sentence_words(["First point here.", "Second point too."]) + make_words([
            ("If", 20.0, 20.2), ("you", 20.25, 20.4), ("train", 20.45, 20.7),       # pause mid-sentence
            ("your", 22.0, 22.2), ("strength", 22.25, 22.6), ("rises.", 22.65, 23.0),
        ])
        sents = build_sentences(words)
        self.assertEqual(sents[-2]["text"], "If you train")
        self.assertFalse(is_complete_end(sents[-2]))
        self.assertTrue(starts_dangling(sents[-1]))
        self.assertTrue(is_complete_end(sents[-1]))

    def test_lowercase_after_full_stop_is_a_continuation(self):
        words = sentence_words(["First point here.", "Here is the check: month one and two.",
                                "your strength shoots up.", "Then it grows."])
        sents = build_sentences(words)
        self.assertFalse(is_complete_end(sents[1]))
        self.assertTrue(starts_dangling(sents[2]))
        self.assertTrue(is_complete_end(sents[2]))

    def test_caps_runaway_sentence_length(self):
        words = [{"w": "word", "s": i * 0.4, "e": i * 0.4 + 0.3} for i in range(200)]  # 80s, no punctuation
        sents = build_sentences(words, max_len=20.0)
        self.assertTrue(all(s["e"] - s["s"] <= 30.0 for s in sents))


class BoundaryRulesTest(unittest.TestCase):
    def test_incomplete_endings(self):
        self.assertFalse(is_complete_end({"text": "and then we went to the"}))
        self.assertFalse(is_complete_end({"text": "the reason is,"}))
        self.assertFalse(is_complete_end({"text": "and the best part is"}))
        self.assertTrue(is_complete_end({"text": "That is why it worked."}))
        self.assertTrue(is_complete_end({"text": "we won"}))

    def test_dangling_starts(self):
        self.assertTrue(starts_dangling({"text": "And that's why it broke."}))
        self.assertTrue(starts_dangling({"text": "But nobody noticed."}))
        self.assertTrue(starts_dangling({"text": "Because it was late."}))
        self.assertFalse(starts_dangling({"text": "Nobody noticed the bug."}))

    def test_relative_clause_opener_is_dangling(self):
        self.assertTrue(starts_dangling({"text": "Who has won seven Olympic gold medals."}))
        self.assertFalse(starts_dangling({"text": "Who can cross this beam first?"}))

    def test_filler_reply_openers_are_dangling(self):
        self.assertTrue(starts_dangling({"text": "Yeah, one and a half inches."}))
        self.assertTrue(starts_dangling({"text": "Okay, let's go."}))
        self.assertTrue(starts_dangling({"text": "Yes."}))
        self.assertTrue(starts_dangling({"text": "Oh my gosh."}))
        self.assertFalse(starts_dangling({"text": "No one has ever walked this beam for money."}))
        self.assertFalse(starts_dangling({"text": "Well-trained athletes fail this every time."}))


class FitRangeTest(unittest.TestCase):
    def setUp(self):
        texts = [
            "Here is the problem.",              # 0
            "Most people clip videos wrong.",   # 1
            "And they lose viewers instantly.", # 2
            "The fix is simple.",               # 3
            "Start on the strongest line,",     # 4  (incomplete, ends with comma)
            "then end on the payoff.",          # 5
            "That is the whole trick.",         # 6
            "Anyway, next topic.",              # 7
        ]
        self.sentences, t = [], 0.0
        for i, txt in enumerate(texts):  # every sentence is 2.0s with a 0.3s pause
            self.sentences.append({"id": i, "s": t, "e": t + 2.0, "text": txt})
            t += 2.3

    def test_pulls_in_context_for_dangling_start(self):
        i0, i1 = fit_range(self.sentences, 2, 3, min_len=1.0, max_len=60.0)
        self.assertEqual(i0, 1)  # "And they..." needs sentence 1 before it

    def test_extends_past_incomplete_ending(self):
        i0, i1 = fit_range(self.sentences, 3, 4, min_len=1.0, max_len=60.0)
        self.assertEqual(i1, 5)

    def test_trims_from_front_to_respect_max(self):
        i0, i1 = fit_range(self.sentences, 0, 6, min_len=1.0, max_len=8.0)
        self.assertLessEqual(span(self.sentences, i0, i1), 8.0)
        self.assertEqual(i1, 6)  # never sacrifice the payoff

    def test_extends_to_reach_min(self):
        i0, i1 = fit_range(self.sentences, 3, 3, min_len=6.0, max_len=60.0)
        self.assertGreaterEqual(span(self.sentences, i0, i1), 6.0)
        self.assertTrue(is_complete_end(self.sentences[i1]))


class NormalizeSegmentsTest(unittest.TestCase):
    def test_sorts_and_merges_overlaps(self):
        segs = normalize_segments([(10, 12), (2, 4), (11, 14), (5, 5)])
        self.assertEqual(segs, [(2, 5), (10, 14)])

    def test_drops_invalid(self):
        self.assertEqual(normalize_segments([(5, 3), (-1, 2)]), [(0, 2)])


class SilenceSnapTest(unittest.TestCase):
    def setUp(self):
        sr = 16000
        t = np.arange(int(sr * 3.0)) / sr
        audio = np.zeros_like(t)
        speech = (t >= 1.0) & (t < 2.0)  # speech from 1.0s to 2.0s
        audio[speech] = 0.3 * np.sin(2 * np.pi * 220 * t[speech])
        self.rms = frame_rms((audio * 32767).astype(np.int16), sr)

    def test_end_moves_past_trailing_syllable_into_silence(self):
        # transcriber said the last word ended at 1.8s, but speech runs to 2.0s
        e = snap_end_to_silence(self.rms, 1.8, max_shift=0.8)
        self.assertGreaterEqual(e, 2.0)
        self.assertLessEqual(e, 2.3)

    def test_start_moves_before_first_syllable(self):
        s = snap_start_to_silence(self.rms, 1.15, max_shift=0.4)
        self.assertLessEqual(s, 1.0)
        self.assertGreaterEqual(s, 0.75)

    def test_no_silence_found_keeps_reasonable_value(self):
        e = snap_end_to_silence(self.rms, 1.2, max_shift=0.2)
        self.assertAlmostEqual(e, 1.4, delta=0.05)


class WordAlignedWindowTest(unittest.TestCase):
    def test_does_not_start_mid_phrase(self):
        words = make_words([("serves", 9.0, 9.3), ("the", 9.35, 9.45), ("foster", 9.5, 9.8), ("community.", 9.85, 10.4),
                            ("I", 10.6, 10.7), ("was", 10.75, 10.9), ("a", 10.95, 11.0), ("foster", 11.05, 11.4),
                            ("kid.", 11.45, 11.8)])
        s, e = word_aligned_window(words, 9.4, 11.9)
        self.assertEqual(s, 10.6)

    def test_does_not_end_mid_phrase(self):
        words = make_words([("Oh!", 10.0, 10.3), ("Yellow!", 10.5, 10.9), ("Wait,", 11.0, 11.3), ("it's", 11.35, 11.5),
                            ("a", 11.55, 11.6), ("tie.", 11.65, 12.0), ("That", 12.05, 12.2), ("means", 12.25, 12.5),
                            ("our", 12.55, 12.7), ("subscribers", 12.75, 13.3)])
        s, e = word_aligned_window(words, 10.1, 12.6)
        self.assertEqual(s, 10.0)
        self.assertAlmostEqual(e, 12.03, delta=0.03)  # ends after "tie.", not "That means our"


if __name__ == "__main__":
    unittest.main()
