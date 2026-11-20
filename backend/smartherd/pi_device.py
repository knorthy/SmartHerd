"""The 'Pi': side ToF read directly, top ToF from the ESP32 link, pipeline.estimate, local SQLite store, cloud sync.
Weighing never needs the network; sync() pushes pending records when the cloud is reachable.
"""
import json
import os
import socket
import sqlite3
import statistics
import urllib.request
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

import esp32_sim
import pipeline

DB = Path(__file__).with_name("records.db")
ESP32_ADDR = ("127.0.0.1", 8765)
CLOUD_URL = "http://127.0.0.1:8766/records"
TOKEN = os.environ.get("SMARTHERD_TOKEN", "")  # the cooperative's shared access code
SIDE_BASE_CM = 100.0  # CALIBRATION: simulated side camera-to-goat distance
N_READS = 5  # median of this many ToF readings
COLS = ("uid", "goat_id", "stage", "ts", "side_dist_cm", "top_dist_cm", "measurements", "weight_kg",
        "validated", "retake", "synced")


def _db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute(f"CREATE TABLE IF NOT EXISTS records ({', '.join(COLS)})")
    return c


def top_distance_cm(n=N_READS):
    """Median of the next n 'TOF,<cm>' lines from the ESP32; malformed lines are skipped."""
    vals = []
    with socket.create_connection(ESP32_ADDR, timeout=3) as s, s.makefile() as f:
        for line in f:
            tag, _, cm = line.strip().partition(",")
            try:
                if tag == "TOF":
                    vals.append(float(cm))
            except ValueError:
                continue
            if len(vals) == n:
                break
    return statistics.median(vals)  # raises if the link died before any reading


def side_distance_cm(n=N_READS):
    vals = []
    while len(vals) < n:
        v = esp32_sim.tof_cm(SIDE_BASE_CM)
        if v is not None:  # dropout: read again
            vals.append(v)
    return statistics.median(vals)


def weigh(side_img_path, top_img_path, goat_id, stage):
    side_cm, top_cm = side_distance_cm(), top_distance_cm()
    r = pipeline.estimate(str(side_img_path), str(top_img_path), side_cm, top_cm, stage)
    if r["retake"]:
        return {"goat_id": goat_id, "retake": True,
                "reason": r.get("reason", f"keypoint confidence below {pipeline.MIN_CONF}")}
    skip = {"stage", "validated", "retake", "weight_kg"}
    rec = {"uid": uuid.uuid4().hex, "goat_id": goat_id, "stage": stage,
           "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "side_dist_cm": side_cm, "top_dist_cm": top_cm,
           "measurements": json.dumps({k: v for k, v in r.items() if k not in skip}),
           "weight_kg": r["weight_kg"], "validated": False, "retake": False, "synced": 0}
    with closing(_db()) as c, c:
        c.execute(f"INSERT INTO records VALUES ({', '.join('?' * len(COLS))})", [rec[k] for k in COLS])
    return rec


def sync():
    """POST every unsynced record; mark synced=1 on success. Returns how many synced (0 if the cloud is down)."""
    n = 0
    with closing(_db()) as c:
        for row in c.execute("SELECT * FROM records WHERE synced = 0").fetchall():
            rec = {**dict(row), "measurements": json.loads(row["measurements"]), "validated": bool(row["validated"]),
                   "retake": bool(row["retake"])}
            del rec["synced"]
            headers = {"Content-Type": "application/json", **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {})}
            req = urllib.request.Request(CLOUD_URL, json.dumps(rec).encode(), headers)
            try:
                urllib.request.urlopen(req, timeout=3).close()
            except OSError:  # offline / cloud error: keep pending, retry next sync
                break
            with c:
                c.execute("UPDATE records SET synced = 1 WHERE uid = ?", (row["uid"],))
            n += 1
    return n


def record(uid):
    with closing(_db()) as c:
        return dict(c.execute("SELECT * FROM records WHERE uid = ?", (uid,)).fetchone())
