"""HTTP tests for cloud_mock against a real server on a free port. Run from smartherd/: python -m unittest test_cloud -v"""
import base64
import http.client
import io
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

import cloud_mock
import pipeline

DATA = Path(__file__).resolve().parent.parent / "data"
SIDE = DATA / "test-photos" / "side-1.jpg"
TOP = DATA / "test-photos" / "top-1.jpg"
SIDE_BYTES = SIDE.read_bytes()
PORT = None


def call(method, path, body=None, token=None):
    """(status, parsed JSON or raw text)."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(f"http://127.0.0.1:{PORT}{path}", data, headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            status, raw = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    try:
        return status, json.loads(raw)
    except ValueError:
        return status, raw.decode(errors="replace")


def b64(path):
    return base64.b64encode(Path(path).read_bytes()).decode()


GOOD = {"uid": "g1", "stage": "adult", "side_dist_cm": 100, "top_dist_cm": 100,
        "side_image": b64(SIDE), "top_image": b64(TOP)}


def estimate_with(side_bytes, **extra):
    s, r = call("POST", "/api/estimate", {**GOOD, "side_image": base64.b64encode(side_bytes).decode(), **extra})
    assert s == 200, (s, r)
    return r


def rotated_with_exif_orientation_6(jpeg_bytes):
    """Pixels rotated 90 deg CCW and tagged Orientation=6, so a viewer that honours EXIF shows the original."""
    buf, exif = io.BytesIO(), Image.Exif()
    exif[0x0112] = 6
    Image.open(io.BytesIO(jpeg_bytes)).rotate(90, expand=True).save(buf, "JPEG", exif=exif, quality=95)
    return buf.getvalue()


class CloudTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        global PORT
        cls.tmp = tempfile.TemporaryDirectory()
        tmp = Path(cls.tmp.name)
        cloud_mock.DB, cloud_mock.UPLOADS, cloud_mock.TOKEN = tmp / "cloud.db", tmp / "uploads", ""
        cloud_mock.WEB = tmp / "web"
        cloud_mock.WEB.mkdir()
        (cloud_mock.WEB / "index.html").write_text("<p>app</p>")
        (cloud_mock.WEB / "a.js").write_text("console.log(1)")
        cls.server = cloud_mock.make_server("127.0.0.1", 0)
        PORT = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.tmp.cleanup()

    def test_health(self):
        self.assertEqual(call("GET", "/api/health"), (200, {"ok": True, "authorized": True}))

    def test_estimate_real_images(self):
        s, r = call("POST", "/api/estimate", {"uid": "t1", "stage": "adult", "side_dist_cm": 100,
                    "top_dist_cm": 100, "side_image": b64(SIDE), "top_image": b64(TOP)})
        self.assertEqual(s, 200)
        self.assertEqual(r["uid"], "t1"); self.assertIs(r["validated"], False)
        self.assertIn("retake", r)
        if r["retake"]: self.assertIn("reason", r)
        else: self.assertGreater(r["weight_kg"], 0); self.assertIn("stage_range_ok", r)
        self.assertTrue((cloud_mock.UPLOADS / "t1-side.jpg").exists())

    def test_exif_rotated_image_matches_upright(self):
        # rotate the side image's pixels, then tag it so EXIF undoes the rotation
        rot = rotated_with_exif_orientation_6(SIDE_BYTES)
        self.assertEqual(ImageOps.exif_transpose(Image.open(io.BytesIO(rot))).size, Image.open(io.BytesIO(SIDE_BYTES)).size)
        upright = estimate_with(SIDE_BYTES)
        rotated = estimate_with(rot)
        self.assertEqual(upright["retake"], rotated["retake"])
        if not upright["retake"]:
            self.assertAlmostEqual(upright["weight_kg"], rotated["weight_kg"], delta=0.05 * upright["weight_kg"])

    def test_bad_image_is_400(self):
        s, r = call("POST", "/api/estimate", {**GOOD, "side_image": base64.b64encode(b"not an image").decode()})
        self.assertEqual((s, r), (400, {"error": "could not read side image"}))

    def test_bad_fields_are_400(self):   # each of these alone -> 400
        for patch in ({"stage": "kid"}, {"uid": "../x"}, {"side_dist_cm": 5}, {"top_dist_cm": "far"}):
            self.assertEqual(call("POST", "/api/estimate", {**GOOD, **patch})[0], 400, patch)

    def test_auto_distance(self):
        auto = {k: v for k, v in GOOD.items() if not k.endswith("_dist_cm")}
        real = pipeline.DEPTH_PT
        pipeline.DEPTH_PT = Path("missing.pt"); self.addCleanup(setattr, pipeline, "DEPTH_PT", real)
        s, r = call("POST", "/api/estimate", auto)
        pipeline.DEPTH_PT = real
        self.assertEqual((s, r), (400, {"error": "enter the distance; automatic distance is not set up on this server"}))
        if not real.exists():
            self.skipTest("no checkpoints/depth_pro.pt")
        s, r = call("POST", "/api/estimate", {**auto, "side_dist_cm": None})  # null counts as missing too
        self.assertEqual(s, 200, r)
        self.assertEqual(r["distance_source"], {"side": "auto", "top": "auto"})
        self.assertEqual({k: type(v) for k, v in r["segmented"].items()}, {"side": bool, "top": bool})
        self.assertGreater(r["weight_kg"], 0); self.assertGreater(r["side_dist_cm"], 0)

    def test_records_idempotent(self):
        for _ in range(2):
            self.assertEqual(call("POST", "/records", {"uid": "r1", "weight_kg": 30})[0], 201)
        self.assertEqual([r for r in call("GET", "/api/records")[1] if r["uid"] == "r1"],
                         [{"uid": "r1", "weight_kg": 30}])

    def test_tombstone_replaces_record(self):
        call("POST", "/api/records", {"uid": "r2", "weight_kg": 30})
        call("POST", "/api/records", {"uid": "r2", "deleted": True})
        self.assertIn({"uid": "r2", "deleted": True}, call("GET", "/api/records")[1])

    def test_token_required(self):
        cloud_mock.TOKEN = "s3cret"; self.addCleanup(setattr, cloud_mock, "TOKEN", "")
        self.assertEqual(call("GET", "/api/records")[0], 401)
        self.assertEqual(call("GET", "/api/records", token="wrong")[0], 401)
        self.assertEqual(call("GET", "/api/records", token="s3cret")[0], 200)
        self.assertEqual(call("GET", "/api/health")[1], {"ok": True, "authorized": False})
        # a large upload with a wrong code must get a clean 401, not a reset connection
        self.assertEqual(call("POST", "/api/estimate", {"uid": "big", "pad": "x" * 5_000_000}, token="wrong")[0], 401)

    def test_oversize_is_413(self):
        c = http.client.HTTPConnection("127.0.0.1", PORT, timeout=10)
        c.putrequest("POST", "/api/estimate")
        c.putheader("Content-Length", str(cloud_mock.MAX_BODY + 1))
        c.endheaders(b"{}")
        r = c.getresponse()
        self.assertEqual((r.status, json.loads(r.read())), (413, {"error": "upload too large"}))
        c.close()

    def test_cors_preflight(self):
        req = urllib.request.Request(f"http://127.0.0.1:{PORT}/api/estimate", method="OPTIONS")
        with urllib.request.urlopen(req, timeout=10) as r:
            self.assertEqual(r.status, 204)
            self.assertEqual(r.headers["Access-Control-Allow-Origin"], "*")

    def test_static_web_app(self):
        self.assertIn("app", call("GET", "/")[1])
        self.assertEqual(call("GET", "/a.js")[0], 200)
        self.assertEqual(call("GET", "/goat/123"), (200, "<p>app</p>"))
        for path in ("/../cloud_mock.py", "/%2e%2e/cloud_mock.py"):
            self.assertNotIn("import sqlite3", str(call("GET", path)[1]), path)
        self.assertEqual(call("GET", "/api/nope"), (404, {"error": "not found"}))

    def test_focal_from_f35(self):
        default = estimate_with(SIDE_BYTES)
        f35 = estimate_with(SIDE_BYTES, side_f35_mm=26)
        self.assertEqual((default["focal_source"], f35["focal_source"]), ("default", "exif"))
        self.assertNotEqual(default["body_length_cm"], f35["body_length_cm"])
        self.assertEqual(estimate_with(SIDE_BYTES, side_f35_mm=5000)["focal_source"], "default")  # out of range

    def test_focal_from_exif_tag(self):
        buf, exif = io.BytesIO(), Image.Exif()
        exif.get_ifd(0x8769)[0xA405] = 26  # FocalLengthIn35mmFilm
        Image.open(SIDE).save(buf, "JPEG", exif=exif, quality=95)
        self.assertEqual(estimate_with(buf.getvalue())["focal_source"], "exif")


if __name__ == "__main__":
    unittest.main()
