"""把 8 隻 bg 影片從 PC 上傳 Mux,更新 course_chapters.mux_playback_id_bg。"""
import argparse
import base64
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib import request

ENV_FILE = Path(__file__).resolve().parent.parent / ".env.local"


def load_env():
    env = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in ('"', "'"):
            v = v[1:-1]
        env[k.strip()] = v
    return env


ENV = load_env()
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
MUX_AUTH = "Basic " + base64.b64encode(
    f"{ENV['MUX_TOKEN_ID']}:{ENV['MUX_TOKEN_SECRET']}".encode()
).decode()
COURSE_SLUG = "master-space-age-capital"
PC_HOST = "jd@100.109.36.77"
PC_OUT_DIR = "C:/Users/JD/oxford-autopilot/out"

CHAPTER_VIDEOS = [
    (2, "RKLB"),
    (3, "IRDM"),
    (4, "ASTS"),
    (5, "FLY"),
    (6, "GLOBALSTAR"),
    (7, "PLANET"),
    (8, "REDWIRE"),
    (9, "LUNA"),
]


def http_json(url, method="GET", headers=None, body=None):
    headers = dict(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers.setdefault("Content-Type", "application/json")
    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def supa():
    return {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}


def mux():
    return {"Authorization": MUX_AUTH}


def get_course_id():
    res = http_json(
        f"{SUPABASE_URL}/rest/v1/courses?slug=eq.{COURSE_SLUG}&select=id",
        headers=supa(),
    )
    return res[0]["id"] if res else sys.exit(f"course not found: {COURSE_SLUG}")


def get_chapter(course_id, sort_order):
    res = http_json(
        f"{SUPABASE_URL}/rest/v1/course_chapters"
        f"?course_id=eq.{course_id}&sort_order=eq.{sort_order}"
        f"&select=id,mux_playback_id_bg,title",
        headers=supa(),
    )
    return res[0] if res else None


def update_chapter(chapter_id, fields):
    request.urlopen(request.Request(
        f"{SUPABASE_URL}/rest/v1/course_chapters?id=eq.{chapter_id}",
        method="PATCH",
        headers={**supa(), "Content-Type": "application/json"},
        data=json.dumps(fields).encode(),
    )).read()


def create_mux_upload(passthrough):
    res = http_json(
        "https://api.mux.com/video/v1/uploads",
        method="POST",
        headers=mux(),
        body={
            "cors_origin": "*",
            "new_asset_settings": {
                "playback_policy": ["signed"],
                "passthrough": passthrough,
                "encoding_tier": "smart",
            },
        },
    )
    return {"url": res["data"]["url"], "id": res["data"]["id"]}


def upload_from_pc(remote_path, signed_url):
    cmd = (
        f"curl.exe -s -X PUT -T '{remote_path}' "
        f"-H 'Content-Type: application/octet-stream' '{signed_url}'"
    )
    r = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=10", PC_HOST, cmd],
        capture_output=True, text=True, timeout=1800,
    )
    if r.returncode != 0:
        print(f"    upload err: {r.stderr.strip()[:200]}")
        return False
    return True


def poll_upload(upload_id, timeout=900):
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = http_json(
            f"https://api.mux.com/video/v1/uploads/{upload_id}",
            headers=mux(),
        )
        s = res["data"]["status"]
        if s == "asset_created" and res["data"].get("asset_id"):
            return res["data"]["asset_id"]
        if s == "errored":
            print(f"    upload errored: {res['data'].get('error', {})}")
            return None
        time.sleep(5)
    return None


def poll_asset(asset_id, timeout=1800):
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = http_json(
            f"https://api.mux.com/video/v1/assets/{asset_id}",
            headers=mux(),
        )
        s = res["data"]["status"]
        if s == "ready":
            pbs = res["data"].get("playback_ids", [])
            dur = res["data"].get("duration", 0)
            if pbs:
                return {"playback_id": pbs[0]["id"], "duration": int(dur)}
        if s == "errored":
            print(f"    asset errored: {res['data'].get('errors', [])}")
            return None
        time.sleep(10)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    course_id = get_course_id()
    print(f"course_id: {course_id}")

    for sort_order, ticker in CHAPTER_VIDEOS:
        ch = get_chapter(course_id, sort_order)
        if not ch:
            print(f"[{sort_order}] {ticker}: chapter not found, SKIP")
            continue
        print(f"\n[{sort_order}] {ticker} bg — {ch['title']}")

        if ch["mux_playback_id_bg"] and not args.force:
            print(f"    already has bg playback_id, SKIP")
            continue

        remote_path = f"{PC_OUT_DIR}/{ticker}_bg.mp4"
        passthrough = f"chapter:{ch['id']}:bg:{ticker}"

        print(f"  [a] create Mux upload ...")
        upload = create_mux_upload(passthrough)
        print(f"      upload_id={upload['id']}")

        print(f"  [b] PC curl PUT {remote_path} ...")
        t0 = time.time()
        if not upload_from_pc(remote_path, upload["url"]):
            print(f"    upload FAIL")
            continue
        print(f"      uploaded in {int(time.time() - t0)}s")

        print(f"  [c] poll asset_created ...")
        asset_id = poll_upload(upload["id"])
        if not asset_id:
            continue
        print(f"      asset_id={asset_id}")

        print(f"  [d] poll asset → ready ...")
        info = poll_asset(asset_id)
        if not info:
            continue
        print(f"      playback_id={info['playback_id']}, duration={info['duration']}s")

        print(f"  [e] update course_chapters ...")
        update_chapter(ch["id"], {
            "mux_playback_id_bg": info["playback_id"],
            "duration_seconds_bg": info["duration"],
        })
        print(f"  [OK] {ticker} bg done")

    print("\nALL BG DONE")


if __name__ == "__main__":
    main()
