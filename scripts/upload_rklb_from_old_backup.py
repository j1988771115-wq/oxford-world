"""RKLB main 救援 v2:本地當前檔 H264 NAL 損毀,但 backup_20260501_235901 的 RKLB(69MB)能解碼。
拷過來 → 上 Mux → 寫 DB(skip stereo-fix 避免再壞)。
REDWIRE 沒可用 backup,跳過(由 manual hide DB 處理)。
"""
import os, sys, time, json, base64, subprocess, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
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

def db_write(chapter_id, playback_id, duration):
    body = json.dumps({"mux_playback_id": playback_id, "duration_seconds": duration}).encode()
    req = urllib.request.Request(
        f"{SUPA}/rest/v1/course_chapters?id=eq.{chapter_id}",
        data=body, method="PATCH",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json", "Prefer": "return=minimal"},
    )
    urllib.request.urlopen(req).read()

# 先 copy backup 到 out/
print("=== 復原 RKLB 從 backup_20260501_235901 → out/ ===")
copy_cmd = ("Copy-Item 'C:/Users/JD/oxford-autopilot/out_backup_20260501_235901/RKLB_long.mp4' "
            "'C:/Users/JD/oxford-autopilot/out/RKLB_long.mp4' -Force")
r = subprocess.run(["ssh", PC_HOST, "powershell", "-NoProfile", "-Command", copy_cmd],
                   capture_output=True, text=True, timeout=120)
print(f"  copy stderr: {r.stderr[:200] if r.stderr else 'OK'}")

ticker = "RKLB"
chap = "59857619-a32e-4c16-8896-432feff745de"
remote = "C:/Users/JD/oxford-autopilot/out/RKLB_long.mp4"

print(f"\n=== {ticker} main 上傳 ===")
print("  creating Mux upload...")
url, uid = create_upload(f"chapter:{chap}:main:{ticker}-good")
print(f"  upload_id={uid}")

print("  uploading from PC...")
t0 = time.time()
if not upload_from_pc(remote, url):
    print("  ❌ PUT failed")
    sys.exit(1)
print(f"  uploaded in {int(time.time()-t0)}s")

print("  polling upload → asset_created...")
aid = poll_upload(uid)
if not aid:
    print("  ❌ upload errored")
    sys.exit(1)
print(f"  asset_id={aid}")

print("  polling asset → ready (up to 45min)...")
res = poll_asset(aid)
if not res:
    print("  ❌ asset errored")
    sys.exit(1)
pid, dur = res
print(f"  ✅ playback_id={pid} duration={dur}s")

db_write(chap, pid, dur)
print(f"  ✅ DB updated")
print("\nDONE")
