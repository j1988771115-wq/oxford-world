"""
新影片自動上線 pipeline:剪片 PC 久老師資料夾 → Mux + 字幕 + db

用法(Mac 上):
  cd ~/Desktop/oxford-world
  python3 scripts/auto_add_chapter.py

掃 PC 「久老師 課程」**根目錄**的 mp4(子資料夾跳過,因為既有 ticker 批次已上)
沒在 db 裡的就跑這套:
  1. SCP 影片到 Mac (~/Desktop/oxford-uploads)
  2. ffmpeg 抽音
  3. OpenAI Whisper API 轉繁體 SRT
  4. Supabase storage 上傳 SRT (public)
  5. Mux 上傳影片 + 加字幕 track
  6. INSERT course_chapters,title 加 「背景資料學習:」 prefix
     (根目錄 = 背景資料學習,獨立於 1-9 章久老師正片)
  7. (PC 上) ffmpeg + NVENC 燒硬字幕版到同資料夾,用 _有字幕.mp4 後綴

Idempotent:title 已存在 db 就跳過(用 mp4 檔名 stem 對比 chapter title)

未來新「久老師正片」要上時:
  - 改放在 PC `久老師 課程/正片/` 子資料夾(暫無)
  - 或手動跑 scripts/upload_mux.py(既有腳本)
"""

CHAPTER_TITLE_PREFIX = "背景資料學習："  # 全形冒號,跟既有 chapter #10 db row 一致
import base64
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib import request, error

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env.local"
WORKDIR = Path.home() / "Desktop/oxford-uploads"
WORKDIR.mkdir(exist_ok=True)

PC_HOST = "192.168.1.167"
PC_USER = "jd"
PC_FOLDER = r"C:\Users\JD\Desktop\久老師 課程"
COURSE_SLUG = "master-space-age-capital"


def load_env():
    env = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
SB_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SR_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_KEY = ENV["OPENAI_API_KEY"]
MUX_AUTH = "Basic " + base64.b64encode(f"{ENV['MUX_TOKEN_ID']}:{ENV['MUX_TOKEN_SECRET']}".encode()).decode()
SB_AUTH = {"apikey": SR_KEY, "Authorization": f"Bearer {SR_KEY}"}


def http(url, method="GET", headers=None, body=None, raw_body=None, timeout=300):
    h = dict(headers or {})
    data = raw_body if raw_body is not None else (json.dumps(body).encode() if body is not None else None)
    req = request.Request(url, data=data, method=method, headers=h)
    try:
        with request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except error.HTTPError as e:
        return e.code, e.read()


def sb_select(table, query):
    code, b = http(f"{SB_URL}/rest/v1/{table}?{query}", headers=SB_AUTH)
    return json.loads(b) if code < 300 else []


def sb_insert(table, row):
    code, b = http(f"{SB_URL}/rest/v1/{table}", "POST", {**SB_AUTH, "Content-Type": "application/json", "Prefer": "return=representation"}, body=row)
    return code, json.loads(b) if b else None


MAX_VIDEO_MB = 200  # 上限,避免不小心吃到 1GB+ 的 master compilation


PS_LIST_SCRIPT = '''[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$folder = "C:\\Users\\JD\\Desktop\\久老師 課程"
Get-ChildItem -LiteralPath $folder -File -Filter *.mp4 |
  Where-Object { $_.Name -notmatch "_有字幕" } |
  ForEach-Object { "{0}|{1}" -f $_.FullName, $_.Length }
'''


