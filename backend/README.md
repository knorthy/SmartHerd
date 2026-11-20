# SmartHerd backend (lives in `backend/` of the app repo)

Estimates a goat's live weight from a side photo and a top photo. Serves the SmartHerd app's API.

Pipeline: YOLOv8s-pose (side 4 keypoints, top 2) → YOLOv8s-seg goat mask → Depth Pro camera distance (when no distance is entered) → body length, chest height, chest width → heart girth (Ramanujan ellipse) → Schaeffer weight. Results are not yet validated against scale-weighed goats.

## Contents
- `smartherd/` — server (`cloud_mock.py`), pipeline, tests, evaluation script, Raspberry Pi / ESP32 simulators
- `models/` — trained weights: `side_pose.pt`, `top_pose.pt`, `goat_seg.pt`
- `configs/`, `train.py` — training configs (dataset paths point to local Roboflow exports, not included)
- `data/ground_truth/` — template and protocol for collecting real weights
- `data/test-photos/` — 5 side and 5 top photos from the Roboflow test splits (CC BY 4.0), used by the tests and for demos

The web app is served from the app's `dist/` (repo root) after `npx expo export --platform web` (see DEPLOY.md); without it the server runs API-only.
- `DEPLOY.md` — running the server and reaching it from a phone

## Setup (Windows, Python 3.13)
```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\pip install "numpy>=2,<2.8"
.venv\Scripts\python -c "from huggingface_hub import hf_hub_download; hf_hub_download('apple/DepthPro', 'depth_pro.pt', local_dir='checkpoints')"
```
Depth Pro weights (1.9 GB) are not in the repo; the last line downloads them. Without them, users must enter the camera-to-goat distance.

## Run
```powershell
.\start-server.ps1            # prints the access code, listens on port 8766
cd smartherd; ..\.venv\Scripts\python -m unittest test_cloud   # tests
```
