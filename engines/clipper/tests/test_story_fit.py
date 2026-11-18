"""Story fitting: a setup + payoff clip keeps its stakes line and its outcome while meeting length limits."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.curator import ViralityCurator  # noqa: E402
from core.editorial import span  # noqa: E402


def sents(texts, dur=3.0, gap=0.2):
    out, t = [], 0.0
    for i, txt in enumerate(texts):
        out.append({"id": i, "s": t, "e": t + dur, "text": txt})
        t += dur + gap
    return out


TEXTS = [
    "Welcome back everyone.",                                  # 0
    "If you cross this beam, you win one hundred grand.",      # 1  stakes
    "It is only one and a half inches wide.",                  # 2
    "Yeah.",                                                    # 3
    "She steps up.",                                            # 4
    "The wind picks up.",                                       # 5
    "She wobbles.",                                             # 6
    "She keeps going.",                                         # 7
    "Halfway there.",                                           # 8
    "Almost there.",                                            # 9
    "She made it!",                                             # 10 outcome (~33s)
    "That money goes to foster kids.",                          # 11 reaction
    "Next up is basketball.",                                   # 12
]


class FitStoryTest(unittest.TestCase):
    def setUp(self):
        self.S = sents(TEXTS)
        self.fit = ViralityCurator._fit_story

    def total(self, segs):
        return sum(span(self.S, a, b) for a, b in segs)

    def test_too_long_keeps_setup_opening_and_outcome(self):
        segs = self.fit([(1, 3), (4, 11)], self.S, 10, 22, outcome_t=self.S[10]["s"])
        self.assertEqual(segs[0][0], 1)          # stakes line still opens the clip
        self.assertGreaterEqual(segs[-1][1], 10)  # outcome still inside
        self.assertLessEqual(self.total(segs), 22)

    def test_filler_opener_is_skipped(self):
        segs = self.fit([(3, 4), (10, 11)], self.S, 5, 60, outcome_t=self.S[10]["s"])
        self.assertNotEqual(segs[0][0], 3)

    def test_too_short_grows_reaction_then_context(self):
        segs = self.fit([(1, 1), (10, 10)], self.S, 12, 60, outcome_t=self.S[10]["s"])
        self.assertGreaterEqual(self.total(segs), 12)
        self.assertEqual(segs[-1][1] >= 11, True)


if __name__ == "__main__":
    unittest.main()