def list_pc_videos():
    """List top-level mp4s in PC folder. Skip _有字幕 outputs and files > MAX_VIDEO_MB."""
    # 走 SCP-PS file pattern,避開 SSH 多層 escape
    local_ps = WORKDIR / "_list_videos.ps1"
    bom_bytes = b"\xef\xbb\xbf"
    local_ps.write_bytes(bom_bytes + PS_LIST_SCRIPT.encode("utf-8"))
    subprocess.run(["scp", str(local_ps), f"{PC_USER}@{PC_HOST}:C:/tmp/list_videos.ps1"], check=True, capture_output=True, timeout=30)
    r = subprocess.run(
        ["ssh", f"{PC_USER}@{PC_HOST}", "powershell -ExecutionPolicy Bypass -File C:\\tmp\\list_videos.ps1"],
        capture_output=True, text=True, errors="replace", timeout=30,
    )
    out = []
    for l in r.stdout.splitlines():
        if "|" not in l:
            continue
        path, size = l.strip().split("|", 1)
        if not path.endswith(".mp4"):
            continue
        try:
            size_mb = int(size) / 1024 / 1024
        except ValueError:
            continue
        if size_mb > MAX_VIDEO_MB:
            print(f"  ⏭️  跳過(>{MAX_VIDEO_MB}MB): {path.split(chr(92))[-1]} ({size_mb:.0f}MB)")
            continue
        out.append(path)
    return out


def video_title_from_filename(filepath):
    """Get title from PC path with 背景資料學習 prefix.
    e.g. 'Spire_Global：正處於十字路口.mp4' -> '背景資料學習：Spire Global：正處於十字路口'
    """
    name = filepath.split("\\")[-1]
    stem = name.rsplit(".", 1)[0]
    body = stem.replace("_", " ")
    return f"{CHAPTER_TITLE_PREFIX}{body}"


def chapter_title_for_match(filepath):
    """For idempotent check — strip prefix"""
    full = video_title_from_filename(filepath)
    return full[len(CHAPTER_TITLE_PREFIX):] if full.startswith(CHAPTER_TITLE_PREFIX) else full


def chapter_exists(course_id, title_stem):
    """Check if any chapter in course matches this title stem(只比 stem,prefix 不算)"""
    rows = sb_select("course_chapters", f"course_id=eq.{course_id}&select=title")
    for r in rows:
        existing = r["title"]
        # 既有正片 1-9 不會包含 stem,新背景資料含 prefix
        if title_stem in existing or existing in title_stem:
            return True
    return False


def scp_from_pc(remote_path, local_path):
    cmd = ["scp", f"{PC_USER}@{PC_HOST}:{remote_path}", str(local_path)]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"scp failed: {r.stderr}")


def ffmpeg_extract_audio(video_path, audio_path):
    cmd = ["ffmpeg", "-y", "-i", str(video_path), "-ac", "1", "-ar", "16000", "-b:a", "64k", str(audio_path)]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=300)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg extract: {r.stderr[-500:]}")


def whisper_transcribe(audio_path, srt_path):
    """OpenAI Whisper API transcribe → SRT 繁中"""
    boundary = "----whisperboundary7MA4YWxkTrZu0gW"
    fields = [("model", "whisper-1"), ("response_format", "srt"), ("language", "zh")]
    body = b""
    for k, v in fields:
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"audio.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode()
    body += audio_path.read_bytes()
    body += f"\r\n--{boundary}--\r\n".encode()

    code, response = http(
        "https://api.openai.com/v1/audio/transcriptions",
        "POST",
        {
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        raw_body=body,
        timeout=600,
    )
    if code >= 300:
        raise RuntimeError(f"Whisper API {code}: {response.decode()[:500]}")
    srt_path.write_bytes(response)


def upload_srt_to_supabase(srt_path, course_slug, chapter_stem):
    """Upload SRT to public bucket, return public URL"""
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "-", chapter_stem)[:80]
    storage_path = f"{course_slug}/{safe_name}.srt"
    url = f"{SB_URL}/storage/v1/object/subtitles/{storage_path}"
    code, b = http(url, "POST", {**SB_AUTH, "Content-Type": "application/x-subrip", "x-upsert": "true"}, raw_body=srt_path.read_bytes())
    if code >= 300:
        raise RuntimeError(f"SRT upload {code}: {b.decode()[:300]}")
    return f"{SB_URL}/storage/v1/object/public/subtitles/{storage_path}"


