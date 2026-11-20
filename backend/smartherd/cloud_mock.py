"""SmartHerd server: POST /api/estimate (base64 photos -> pipeline.estimate), /api/records sync store (SQLite), health,
and the exported web app from the app repo's dist/. Every API path also answers without /api so the Pi's /records keeps working.
ponytail: one shared access code (env SMARTHERD_TOKEN, empty = auth off) instead of per-user login.
Usage: python cloud_mock.py [port=8766] [--host 127.0.0.1]
"""
import argparse
import base64
import hmac
import json
import os
import re
import sqlite3
import threading
import traceback
from contextlib import closing
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
DB = HERE / "cloud.db"
UPLOADS = HERE / "uploads"
WEB = HERE.parent.parent / "dist"  # backend/ sits inside the app repo; dist/ is the app's web export
TOKEN = os.environ.get("SMARTHERD_TOKEN", "")
MAX_BODY = 30 * 1024 * 1024
UID = re.compile(r"[A-Za-z0-9_-]{1,64}")  # also the path-traversal guard for upload filenames
_LOCK = threading.Lock()  # the models are not safe to run from two threads


class HttpError(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code = code


def _db():
    c = sqlite3.connect(DB)
    c.execute("CREATE TABLE IF NOT EXISTS records (uid TEXT PRIMARY KEY, body TEXT)")
    return c


def _number(v, lo, hi):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and lo <= v <= hi


def _image(b64, view):
    """pipeline.load_photo of a base64 string (optional data: prefix); 400 on anything unreadable."""
    import pipeline
    try:
        return pipeline.load_photo(base64.b64decode(b64.split(",", 1)[1] if b64.startswith("data:") else b64))
    except Exception:
        raise HttpError(400, f"could not read {view} image")


class Api(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WEB), **kw)

    def end_headers(self):  # CORS on every response, static files included
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def log_request(self, code="-", size="-"):
        print(self.command, self.path, code, flush=True)

    def _reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        return self.path.split("?")[0].removeprefix("/api")

    def _authorized(self):
        return not TOKEN or hmac.compare_digest(self.headers.get("Authorization", "").encode(), f"Bearer {TOKEN}".encode())

    def _auth(self):
        if not self._authorized():
            raise HttpError(401, "access code required")

    def _body(self):
        """Raw request body; 413 before reading anything too large."""
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise HttpError(400, "bad Content-Length")
        if n > MAX_BODY:
            raise HttpError(413, "upload too large")
        return self.rfile.read(n)

    def _json(self, raw):
        """Request body as a dict with a valid uid."""
        try:
            obj = json.loads(raw)
        except ValueError:
            raise HttpError(400, "need a JSON object")
        if not isinstance(obj, dict):
            raise HttpError(400, "need a JSON object")
        if not isinstance(obj.get("uid"), str) or not UID.fullmatch(obj["uid"]):
            raise HttpError(400, "bad uid")
        return obj

    def _estimate(self, req):
        import pipeline
        uid, stage = req["uid"], req.get("stage")
        if stage not in pipeline.STAGE_RANGES_KG:
            raise HttpError(400, "stage must be young, grower or adult")
        dists = [req.get(k) for k in ("side_dist_cm", "top_dist_cm")]  # None = measure with Depth Pro
        if not all(d is None or _number(d, 10, 1000) for d in dists):
            raise HttpError(400, "distance must be 10-1000 cm")
        if None in dists and not pipeline.DEPTH_PT.exists():
            raise HttpError(400, "enter the distance; automatic distance is not set up on this server")
        imgs, f35 = {}, {}
        for view in ("side", "top"):
            imgs[view], exif_f35 = _image(req.get(f"{view}_image"), view)
            given = req.get(f"{view}_f35_mm")
            f35[view] = given if _number(given, *pipeline.F35_RANGE) else exif_f35
        UPLOADS.mkdir(parents=True, exist_ok=True)
        for view, im in imgs.items():
            im.save(UPLOADS / f"{uid}-{view}.jpg", quality=90)
        try:
            with _LOCK:
                r = pipeline.estimate(imgs["side"], imgs["top"], *dists, stage,
                                      side_f35_mm=f35["side"], top_f35_mm=f35["top"])
        except Exception:
            traceback.print_exc()
            raise HttpError(500, "estimate failed")
        return {**r, "uid": uid}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        try:
            route = self._route()
            if route not in ("/estimate", "/records"):
                raise HttpError(404, "not found")
            # Read the upload before refusing it: replying 401 mid-upload resets the connection,
            # and the browser then reports "unreachable" instead of the access-code error.
            raw = self._body()
            self._auth()
            req = self._json(raw)
            if route == "/estimate":
                return self._reply(200, self._estimate(req))
            with closing(_db()) as c, c:  # uid key: a retried POST is idempotent, a tombstone replaces the record
                c.execute("INSERT OR REPLACE INTO records VALUES (?, ?)", (req["uid"], json.dumps(req)))
            self._reply(201, {"ok": True, "uid": req["uid"]})
        except HttpError as e:
            self.close_connection = True  # the body may be unread
            self._reply(e.code, {"error": str(e)})

    def do_GET(self):
        route = self._route()
        try:
            if route == "/health":
                return self._reply(200, {"ok": True, "authorized": self._authorized()})
            if route == "/records":
                self._auth()
                with closing(_db()) as c:
                    return self._reply(200, [json.loads(b) for (b,) in c.execute("SELECT body FROM records")])
            if self.path.startswith("/api/") or not WEB.is_dir():
                raise HttpError(404, "not found")
        except HttpError as e:
            return self._reply(e.code, {"error": str(e)})
        if not os.path.isfile(self.translate_path(self.path)):  # translate_path already drops ".." segments
            self.path = "/index.html"  # single-page app fallback
        super().do_GET()


def make_server(host, port):
    return ThreadingHTTPServer((host, port), Api)


def _warm_up():
    import pipeline
    with _LOCK:
        pipeline._model("side"), pipeline._model("top")
        if pipeline.DEPTH_PT.exists():
            pipeline._depth_model(), pipeline._seg()
    print("models loaded", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("port", nargs="?", type=int, default=8766)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()
    threading.Thread(target=_warm_up, daemon=True).start()  # so the first phone request is not a 20 s wait
    print(f"SmartHerd server on http://{args.host}:{args.port} (access code {'on' if TOKEN else 'off'})", flush=True)
    make_server(args.host, args.port).serve_forever()
