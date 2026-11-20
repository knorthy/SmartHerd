"""Virtual-IoT demo: ESP32 sim + cloud mock as subprocesses, the Pi weighs goats online, then offline -> resync.
ponytail: TCP stands in for USB serial, HTTP + SQLite for the cloud DB; MQTT/broker skipped.
The offline/sync asserts below are the self-check.
"""
import json
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pi_device

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"


def start(script, port):
    p = subprocess.Popen([sys.executable, str(HERE / script), str(port)])
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.2).close()
            return p
        except OSError:
            time.sleep(0.2)
    p.kill()
    raise RuntimeError(f"{script} did not start on port {port}")


def stop(p):
    p.terminate()
    p.wait()


def goats():
    """Yield test image pairs (side, top); weigh() returns retake for pairs the models can't read."""
    side = sorted((DATA / "goat-side-keypoints" / "test" / "images").glob("*.jpg"))
    top = sorted((DATA / "goat-top-keypoints" / "test" / "images").glob("*.jpg"))
    yield from zip(side, top)


def weigh_next(pairs, goat_id, stage):
    for s, t in pairs:
        rec = pi_device.weigh(s, t, goat_id, stage)
        if not rec["retake"]:
            print(f"{goat_id} [{stage}] {rec['weight_kg']} kg  side={rec['side_dist_cm']}cm top={rec['top_dist_cm']}cm "
                  f"synced={rec['synced']}  ({s.name[:14]} + {t.name[:10]})\n   measurements={rec['measurements']}")
            return rec
        print(f"{goat_id} RETAKE: {rec['reason']}  ({s.name[:14]} + {t.name[:10]})")
    raise RuntimeError("ran out of test image pairs")


if __name__ == "__main__":
    esp_port, cloud_port = pi_device.ESP32_ADDR[1], int(pi_device.CLOUD_URL.split(":")[-1].split("/")[0])
    procs = {"esp": start("esp32_sim.py", esp_port), "cloud": start("cloud_mock.py", cloud_port)}
    try:
        pairs = goats()
        for gid, stage in [("G001", "adult"), ("G002", "grower"), ("G003", "young")]:
            weigh_next(pairs, gid, stage)
            print("   sync ->", pi_device.sync())

        print("\n-- OFFLINE: cloud stopped --")
        stop(procs.pop("cloud"))
        rec = weigh_next(pairs, "G004", "adult")
        n = pi_device.sync()
        print("   sync while offline ->", n)
        assert n == 0 and pi_device.record(rec["uid"])["synced"] == 0, "record must stay unsynced offline"

        print("\n-- ONLINE again: cloud restarted --")
        procs["cloud"] = start("cloud_mock.py", cloud_port)
        n = pi_device.sync()
        print("synced", n)
        assert n >= 1 and pi_device.record(rec["uid"])["synced"] == 1, "record must sync once online"
        cloud = json.load(urllib.request.urlopen(pi_device.CLOUD_URL, timeout=3))
        assert rec["uid"] in {r["uid"] for r in cloud}, "offline record must reach the cloud"
        print(f"cloud holds {len(cloud)} records; self-check OK")
    finally:
        for p in procs.values():
            stop(p)
