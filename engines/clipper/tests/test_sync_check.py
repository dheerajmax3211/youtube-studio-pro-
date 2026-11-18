"""Sync measurement: finds the audio offset and the video frame offset of a rendered part vs. the source."""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.sync_check import audio_lag, video_lag, verdict  # noqa: E402

SR = 16000


class AudioLagTest(unittest.TestCase):
    def setUp(self):
        rng = np.random.default_rng(1)
        self.src = rng.standard_normal(SR * 4).astype(np.float32)  # 4 s of source audio

    def test_in_sync(self):
        pad = int(0.25 * SR)
        test = self.src[pad:pad + SR * 2] * 0.5  # gain change (loudness normalisation) must not matter
        lag, conf = audio_lag(self.src[:pad * 2 + SR * 2], test, SR, max_lag=0.25)
        self.assertAlmostEqual(lag, 0.0, delta=0.002)
        self.assertGreater(conf, 0.9)

    def test_detects_late_audio(self):
        pad = int(0.25 * SR)
        late = int(0.030 * SR)  # rendered audio is 30 ms late: it plays what the source had 30 ms earlier
        test = self.src[pad - late:pad - late + SR * 2]
        lag, conf = audio_lag(self.src[:pad * 2 + SR * 2], test, SR, max_lag=0.25)
        self.assertAlmostEqual(lag, 0.030, delta=0.002)

    def test_noise_is_inconclusive(self):
        rng = np.random.default_rng(2)
        lag, conf = audio_lag(self.src[:SR * 3], rng.standard_normal(SR * 2).astype(np.float32), SR)
        self.assertLess(conf, 0.3)


class VideoLagTest(unittest.TestCase):
    def test_picks_matching_frame(self):
        rng = np.random.default_rng(3)
        cands = [rng.random((40, 60)).astype(np.float32) for _ in range(7)]  # source frames at -3..+3
        rendered = cands[4] + rng.normal(0, 0.01, (40, 60)).astype(np.float32)  # matches +1 frame
        lag, conf = video_lag(rendered, cands)
        self.assertEqual(lag, 1)
        self.assertGreater(conf, 0.5)

    def test_static_picture_is_inconclusive(self):
        frame = np.full((40, 60), 0.5, dtype=np.float32)
        lag, conf = video_lag(frame, [frame.copy() for _ in range(7)])
        self.assertLess(conf, 0.2)


class VerdictTest(unittest.TestCase):
    def test_rules(self):
        ok = verdict([{"audio_lag_ms": 5, "audio_conf": 0.9, "video_lag_ms": 10, "video_conf": 0.8}], fps=30)
        self.assertTrue(ok["ok"])
        bad_audio = verdict([{"audio_lag_ms": 80, "audio_conf": 0.9, "video_lag_frames": 0, "video_conf": 0.8}], fps=30)
        self.assertFalse(bad_audio["ok"])
        bad_video = verdict([{"audio_lag_ms": 0, "audio_conf": 0.9, "video_lag_frames": 2, "video_conf": 0.8}], fps=30)
        self.assertFalse(bad_video["ok"])
        unsure = verdict([{"audio_lag_ms": 300, "audio_conf": 0.1, "video_lag_frames": 3, "video_conf": 0.05}], fps=30)
        self.assertTrue(unsure["ok"])  # nothing measurable -> not a failure, but reported
        self.assertEqual(unsure["measured_parts"], 0)


if __name__ == "__main__":
    unittest.main()