def mux(method, path, body=None):
    code, b = http(f"https://api.mux.com{path}", method, {"Authorization": MUX_AUTH, "Content-Type": "application/json"}, body=body)
    if code >= 300:
        raise RuntimeError(f"Mux {method} {path} {code}: {b.decode()[:300]}")
    return json.loads(b)


def upload_to_mux_with_subs(video_path, srt_url):
    """Mux direct upload + subtitle track. Returns (asset_id, playback_id, duration)"""
    print("  → Mux 建立 upload...")
    upload = mux("POST", "/video/v1/uploads", {
        "cors_origin": "https://oxford-vision.com",
        "new_asset_settings": {
            "playback_policy": ["signed"],
            "video_quality": "plus",
            "max_resolution_tier": "1080p",
        },
    })
    upload_id = upload["data"]["id"]
    upload_url = upload["data"]["url"]

    print(f"  → PUT 影片到 Mux ({video_path.stat().st_size / 1024 / 1024:.1f} MB)...")
    data = video_path.read_bytes()
    req = request.Request(upload_url, data=data, method="PUT", headers={"Content-Type": "video/mp4"})
    with request.urlopen(req, timeout=900) as r:
        if r.status >= 300:
            raise RuntimeError(f"Mux PUT {r.status}")

    print("  → 等 asset_id...")
    asset_id = None
    for _ in range(60):
        time.sleep(5)
        u = mux("GET", f"/video/v1/uploads/{upload_id}")
        if u["data"].get("asset_id"):
            asset_id = u["data"]["asset_id"]
            break
    if not asset_id:
        raise RuntimeError("Mux asset_id timeout")

    print(f"  → 等 asset ready: {asset_id[:12]}...")
    playback_id, duration = None, None
    for _ in range(60):
        a = mux("GET", f"/video/v1/assets/{asset_id}")
        st = a["data"]["status"]
        if st == "ready":
            playback_id = a["data"]["playback_ids"][0]["id"]
            duration = a["data"]["duration"]
            break
        if st == "errored":
            raise RuntimeError(f"Mux asset errored: {a['data'].get('errors')}")
        time.sleep(5)
    if not playback_id:
        raise RuntimeError("Mux asset ready timeout")

    print("  → 加字幕 track...")
    mux("POST", f"/video/v1/assets/{asset_id}/tracks", {
        "url": srt_url,
        "type": "text",
        "text_type": "subtitles",
        "language_code": "zh-TW",
        "name": "繁體中文",
        "closed_captions": False,
    })

    return asset_id, playback_id, int(duration)


def burn_hardsub_on_pc(video_remote_path, srt_path):
    """SCP SRT 到 PC,呼叫 ffmpeg + NVENC 燒硬字幕版,輸出到同資料夾"""
    print("  → SCP SRT 到 PC...")
    pc_srt_path = "C:/tmp/" + srt_path.name
    subprocess.run(["scp", str(srt_path), f"{PC_USER}@{PC_HOST}:{pc_srt_path}"], check=True, capture_output=True, timeout=60)

    output_path = video_remote_path.replace(".mp4", "_有字幕.mp4")
    print(f"  → 在 PC 上 ffmpeg + NVENC 燒硬字幕(背景)...")

    srt_for_filter = pc_srt_path.replace("\\", "/").replace(":", r"\:")
    filter_str = f"subtitles='{srt_for_filter}':force_style='Fontname=Microsoft JhengHei,FontSize=22,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Shadow=0,Alignment=2,MarginV=40'"

    ps_cmd = (
        f'$ff = "C:\\Users\\JD\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe"; '
        f'& $ff -y -hwaccel cuda -i "{video_remote_path}" -vf "{filter_str}" '
        f'-c:v h264_nvenc -preset p5 -cq 23 -b:v 0 -c:a copy "{output_path}" 2>&1 | Out-Null; '
        f'if (Test-Path "{output_path}") {{ Write-Output "DONE" }} else {{ Write-Output "FAIL" }}'
    )
    r = subprocess.run(["ssh", f"{PC_USER}@{PC_HOST}", f"powershell -Command \"{ps_cmd}\""], capture_output=True, text=True, errors="replace", timeout=600)
    if "DONE" in r.stdout:
        print(f"  → 硬字幕版 ✅: {output_path}")
        return output_path
    else:
        print(f"  → 硬字幕版 ⚠️ 跳過(不影響上線): {r.stderr[:200]}")
        return None


