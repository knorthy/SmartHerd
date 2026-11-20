"""Error of the pipeline against the team's own scale and tape measurements (data/ground_truth/measurements.csv).
Usage: python evaluate.py <csv> [--fit]    |    python evaluate.py --selftest
CSV columns: goat_id,stage,side_img,top_img,side_dist_cm,top_dist_cm,scale_kg,tape_girth_cm,tape_length_cm
(image paths relative to the CSV's folder; tape columns may be empty). Photos go through pipeline.load_photo, the same
EXIF rotation and focal-length path the server uses. --fit writes per-stage Huber corrections to huber.json.
"""
import argparse
import contextlib
import csv
import io
import json
import statistics
import tempfile
from pathlib import Path

import pipeline

COLS = ["goat_id", "stage", "side_img", "top_img", "side_dist_cm", "top_dist_cm", "scale_kg", "tape_girth_cm",
        "tape_length_cm"]
MIN_FIT_ROWS = 10
TAPE = {"heart_girth": ("heart_girth_cm", "tape_girth_cm"), "body_length": ("body_length_cm", "tape_length_cm")}


def run(csv_path):
    """[(row, estimate dict)] for every row; retakes are printed and kept (with retake=True)."""
    base, out = Path(csv_path).parent, []
    with open(csv_path, newline="") as f:
        for r in csv.DictReader(f):
            (side, sf), (top, tf) = (pipeline.load_photo((base / r[k]).read_bytes()) for k in ("side_img", "top_img"))
            e = pipeline.estimate(side, top, float(r["side_dist_cm"]), float(r["top_dist_cm"]), r["stage"], sf, tf)
            if e["retake"]:
                print(f"retake {r['goat_id']}: {e['reason']}")
            out.append((r, e))
    return out


def report(label, rows):
    ok = [(r, e) for r, e in rows if not e["retake"]]
    if not ok:
        return print(f"{label}: n=0")
    err = [(abs(e["weight_kg"] - float(r["scale_kg"])), float(r["scale_kg"])) for r, e in ok]
    parts = [f"{label}: n={len(ok)}", f"weight MAE {statistics.mean(d for d, _ in err):.2f} kg",
             f"MAPE {100 * statistics.mean(d / kg for d, kg in err):.1f}%"]
    for name, (key, col) in TAPE.items():
        d = [abs(e[key] - float(r[col])) for r, e in ok if r.get(col)]
        if d:
            parts.append(f"{name} MAE {statistics.mean(d):.2f} cm (n={len(d)})")
    print(", ".join(parts))


def fit(rows):
    """Fit each stage's correction on raw (uncorrected) measurements vs tape; stages with too few rows keep theirs."""
    huber = json.loads(pipeline.HUBER_JSON.read_text())
    for stage in pipeline.STAGE_RANGES_KG:
        for name, (key, col) in TAPE.items():
            slope, icpt = huber[stage][name]  # undo the correction estimate() applied, so re-fitting is idempotent
            pairs = [((e[key] - icpt) / slope, float(r[col])) for r, e in rows
                     if r["stage"] == stage and not e["retake"] and r.get(col)]
            if len(pairs) < MIN_FIT_ROWS:
                print(f"fit {stage} {name}: {len(pairs)} rows < {MIN_FIT_ROWS}, kept {huber[stage][name]}")
                continue
            huber[stage][name] = pipeline.fit_huber(*zip(*pairs))
            print(f"fit {stage} {name}: {len(pairs)} rows -> {huber[stage][name]}")
    pipeline.HUBER_JSON.write_text(json.dumps(huber, indent=2) + "\n")


def main(csv_path, do_fit=False):
    rows = run(csv_path)
    for stage in pipeline.STAGE_RANGES_KG:
        if any(r["stage"] == stage for r, _ in rows):
            report(stage, [x for x in rows if x[0]["stage"] == stage])
    report("overall", rows)
    if do_fit:
        fit(rows)
    return rows


def selftest():
    imgs = {v: sorted((pipeline.ROOT / "data" / f"goat-{v}-keypoints" / "test" / "images").glob("*.jpg"))[:3]
            for v in ("side", "top")}
    scale = [25.0, 31.5, 40.0]  # made-up scale weights
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "m.csv"
        with open(path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(COLS)
            for i, (s, t, kg) in enumerate(zip(imgs["side"], imgs["top"], scale)):
                w.writerow([f"T{i}", "adult", s, t, 100, 100, kg, "", ""])
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rows = main(path)
    printed = buf.getvalue()
    print(printed, end="")
    ok = [(float(r["scale_kg"]), e["weight_kg"]) for r, e in rows if not e["retake"]]
    assert ok, "every test pair was a retake"
    mae = sum(abs(est - kg) for kg, est in ok) / len(ok)  # by hand
    assert f"overall: n={len(ok)}, weight MAE {mae:.2f} kg" in printed, (mae, printed)
    print("evaluate selftest OK")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", nargs="?")
    ap.add_argument("--fit", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        selftest()
    elif a.csv:
        main(a.csv, a.fit)
    else:
        ap.error("give a CSV path or --selftest")
