"""只重 upload IRDM_long.mp4 到 Mux 並更新 DB（其他章節不動）。"""
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
PC_OUT = "C:/Users/JD/oxford-autopilot/out/IRDM_long.mp4"
TICKER = "IRDM"
SORT_ORDER = 3


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


def main():
    course = http_json(
        f"{SUPABASE_URL}/rest/v1/courses?slug=eq.{COURSE_SLUG}&select=id",
        headers=supa(),
    )
    course_id = course[0]["id"]
    chs = http_json(
        f"{SUPABASE_URL}/rest/v1/course_chapters"
        f"?course_id=eq.{course_id}&sort_order=eq.{SORT_ORDER}"
        f"&select=id,mux_playback_id,title",
        headers=supa(),
    )
    ch = chs[0]
    print(f"chapter: {ch['title']} (id={ch['id']})")
    print(f"old playback_id: {ch['mux_playback_id']}")

    # Try to delete old Mux asset (best-effort)
    if ch["mux_playback_id"]:
        try:
            assets = http_json(
                f"https://api.mux.com/video/v1/playback-ids/{ch['mux_playback_id']}",
                headers=mux(),
            )
            old_asset = assets["data"]["object"]["id"]
            print(f"deleting old asset {old_asset}...")
            req = request.Request(
                f"https://api.mux.com/video/v1/assets/{old_asset}",
                method="DELETE",
                headers=mux(),
            )
            request.urlopen(req).read()
            print("  old asset deleted")
        except Exception as e:
            print(f"  (could not delete old asset: {e})")

    # Create new upload
    print("creating Mux direct upload...")
    res = http_json(
        "https://api.mux.com/video/v1/uploads",
        method="POST",
        headers=mux(),
        body={
            "cors_origin": "*",
            "new_asset_settings": {
                "playback_policy": ["signed"],
                "passthrough": f"chapter:{ch['id']}:ticker:{TICKER}",
                "encoding_tier": "smart",
            },
        },
    )
    upload_id = res["data"]["id"]
    upload_url = res["data"]["url"]
    print(f"  upload_id={upload_id}")

    # PC curl PUT
    print(f"PC curl PUT {PC_OUT}...")
    cmd = (
        f"curl.exe -s -X PUT -T '{PC_OUT}' "
        f"-H 'Content-Type: application/octet-stream' '{upload_url}'"
    )
    t0 = time.time()
    r = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=10", PC_HOST, cmd],
        capture_output=True, text=True, timeout=1800,
    )
    if r.returncode != 0:
        sys.exit(f"PC upload fail: {r.stderr.strip()[:300]}")
    print(f"  uploaded in {int(time.time() - t0)}s")

    # Wait asset_created
    print("waiting asset_created...")
    deadline = time.time() + 900
    asset_id = None
    while time.time() < deadline:
        u = http_json(
            f"https://api.mux.com/video/v1/uploads/{upload_id}",
            headers=mux(),
        )
        if u["data"]["status"] == "asset_created":
            asset_id = u["data"]["asset_id"]
            break
        time.sleep(5)
    if not asset_id:
        sys.exit("asset not created in 15min")
    print(f"  asset_id={asset_id}")

    # Wait ready
    print("waiting asset ready...")
    deadline = time.time() + 1800
    info = None
    while time.time() < deadline:
        a = http_json(
            f"https://api.mux.com/video/v1/assets/{asset_id}",
            headers=mux(),
        )
        if a["data"]["status"] == "ready":
            info = {
                "playback_id": a["data"]["playback_ids"][0]["id"],
                "duration": int(a["data"].get("duration", 0)),
            }
            break
        time.sleep(10)
    if not info:
        sys.exit("asset not ready in 30min")
    print(f"  playback_id={info['playback_id']}, duration={info['duration']}s")

    # Update DB
    print("updating course_chapters...")
    request.urlopen(request.Request(
        f"{SUPABASE_URL}/rest/v1/course_chapters?id=eq.{ch['id']}",
        method="PATCH",
        headers={**supa(), "Content-Type": "application/json"},
        data=json.dumps({
            "mux_playback_id": info["playback_id"],
            "duration_seconds": info["duration"],
        }).encode(),
    )).read()
    print(f"\n[OK] IRDM updated. New playback_id: {info['playback_id']}")


if __name__ == "__main__":
    main()