def process_video(remote_path, course_id, course_slug):
    title_stem = video_title_from_filename(remote_path)
    print(f"\n=== {title_stem} ===")

    if chapter_exists(course_id, title_stem):
        print("  ⏭️  db 已有,跳過")
        return None

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "-", title_stem)[:60]
    local_video = WORKDIR / f"{safe_name}.mp4"
    local_audio = WORKDIR / f"{safe_name}.mp3"
    local_srt = WORKDIR / f"{safe_name}.srt"

    print(f"  → SCP {remote_path.split(chr(92))[-1]} ...")
    scp_from_pc(remote_path, local_video)

    print("  → ffmpeg 抽音...")
    ffmpeg_extract_audio(local_video, local_audio)

    print("  → Whisper API 轉繁中 SRT...")
    whisper_transcribe(local_audio, local_srt)
    n_lines = sum(1 for l in local_srt.read_text().splitlines() if l.strip())
    print(f"     {n_lines} 行 ({local_srt.stat().st_size / 1024:.1f} KB)")

    print("  → SRT 上 Supabase storage...")
    srt_url = upload_srt_to_supabase(local_srt, course_slug, safe_name)

    print(f"  → Mux upload + 字幕 track...")
    asset_id, playback_id, duration = upload_to_mux_with_subs(local_video, srt_url)
    print(f"     duration={duration}s playback={playback_id[:12]}")

    print("  → INSERT course_chapters...")
    existing_orders = sb_select("course_chapters", f"course_id=eq.{course_id}&select=sort_order&order=sort_order.desc&limit=1")
    next_order = (existing_orders[0]["sort_order"] if existing_orders else 0) + 1
    code, row = sb_insert("course_chapters", {
        "course_id": course_id,
        "title": title_stem,
        "sort_order": next_order,
        "mux_playback_id": playback_id,
        "duration_seconds": duration,
        "is_free_preview": False,
    })
    if code >= 300:
        raise RuntimeError(f"db insert {code}: {row}")
    print(f"     #{next_order} {row[0]['id']}")

    burn_hardsub_on_pc(remote_path, local_srt)

    return {
        "title": title_stem,
        "sort_order": next_order,
        "asset_id": asset_id,
        "playback_id": playback_id,
        "duration_seconds": duration,
        "chapter_id": row[0]["id"],
    }


def main():
    print(f"=== 自動章節上線 pipeline (course={COURSE_SLUG}) ===")
    courses = sb_select("courses", f"slug=eq.{COURSE_SLUG}&select=id")
    if not courses:
        print(f"❌ course not found: {COURSE_SLUG}")
        sys.exit(1)
    course_id = courses[0]["id"]

    print(f"→ 掃 PC: {PC_FOLDER}")
    videos = list_pc_videos()
    print(f"→ 找到 {len(videos)} 個 mp4(已排除 _有字幕 版)")

    results = []
    for v in videos:
        try:
            r = process_video(v, course_id, COURSE_SLUG)
            if r:
                results.append(r)
        except Exception as e:
            print(f"  ❌ FAIL: {e}")

    print(f"\n=== 完成: {len(results)} 個新章節上線 ===")
    if results:
        for r in results:
            print(f"  #{r['sort_order']}  {r['title']}  ({r['duration_seconds']}s)")


if __name__ == "__main__":
    main()
