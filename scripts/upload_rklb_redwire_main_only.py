"""一次性救援:RKLB + REDWIRE main 跳過 stereo-fix(本地檔已從 backup 還原為 mono),
直接上傳 Mux → 寫 DB → 刪舊 errored asset。
"""
import os, sys, time, json, base64, subprocess, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
ENV = os.path.join(os.path.dirname(ROOT), ".env.local")

def env(k):
    with open(ENV) as f:
        for line in f:
            if line.startswith(f"{k}="):
                return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit(f"missing {k}")

MUX_ID = env("MUX_TOKEN_ID")
MUX_SEC = env("MUX_TOKEN_SECRET")
SUPA = env("NEXT_PUBLIC_SUPABASE_URL")
KEY = env("SUPABASE_SERVICE_ROLE_KEY")

PC_HOST = "jd@100.109.36.77"

def mux_headers():
    return {
        "Authorization": "Basic " + base64.b64encode(f"{MUX_ID}:{MUX_SEC}".encode()).decode(),
        "Content-Type": "application/json",
    }

def http(url, method="GET", headers=None, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    return json.loads(urllib.request.urlopen(req).read())

def create_upload(passthrough):
    res = http(
        "https://api.mux.com/video/v1/uploads",
        method="POST", headers=mux_headers(),
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
    cmd = f"curl.exe -s -X PUT -T '{remote_path}' -H 'Content-Type: application/octet-stream' '{signed_url}'"
    r = subprocess.run(["ssh", "-o", "ConnectTimeout=10", PC_HOST, cmd],
                       capture_output=True, text=True, timeout=1800)
    return r.returncode == 0

def poll_upload(uid, timeout=900):
    end = time.time() + timeout
    while time.time() < end:
        d = http(f"https://api.mux.com/video/v1/uploads/{uid}", headers=mux_headers())["data"]
        if d["status"] == "asset_created" and d.get("asset_id"):
            return d["asset_id"]
        if d["status"] == "errored":
            return None
        time.sleep(5)
    return None

def poll_asset(aid, timeout=2700):
    end = time.time() + timeout
    while time.time() < end:
        d = http(f"https://api.mux.com/video/v1/assets/{aid}", headers=mux_headers())["data"]
        if d["status"] == "ready":
            pbs = d.get("playback_ids", [])
            if pbs:
                return pbs[0]["id"], int(d.get("duration", 0))
        if d["status"] == "errored":
            return None
        time.sleep(15)
    return None

def db_get_old_asset(chapter_id):
    res = http(
        f"{SUPA}/rest/v1/course_chapters?id=eq.{chapter_id}&select=mux_playback_id",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    if not res:
        return None
    return res[0].get("mux_playback_id")

def db_write(chapter_id, playback_id, duration):
    body = json.dumps({"mux_playback_id": playback_id, "duration_seconds": duration}).encode()
    req = urllib.request.Request(
        f"{SUPA}/rest/v1/course_chapters?id=eq.{chapter_id}",
        data=body, method="PATCH",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"},
    )
    urllib.request.urlopen(req).read()

def list_assets_by_playback(pid):
    """find asset id by playback id (best effort)"""
    d = http(f"https://api.mux.com/video/v1/assets?limit=50", headers=mux_headers())
    for a in d.get("data", []):
        for p in a.get("playback_ids", []):
            if p["id"] == pid:
                return a["id"]
    return None

def del_asset(aid):
    req = urllib.request.Request(
        f"https://api.mux.com/video/v1/assets/{aid}",
        method="DELETE", headers=mux_headers(),
    )
    try:
        urllib.request.urlopen(req).read()
        return True
    except Exception as e:
        print(f"  del fail: {e}")
        return False

import sys as _sys
JOBS_ALL = [
    ("RKLB",    "59857619-a32e-4c16-8896-432feff745de", "C:/Users/JD/oxford-autopilot/out/RKLB_long.mp4"),
    ("REDWIRE", "ce431430-b2ca-477f-91f7-2148710b96c9", "C:/Users/JD/oxford-autopilot/out/REDWIRE_long.mp4"),
]
# 命令列指定 ticker 過濾,例如 --tickers REDWIRE
filter_tickers = []
for i, a in enumerate(_sys.argv):
    if a == "--tickers" and i + 1 < len(_sys.argv):
        filter_tickers = _sys.argv[i + 1].split(",")
JOBS = [j for j in JOBS_ALL if not filter_tickers or j[0] in filter_tickers]

for ticker, chap, remote in JOBS:
    print(f"\n=== {ticker} main ===")
    old_pid = db_get_old_asset(chap)
    print(f"  current DB playback_id: {old_pid}")

    print("  creating Mux upload...")
    url, uid = create_upload(f"chapter:{chap}:main:{ticker}")
    print(f"  upload_id={uid}")

    print("  uploading from PC (may take 1-3 min)...")
    t0 = time.time()
    if not upload_from_pc(remote, url):
        print("  ❌ PUT failed")
        continue
    print(f"  uploaded in {int(time.time()-t0)}s")

    print("  polling upload → asset_created...")
    aid = poll_upload(uid)
    if not aid:
        print("  ❌ upload errored")
        continue
    print(f"  asset_id={aid}")

    print("  polling asset → ready (up to 45min)...")
    res = poll_asset(aid)
    if not res:
        print("  ❌ asset errored or timeout")
        continue
    pid, dur = res
    print(f"  ✅ playback_id={pid} duration={dur}s")

    db_write(chap, pid, dur)
    print(f"  ✅ DB updated")

    # try to delete the old errored asset (best effort)
    if old_pid:
        old_asset = list_assets_by_playback(old_pid)
        if old_asset:
            del_asset(old_asset)
            print(f"  cleaned old asset {old_asset[:20]}")

print("\nDONE")
