"""管線化:從 PC 一隻一隻拿 main + bg 上 Mux,自動 stereo fix mono,刪舊 asset 換新 playback_id。

使用:
  python3 scripts/upload_all_v2.py             # 全部
  python3 scripts/upload_all_v2.py ASTS RKLB   # 指定 tickers

順序:每個 ticker 先 main 後 bg。
"""
import argparse
import base64
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib import request

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env.local"


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
PC_OUT = "C:/Users/JD/oxford-autopilot/out"

# (sort_order, ticker) — 8 章付費內容
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
    return res[0]["id"] if res else sys.exit(f"course not found")


def get_chapter(course_id, sort_order):
    res = http_json(
        f"{SUPABASE_URL}/rest/v1/course_chapters"
        f"?course_id=eq.{course_id}&sort_order=eq.{sort_order}"
        f"&select=id,mux_playback_id,mux_playback_id_bg,title",
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


def delete_old_asset(playback_id):
    """Best-effort 刪舊 asset 省 Mux 儲存費"""
    if not playback_id:
        return
    try:
        info = http_json(
            f"https://api.mux.com/video/v1/playback-ids/{playback_id}",
            headers=mux(),
        )
        asset_id = info["data"]["object"]["id"]
        request.urlopen(request.Request(
            f"https://api.mux.com/video/v1/assets/{asset_id}",
            method="DELETE",
            headers=mux(),
        )).read()
        print(f"      [del old asset {asset_id}]", flush=True)
    except Exception as e:
        print(f"      (could not delete old: {str(e)[:80]})", flush=True)


def file_exists_on_pc(path):
    r = subprocess.run(
        ["ssh", PC_HOST, f"if (Test-Path '{path}') {{ (Get-Item '{path}').Length }}"],
        capture_output=True, text=True, timeout=20,
    )
    out = r.stdout.strip()
    return out.isdigit() and int(out) > 1_000_000


def get_audio_channels(path):
    r = subprocess.run(
        ["ssh", PC_HOST,
         f"ffprobe -v error -select_streams a:0 -show_entries stream=channels -of default=noprint_wrappers=1:nokey=1 '{path}'"],
        capture_output=True, text=True, timeout=30,
    )
    try:
        return int(r.stdout.strip())
    except:
        return 2


def stereo_fix_pc(path):
    """ffmpeg -c:v copy -c:a aac -ac 2 in place,~30s 一檔"""
    tmp = f"{path}.stereo_tmp.mp4"
    cmd = (
        f"ffmpeg -y -i '{path}' -c:v copy -c:a aac -b:a 128k -ac 2 '{tmp}' "
        f"2>$null; if (Test-Path '{tmp}') {{ Move-Item '{tmp}' '{path}' -Force; 'OK' }} else {{ 'FAIL' }}"
    )
    r = subprocess.run(["ssh", PC_HOST, cmd], capture_output=True, text=True, timeout=600)
    return "OK" in r.stdout


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
    return res["data"]["url"], res["data"]["id"]


def upload_from_pc(remote_path, signed_url):
    cmd = (
        f"curl.exe -s -X PUT -T '{remote_path}' "
        f"-H 'Content-Type: application/octet-stream' '{signed_url}'"
    )
    r = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=10", PC_HOST, cmd],
        capture_output=True, text=True, timeout=1800,
    )
    return r.returncode == 0


def poll_upload(upload_id, timeout=900):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = http_json(f"https://api.mux.com/video/v1/uploads/{upload_id}", headers=mux())
        s = r["data"]["status"]
        if s == "asset_created" and r["data"].get("asset_id"):
            return r["data"]["asset_id"]
        if s == "errored":
            return None
        time.sleep(5)
    return None


def poll_asset(asset_id, timeout=1800):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = http_json(f"https://api.mux.com/video/v1/assets/{asset_id}", headers=mux())
        s = r["data"]["status"]
        if s == "ready":
            pbs = r["data"].get("playback_ids", [])
            dur = r["data"].get("duration", 0)
            if pbs:
                return pbs[0]["id"], int(dur)
        if s == "errored":
            return None
        time.sleep(10)
    return None


def upload_one(remote_path, ticker, variant, chapter_id):
    """variant in {'main', 'bg'} or 'intro'"""
    print(f"  [{ticker} {variant}] check & stereo-fix...", flush=True)
    if not file_exists_on_pc(remote_path):
        print(f"      SKIP (file not exists/too small)")
        return None
    ch = get_audio_channels(remote_path)
    if ch != 2:
        print(f"      mono({ch}ch) → stereo fixing...")
        if not stereo_fix_pc(remote_path):
            print(f"      stereo fix FAIL, skip")
            return None
        print(f"      stereo fix OK")
    print(f"  [{ticker} {variant}] uploading to Mux...", flush=True)
    url, upload_id = create_mux_upload(f"chapter:{chapter_id}:{variant}:{ticker}")
    t0 = time.time()
    if not upload_from_pc(remote_path, url):
        print(f"      upload FAIL")
        return None
    print(f"      uploaded in {int(time.time()-t0)}s, polling asset...")
    asset_id = poll_upload(upload_id)
    if not asset_id:
        print(f"      asset NOT created")
        return None
    info = poll_asset(asset_id)
    if not info:
        print(f"      asset NOT ready")
        return None
    pb_id, dur = info
    print(f"      [{ticker} {variant}] OK playback_id={pb_id} duration={dur}s")
    return pb_id, dur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tickers", nargs="*", help="只跑指定 tickers,留空跑全部")
    ap.add_argument("--main-only", action="store_true")
    ap.add_argument("--bg-only", action="store_true")
    args = ap.parse_args()

    course_id = get_course_id()
    print(f"course_id: {course_id}")

    selected = (args.tickers or [t for _, t in CHAPTER_VIDEOS])
    selected = [t.upper() for t in selected]

    for sort_order, ticker in CHAPTER_VIDEOS:
        if ticker not in selected:
            continue
        ch = get_chapter(course_id, sort_order)
        if not ch:
            print(f"\n[{ticker}] chapter not found, skip")
            continue
        print(f"\n=== [{sort_order}] {ticker} — {ch['title']} ===")

        if not args.bg_only:
            # main
            old = ch.get("mux_playback_id")
            res = upload_one(f"{PC_OUT}/{ticker}_long.mp4", ticker, "main", ch["id"])
            if res:
                pb, dur = res
                update_chapter(ch["id"], {"mux_playback_id": pb, "duration_seconds": dur})
                if old and old != pb:
                    delete_old_asset(old)

        if not args.main_only:
            # bg
            old = ch.get("mux_playback_id_bg")
            res = upload_one(f"{PC_OUT}/{ticker}_bg.mp4", ticker, "bg", ch["id"])
            if res:
                pb, dur = res
                update_chapter(ch["id"], {"mux_playback_id_bg": pb, "duration_seconds_bg": dur})
                if old and old != pb:
                    delete_old_asset(old)

    print("\nDONE")


if __name__ == "__main__":
    main()
