"""Train YOLOv8s-pose on the side (4 kpt) and top (2 kpt) goat datasets, sequentially.
Run: python train.py > logs/train.log 2>&1
"""
import shutil
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
DATASETS = {"side": ("goat-side-keypoints", [4, 3], [0, 1, 2, 3]),
            "top": ("goat-top-keypoints", [2, 3], [0, 1])}


def write_yaml(name, folder, kpt_shape, flip_idx):
    # Copy of the dataset's data.yaml with an absolute root, so the dataset stays untouched.
    p = ROOT / "configs" / f"{name}.yaml"
    p.parent.mkdir(exist_ok=True)
    p.write_text(f"path: {(ROOT / 'data' / folder).as_posix()}\n"
                 "train: train/images\nval: valid/images\ntest: test/images\n"
                 f"kpt_shape: {kpt_shape}\nflip_idx: {flip_idx}\nnc: 1\nnames: ['Goat']\n")
    return p


if __name__ == "__main__":
    (ROOT / "models").mkdir(exist_ok=True)
    for name, (folder, kpt_shape, flip_idx) in DATASETS.items():
        data = write_yaml(name, folder, kpt_shape, flip_idx)
        if (ROOT / "models" / f"{name}_pose.pt").exists():
            continue  # already trained; delete the .pt to retrain
        # fliplr=0: flip_idx alone does not stop flipping, and left/right top keypoints would swap.
        r = YOLO("yolov8s-pose.pt").train(data=str(data), imgsz=640, epochs=60, batch=8, patience=15,
                                          fliplr=0.0, device=0, workers=0, project=str(ROOT / "runs"), name=name,
                                          exist_ok=True)
        best = ROOT / "models" / f"{name}_pose.pt"
        shutil.copy(Path(r.save_dir) / "weights" / "best.pt", best)
        m = YOLO(str(best)).val(data=str(data), split="test", imgsz=640, device=0,
                                project=str(ROOT / "runs"), name=f"{name}_test", exist_ok=True)
        print(f"RESULT {name} test pose mAP50={m.pose.map50:.4f} mAP50-95={m.pose.map:.4f} "
              f"box mAP50={m.box.map50:.4f}", flush=True)
