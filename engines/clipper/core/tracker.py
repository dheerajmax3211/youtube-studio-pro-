import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

from .config import BASE_DIR

YUNET_MODEL_PATH = Path(__file__).resolve().parent.parent / "assets" / "models" / "face_detection_yunet.onnx"

class FaceTracker:
    """
    Detects faces in video frames and calculates smooth, cinematic 9:16 vertical crop trajectories.
    Includes speaker dwell-lock (hysteresis) and velocity-limited smoothing to eliminate jitter
    and prevent rapid, shaky switching between speakers in fast-paced multi-person videos (e.g. MrBeast).
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = str(model_path or YUNET_MODEL_PATH)
        self.detector = None
        self._init_detector()

    def _init_detector(self):
        if not Path(self.model_path).exists():
            raise FileNotFoundError(f"YuNet model not found at {self.model_path}")
        self.detector = cv2.FaceDetectorYN.create(
            model=self.model_path,
            config="",
            input_size=(640, 360),
            score_threshold=0.6,
            nms_threshold=0.3
        )

    def analyze_crop_trajectory(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        target_aspect: float = 9 / 16,
        sample_step: int = 5
    ) -> Dict[str, Any]:
        """
        Analyze face positions across the clip duration.
        Uses speaker lock with hysteresis so camera stays focused on a person steadily.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video file: {video_path}")

        src_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        src_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        target_h = src_height
        target_w = int(src_height * target_aspect)
        if target_w % 2 != 0:
            target_w -= 1
        max_crop_x = max(0, src_width - target_w)
        default_center_x = max_crop_x / 2.0

        # Jump to start_time
        cap.set(cv2.CAP_PROP_POS_MSEC, start_time * 1000.0)
        total_clip_frames = int((end_time - start_time) * fps)

        raw_x_targets: List[float] = []
        frame_indices: List[int] = []
        all_detected_faces: List[List[Dict[str, float]]] = []

        current_frame = 0
        current_crop_x = default_center_x

        # Dwell-locking state for multi-speaker stability
        locked_face_x: Optional[float] = None
        lock_timer_frames = 0
        MIN_DWELL_FRAMES = int(fps * 2.5)  # Stay on a speaker for at least 2.5 seconds

        # Detector input scaling
        detect_w, detect_h = 640, 360
        self.detector.setInputSize((detect_w, detect_h))
        scale_x = src_width / detect_w
        scale_y = src_height / detect_h

        while cap.isOpened() and current_frame < total_clip_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if current_frame % sample_step == 0:
                small_frame = cv2.resize(frame, (detect_w, detect_h))
                _, faces = self.detector.detect(small_frame)

                frame_faces = []
                if faces is not None and len(faces) > 0:
                    for f in faces:
                        x, y, w, h = f[:4]
                        conf = f[14]
                        frame_faces.append({
                            "x": float(x * scale_x),
                            "y": float(y * scale_y),
                            "w": float(w * scale_x),
                            "h": float(h * scale_y),
                            "conf": float(conf)
                        })

                    # Sort by face area
                    frame_faces.sort(key=lambda item: item["w"] * item["h"], reverse=True)

                    chosen_face = None
                    if locked_face_x is not None and lock_timer_frames > 0:
                        # Check if currently locked face is still visible near previous location
                        for f in frame_faces:
                            fc_x = f["x"] + (f["w"] / 2.0)
                            if abs(fc_x - locked_face_x) < (target_w * 0.45):
                                chosen_face = f
                                break

                    # If not locked or locked person left the frame, pick top face
                    if chosen_face is None:
                        chosen_face = frame_faces[0]
                        locked_face_x = chosen_face["x"] + (chosen_face["w"] / 2.0)
                        lock_timer_frames = MIN_DWELL_FRAMES
                    else:
                        # Update locked position smoothly
                        locked_face_x = chosen_face["x"] + (chosen_face["w"] / 2.0)
                        lock_timer_frames -= sample_step

                    target_x = locked_face_x - (target_w / 2.0)
                    target_x = max(0.0, min(float(max_crop_x), target_x))
                else:
                    target_x = current_crop_x
                    lock_timer_frames = max(0, lock_timer_frames - sample_step)

                all_detected_faces.append(frame_faces)
                current_crop_x = target_x
                raw_x_targets.append(target_x)
                frame_indices.append(current_frame)

            current_frame += 1

        cap.release()

        if not raw_x_targets:
            return {
                "src_width": src_width,
                "src_height": src_height,
                "target_w": target_w,
                "target_h": target_h,
                "fps": fps,
                "smoothed_x": [default_center_x] * max(1, total_clip_frames),
                "faces_found": False
            }

        smoothed_x = self._smooth_trajectory(
            raw_x_targets,
            frame_indices,
            total_clip_frames,
            fps,
            sample_step
        )

        return {
            "src_width": src_width,
            "src_height": src_height,
            "target_w": target_w,
            "target_h": target_h,
            "max_crop_x": max_crop_x,
            "fps": fps,
            "smoothed_x": smoothed_x,
            "faces_found": any(len(faces) > 0 for faces in all_detected_faces)
        }

    def _smooth_trajectory(
        self,
        sampled_targets: List[float],
        sampled_indices: List[int],
        total_frames: int,
        fps: float,
        step: int
    ) -> List[int]:
        """
        Velocity-limited, exponential ease smoothing.
        Guarantees zero shaky micro-jitters, smooth gradual pans, and holds on speakers.
        """
        full_raw = np.interp(
            np.arange(total_frames),
            sampled_indices,
            sampled_targets
        )

        smoothed = np.zeros(total_frames)
        current_pos = full_raw[0]
        deadband_px = 50.0       # 50px deadband: ignores small head bobs & breathing
        alpha = 0.045            # Very smooth cinematic pan ease
        max_speed = 5.0          # Max 5 pixels/frame camera speed: strictly prevents rapid jerky whipping

        for i in range(total_frames):
            target = full_raw[i]
            diff = target - current_pos

            # Hard scene cut snap
            if abs(diff) > 550.0:
                current_pos = target
            elif abs(diff) > deadband_px:
                step_move = alpha * diff
                # Clamp step move to max_speed to prevent jarring camera whipping
                if step_move > max_speed:
                    step_move = max_speed
                elif step_move < -max_speed:
                    step_move = -max_speed
                current_pos += step_move

            smoothed[i] = current_pos

        return [int(round(x)) for x in smoothed]
