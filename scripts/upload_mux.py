"""
把 8 部 long 影片從剪片 PC 直接上 Mux，拿 playback_id 後更新 course_chapters。

流程：
  1. Mac: Mux API 建 direct upload，拿 signed URL
  2. SSH 到 PC，curl PUT 檔案到 signed URL（PC bandwidth 直連 Mux，不繞 Mac）
  3. Mac: poll Mux assets API 等 asset 變 ready
  4. Mac: PATCH course_chapters.mux_playback_id

Idempotent：
  - 跳過已有 mux_playback_id 的章節（除非 --force）
  - 失敗的章節不影響其他章節

執行：
  cd ~/Desktop/oxford-world
  python3 scripts/upload_mux.py
  # 強制重 upload 全部：
  python3 scripts/upload_mux.py --force
"""
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
MUX_ID = ENV["MUX_TOKEN_ID"]
MUX_SECRET = ENV["MUX_TOKEN_SECRET"]

MUX_AUTH = "Basic " + base64.b64encode(f"{MUX_ID}:{MUX_SECRET}".encode()).decode()
COURSE_SLUG = "master-space-age-capital"
PC_HOST = "jd@100.109.36.77"
PC_OUT_DIR = "C:/Users/JD/oxford-autopilot/out"   # forward slashes for ssh

# (sort_order, ticker) — sort_order 1 是先導 placeholder、10 是組合 outro,8 隻個股放 2-9
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


def supabase_headers():
    return {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}


def mux_headers():
    return {"Authorization": MUX_AUTH}


def get_course_id():
    res = http_json(
        f"{SUPABASE_URL}/rest/v1/courses?slug=eq.{COURSE_SLUG}&select=id",
        headers=supabase_headers(),
    )
    return res[0]["id"] if res else sys.exit(f"course not found: {COURSE_SLUG}")


def get_chapter(course_id, sort_order):
    res = http_json(
        f"{SUPABASE_URL}/rest/v1/course_chapters"
        f"?course_id=eq.{course_id}&sort_order=eq.{sort_order}"
        f"&select=id,mux_playback_id,title",
        headers=supabase_headers(),
    )
    return res[0] if res else None


def update_chapter(chapter_id, fields):
    request.urlopen(request.Request(
        f"{SUPABASE_URL}/rest/v1/course_chapters?id=eq.{chapter_id}",
        method="PATCH",
        headers={**supabase_headers(), "Content-Type": "application/json"},
        data=json.dumps(fields).encode(),
    )).read()


def create_mux_upload(passthrough: str) -> dict:
    """新增 Mux direct upload，回 {url, id}"""
    res = http_json(
        "https://api.mux.com/video/v1/uploads",
        method="POST",
        headers=mux_headers(),
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


def upload_from_pc(remote_path: str, signed_url: str) -> bool:
    """SSH 到 PC，curl PUT 檔案到 Mux signed URL。"""
    # PowerShell curl: 先用 invoke-webrequest（對大檔較穩）或 native curl.exe
    cmd = (
        f"curl.exe -s -X PUT -T '{remote_path}' "
        f"-H 'Content-Type: application/octet-stream' "
        f"'{signed_url}'"
    )
    result = subprocess.run(
        ["ssh", "-o", "ConnectTimeout=10", PC_HOST, cmd],
        capture_output=True, text=True, timeout=1800,
    )
    if result.returncode != 0:
        print(f"    upload err: {result.stderr.strip()[:200]}")
        return False
    return True


def poll_upload(upload_id: str, timeout: int = 900) -> str | None:
    """等 Mux 處理完，回 asset_id"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = http_json(
            f"https://api.mux.com/video/v1/uploads/{upload_id}",
            headers=mux_headers(),
        )
        status = res["data"]["status"]
        asset_id = res["data"].get("asset_id")
        if status == "asset_created" and asset_id:
            return asset_id
        if status == "errored":
            print(f"    upload errored: {res['data'].get('error', {})}")
            return None
        time.sleep(5)
    print("    timeout waiting for asset_created")
    return None


def poll_asset(asset_id: str, timeout: int = 1800) -> dict | None:
    """等 asset 變 ready，回 {playback_id, duration}"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        res = http_json(
            f"https://api.mux.com/video/v1/assets/{asset_id}",
            headers=mux_headers(),
        )
        status = res["data"]["status"]
        if status == "ready":
            playbacks = res["data"].get("playback_ids", [])
            duration = res["data"].get("duration", 0)
            if playbacks:
                return {"playback_id": playbacks[0]["id"], "duration": int(duration)}
        if status == "errored":
            print(f"    asset errored: {res['data'].get('errors', [])}")
            return None
        time.sleep(10)
    print("    timeout waiting for asset ready")
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="即使已有 playback_id 也重 upload")
    args = ap.parse_args()

    course_id = get_course_id()
    print(f"course_id: {course_id}")

    for sort_order, ticker in CHAPTER_VIDEOS:
        ch = get_chapter(course_id, sort_order)
        if not ch:
            print(f"[{sort_order}] {ticker}: chapter not found, SKIP")
            continue
        print(f"\n[{sort_order}] {ticker} — {ch['title']}")

        if ch["mux_playback_id"] and not args.force:
            print(f"    already has playback_id={ch['mux_playback_id']}, SKIP (use --force to redo)")
            continue

        remote_path = f"{PC_OUT_DIR}/{ticker}_long.mp4"
        passthrough = f"chapter:{ch['id']}:ticker:{ticker}"

        print(f"  [a] create Mux upload ...")
        upload = create_mux_upload(passthrough)
        print(f"      upload_id={upload['id']}")

        print(f"  [b] PC curl PUT {remote_path} ...")
        t0 = time.time()
        if not upload_from_pc(remote_path, upload["url"]):
            print(f"    upload FAIL")
            continue
        print(f"      uploaded in {int(time.time() - t0)}s")

        print(f"  [c] poll for asset_created ...")
        asset_id = poll_upload(upload["id"])
        if not asset_id:
            print(f"    asset NOT created"); continue
        print(f"      asset_id={asset_id}")

        print(f"  [d] poll asset → ready ...")
        info = poll_asset(asset_id)
        if not info:
            print(f"    asset NOT ready"); continue
        print(f"      playback_id={info['playback_id']}, duration={info['duration']}s")

        print(f"  [e] update course_chapters ...")
        update_chapter(ch["id"], {
            "mux_playback_id": info["playback_id"],
            "duration_seconds": info["duration"],
        })
        print(f"  [OK] {ticker} done")

    print("\nALL DONE")


if __name__ == "__main__":
    main()
