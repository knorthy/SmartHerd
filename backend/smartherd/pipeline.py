"""SmartHerd prototype pipeline: side + top image -> keypoints -> cm -> heart girth -> Huber -> Schaeffer weight.
NOT VALIDATED: no real goats, no ground-truth weights. Every output carries validated=False.
Skipped (per docs pipeline): NCNN export; add on the Pi.
"""
import io
import json
import math
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS = {"side": ROOT / "models" / "side_pose.pt", "top": ROOT / "models" / "top_pose.pt"}
HUBER_JSON = Path(__file__).with_name("huber.json")
DEPTH_PT = ROOT / "checkpoints" / "depth_pro.pt"  # Apple Depth Pro weights; absent = distances must be entered
SEG_PT = ROOT / "models" / "goat_seg.pt"  # YOLOv8s-seg trained on configs/seg.yaml
MIN_MASK = 0.01  # mask smaller than this share of the box = seg missed the goat, use the keypoints instead
MIN_CONF = 0.5

# CALIBRATION CONSTANT, horizontal field of view per camera in degrees (pinhole: cm_per_px = dist_cm / focal_px).
# ponytail: placeholder until calibrated; only used when the photo carries no 35 mm-equivalent focal length.
HFOV_DEG = {"side": 66, "top": 66}
FILM_DIAG_MM = 43.27  # 35 mm film diagonal: f35 * image diagonal / this = focal in px, any aspect or orientation
F35_RANGE = (10, 200)  # plausible 35 mm-equivalent focal lengths in mm; anything else is ignored


def focal_px(view, width_px, height_px, f35_mm=None):
    if f35_mm:
        return f35_mm * math.hypot(width_px, height_px) / FILM_DIAG_MM
    # ponytail: HFOV is along the sensor's long side, so portrait photos use height; per-device calibration still pending.
    return (max(width_px, height_px) / 2) / math.tan(math.radians(HFOV_DEG[view] / 2))

# PLACEHOLDER: expected live-weight range per growth stage, to be confirmed with the cooperative / vet.
STAGE_RANGES_KG = {"young": (5, 15), "grower": (15, 30), "adult": (30, 80)}


def ramanujan(a, b):
    """Ellipse perimeter (Ramanujan I); a, b are semi-axes."""
    return math.pi * (3 * (a + b) - math.sqrt((3 * a + b) * (a + 3 * b)))


def schaeffer(hg_cm, bl_cm):
    return hg_cm ** 2 * bl_cm / 10840


def fit_huber(X, y):
    """Fit one stage's correction from real measured-vs-tape data; returns [slope, intercept] for huber.json."""
    from sklearn.linear_model import HuberRegressor  # only needed once real data exists
    m = HuberRegressor().fit([[x] for x in X], y)
    return [float(m.coef_[0]), float(m.intercept_)]


def load_photo(raw):
    """Image bytes -> (RGB image upright per EXIF Orientation, EXIF FocalLengthIn35mmFilm 0xA405 if plausible else None)."""
    from PIL import Image, ImageOps
    im = Image.open(io.BytesIO(raw))
    f35 = im.getexif().get_ifd(0x8769).get(0xA405)
    f35 = f35 if isinstance(f35, (int, float)) and F35_RANGE[0] <= f35 <= F35_RANGE[1] else None
    return ImageOps.exif_transpose(im).convert("RGB"), f35


@lru_cache
def _model(view):
    from ultralytics import YOLO
    return YOLO(str(MODELS[view]))


@lru_cache
def _depth_model():
    import dataclasses
    import depth_pro
    import torch
    from depth_pro.depth_pro import DEFAULT_MONODEPTH_CONFIG_DICT as C
    dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, tf = depth_pro.create_model_and_transforms(dataclasses.replace(C, checkpoint_uri=str(DEPTH_PT)), dev,
                                                      torch.half if dev.type == "cuda" else torch.float32)
    return model.eval(), tf


@lru_cache
def _seg():
    from ultralytics import YOLO
    return YOLO(str(SEG_PT))


def _mask(img, box):
    """Goat mask (bool HxW, original size) of the seg instance overlapping the pose box most, or None if seg fails /
    finds no overlapping goat / almost nothing."""
    import torch
    from ultralytics.utils.metrics import box_iou
    try:
        r = _seg().predict(img, imgsz=640, retina_masks=True, verbose=False)[0]
        if r.masks is None:
            return None
        iou = box_iou(torch.tensor([box]), r.boxes.xyxy.cpu().float())[0]
        if iou.max() <= 0:
            return None
        m = r.masks.data[int(iou.argmax())].cpu().numpy() > 0.5
    except Exception:
        return None
    return m if m.sum() >= MIN_MASK * (box[2] - box[0]) * (box[3] - box[1]) else None


def auto_distance(img, kpts, box=None):
    """Depth Pro: (median depth in cm over the goat's seg mask, else at its keypoints; Depth Pro's own focal length
    in px; True if the mask was used). ~4 s/photo on GPU."""
    import statistics
    import torch
    from PIL import Image, ImageOps
    if not isinstance(img, Image.Image):
        img = ImageOps.exif_transpose(Image.open(img))
    model, tf = _depth_model()
    with torch.no_grad():
        p = model.infer(tf(img.convert("RGB")))
    d = p["depth"].float().cpu().numpy()  # metres, same size as img
    h, w = d.shape
    m = _mask(img, box) if box else None
    if m is not None and m.shape == d.shape:
        z = float(statistics.median(d[m].tolist()))
    else:
        m, z = None, statistics.median(float(d[min(int(y), h - 1), min(int(x), w - 1)]) for x, y, _ in kpts)
    return z * 100, float(p["focallength_px"]), m is not None


