"""上傳 INTRO_long.mp4 到 Mux 並寫進 sort_order=1 chapter,設 is_free_preview=true。
auto stereo fix mono 檔。
"""
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
PC_PATH = "C:/Users/JD/oxford-autopilot/out/INTRO_long.mp4"


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


def stereo_fix():
    print("checking audio channels...")
    r = subprocess.run(
        ["ssh", PC_HOST,
         f"ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=noprint_wrappers=1:nokey=1 '{PC_PATH}'"],
        capture_output=True, text=True, timeout=30,
    )
    ch = r.stdout.strip()
    if ch == "2":
        print("  already stereo, skip")
        return True
    print(f"  mono({ch}ch) → stereo upmix...")
    cmd = (
        f"ffmpeg -y -i '{PC_PATH}' -c:v copy -c:a aac -b:a 128k -ac 2 '{PC_PATH}.stereo_tmp.mp4' "
        f"2>$null; if (Test-Path '{PC_PATH}.stereo_tmp.mp4') {{ Move-Item '{PC_PATH}.stereo_tmp.mp4' '{PC_PATH}' -Force; 'OK' }} else {{ 'FAIL' }}"
    )
    r = subprocess.run(["ssh", PC_HOST, cmd], capture_output=True, text=True, timeout=600)
    return "OK" in r.stdout


def main():
    if not stereo_fix():
        sys.exit("stereo fix failed")

    course = http_json(
        f"{SUPABASE_URL}/rest/v1/courses?slug=eq.{COURSE_SLUG}&select=id",
        headers=supa(),
    )[0]
    course_id = course["id"]

    chs = http_json(
        f"{SUPABASE_URL}/rest/v1/course_chapters"
        f"?course_id=eq.{course_id}&sort_order=eq.1"
        f"&select=id,mux_playback_id,title",
        headers=supa(),
    )
    ch = chs[0]
    print(f"chapter sort_order=1: {ch['title']}")

    # 刪舊 asset(若有)
    if ch.get("mux_playback_id"):
        try:
            info = http_json(
                f"https://api.mux.com/video/v1/playback-ids/{ch['mux_playback_id']}",
                headers=mux(),
            )
            request.urlopen(request.Request(
                f"https://api.mux.com/video/v1/assets/{info['data']['object']['id']}",
                method="DELETE",
                headers=mux(),
            )).read()
            print("  old asset deleted")
        except Exception as e:
            print(f"  (no old asset: {e})")

    # 建 upload + curl PUT
    print("creating Mux upload...")
    res = http_json(
        "https://api.mux.com/video/v1/uploads",
        method="POST",
        headers=mux(),
        body={
            "cors_origin": "*",
            "new_asset_settings": {
                "playback_policy": ["signed"],
                "passthrough": f"chapter:{ch['id']}:intro",
                "encoding_tier": "smart",
            },
        },
    )
    upload_url = res["data"]["url"]
    upload_id = res["data"]["id"]
    print(f"  upload_id={upload_id}")

    cmd = (
        f"curl.exe -s -X PUT -T '{PC_PATH}' "
        f"-H 'Content-Type: application/octet-stream' '{upload_url}'"
    )
    print("PC → Mux upload...")
    t0 = time.time()
    r = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=10", PC_HOST, cmd],
        capture_output=True, text=True, timeout=1800,
    )
    if r.returncode != 0:
        sys.exit(f"upload failed: {r.stderr[:300]}")
    print(f"  uploaded in {int(time.time() - t0)}s")

    # poll asset
    print("polling asset...")
    asset_id = None
    for _ in range(180):
        u = http_json(f"https://api.mux.com/video/v1/uploads/{upload_id}", headers=mux())
        if u["data"]["status"] == "asset_created":
            asset_id = u["data"].get("asset_id")
            if asset_id:
                break
        time.sleep(5)
    if not asset_id:
        sys.exit("asset not created")
    print(f"  asset_id={asset_id}")

    info = None
    for _ in range(360):
        a = http_json(f"https://api.mux.com/video/v1/assets/{asset_id}", headers=mux())
        if a["data"]["status"] == "ready":
            info = (a["data"]["playback_ids"][0]["id"], int(a["data"].get("duration", 0)))
            break
        time.sleep(10)
    if not info:
        sys.exit("asset not ready")
    pb, dur = info
    print(f"  playback_id={pb} duration={dur}s")

    # update DB:寫 mux_playback_id + duration + is_free_preview=true
    request.urlopen(request.Request(
        f"{SUPABASE_URL}/rest/v1/course_chapters?id=eq.{ch['id']}",
        method="PATCH",
        headers={**supa(), "Content-Type": "application/json"},
        data=json.dumps({
            "mux_playback_id": pb,
            "duration_seconds": dur,
            "is_free_preview": True,
        }).encode(),
    )).read()
    print(f"\n[OK] INTRO chapter 1 updated. is_free_preview=TRUE, playback_id={pb}")


if __name__ == "__main__":
    main()