def _scale(view, img, kpts, box, dist_cm, w, h, f35_mm):
    """(distance cm, cm per px, segmented). No distance -> Depth Pro's depth and its own focal, so the two stay consistent."""
    if dist_cm is not None:
        return dist_cm, dist_cm / focal_px(view, w, h, f35_mm), False
    dist_cm, f, seg = auto_distance(img, kpts, box)
    return dist_cm, dist_cm / f, seg


def _keypoints(view, img):
    """(best detection's keypoints as [(x, y, conf), ...] in original-image pixels or None if no goat, width px, height px,
    its box [x1, y1, x2, y2] in original pixels or None).
    img is a path or a PIL image (already EXIF-transposed; ultralytics does not rotate PIL input).
    Do NOT pre-stretch to 640x640: Roboflow export kept native size (4096x2304 / 1280x720) and training letterboxed,
    so ultralytics' default letterbox matches; it already maps keypoints back. Stretching doubled side error (33 vs 16 px)."""
    r = _model(view).predict(img, imgsz=640, verbose=False)[0]
    h, w = r.orig_shape
    if r.keypoints is None or len(r.boxes) == 0:
        return None, w, h, None
    i = int(r.boxes.conf.argmax())
    return r.keypoints.data[i].tolist(), w, h, r.boxes.xyxy[i].tolist()


def _dist(p, q):
    return math.hypot(p[0] - q[0], p[1] - q[1])


def estimate(side_img, top_img, side_dist_cm, top_dist_cm, stage, side_f35_mm=None, top_f35_mm=None):
    if stage not in STAGE_RANGES_KG:
        raise ValueError(f"stage must be one of {list(STAGE_RANGES_KG)}")
    (side, side_w, side_h, side_box), (top, top_w, top_h, top_box) = _keypoints("side", side_img), _keypoints("top", top_img)
    out = {"stage": stage, "validated": False, "focal_source": "exif" if side_f35_mm or top_f35_mm else "default",
           "side_kpt_conf": [round(k[2], 3) for k in side] if side else None,
           "top_kpt_conf": [round(k[2], 3) for k in top] if top else None}
    if side is None or top is None:
        return {**out, "retake": True, "reason": "goat not detected in " + ("side" if side is None else "top")}
    out["retake"] = min(k[2] for k in side + top) < MIN_CONF
    if out["retake"]:
        out["reason"] = f"keypoint confidence below {MIN_CONF}"

    sd, s, side_seg = _scale("side", side_img, side, side_box, side_dist_cm, side_w, side_h, side_f35_mm)
    td, t, top_seg = _scale("top", top_img, top, top_box, top_dist_cm, top_w, top_h, top_f35_mm)
    bl, ch, cw = _dist(side[0], side[1]) * s, _dist(side[2], side[3]) * s, _dist(top[0], top[1]) * t
    hg = ramanujan(ch / 2, cw / 2)
    c = json.loads(HUBER_JSON.read_text())[stage]
    bl, hg = c["body_length"][0] * bl + c["body_length"][1], c["heart_girth"][0] * hg + c["heart_girth"][1]
    w = schaeffer(hg, bl)
    lo, hi = STAGE_RANGES_KG[stage]
    return {**out, "body_length_cm": round(bl, 1), "chest_height_cm": round(ch, 1),
            "chest_width_cm": round(cw, 1), "heart_girth_cm": round(hg, 1), "weight_kg": round(w, 1),
            "stage_range_ok": lo <= w <= hi, "side_dist_cm": round(sd, 1), "top_dist_cm": round(td, 1),
            "distance_source": {"side": "auto" if side_dist_cm is None else "entered",
                                "top": "auto" if top_dist_cm is None else "entered"},
            "segmented": {"side": side_seg, "top": top_seg}}


if __name__ == "__main__":
    r = 10.0
    assert math.isclose(ramanujan(r, r), 2 * math.pi * r)  # circle: pi * diameter
    assert math.isclose(schaeffer(70, 60), 27.1218, abs_tol=1e-3)  # 70^2 * 60 / 10840 by hand
    assert math.isclose(focal_px("side", 640, 360), 320 / math.tan(math.radians(33)))  # old 640 px constant ~493
    assert math.isclose(focal_px("top", 4096, 2304), 6.4 * focal_px("top", 640, 360))  # scales with image size
    assert focal_px("side", 4000, 3000) == focal_px("side", 3000, 4000)  # portrait uses the long side too
    assert math.isclose(focal_px("side", 4000, 3000, 26), 26 * 5000 / 43.27)  # f35 via the 35 mm diagonal
    print("formula checks OK")
    from PIL import Image
    data = ROOT / "data"
    side_img = next((data / "goat-side-keypoints" / "test" / "images").glob("*.jpg"))
    top_img = next((data / "goat-top-keypoints" / "test" / "images").glob("*.jpg"))
    print(side_img.name, top_img.name)
    r = estimate(str(side_img), str(top_img), side_dist_cm=100, top_dist_cm=100, stage="adult")
    print(r)
    rp = estimate(Image.open(side_img), Image.open(top_img), side_dist_cm=100, top_dist_cm=100, stage="adult")
    assert math.isclose(r["weight_kg"], rp["weight_kg"], abs_tol=0.5), (r["weight_kg"], rp["weight_kg"])
    assert all("reason" in x for x in (r, rp) if x["retake"])
    rotated = Image.open(side_img).rotate(90, expand=True)
    assert _keypoints("side", rotated)[1:3] == rotated.size  # (w, h) of the portrait image, not the landscape one
    print("pipeline checks OK")
