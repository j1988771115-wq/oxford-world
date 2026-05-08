"""
背景資料學習章節 pipeline v2 — 含剪頭尾 + Claude 校對

跟 v1 (`auto_add_chapter.py`) 差別:
  + 新增「Claude 看頭/尾 segments 判斷實際課程開始/結束」(剪頭尾)
  + 新增「Claude 校對專有詞彙」(套 oxford-autopilot/pipeline.py::correct_transcript_terms 邏輯)
  + 支援「覆蓋既有章節」(刪舊 Mux asset → PATCH chapter)，給 SPIR 重做用

用法 (Mac 上):
  cd ~/Desktop/oxford-world

  # Phase 1: 解 zip + 抽音 + Whisper + Claude 出剪頭尾建議 (不上 Mux)
  python3 scripts/auto_add_chapter_v2.py plan

  # Phase 2: 套用建議 trim + Claude 校對 + 上 Mux + 寫 db (動 prod!)
  python3 scripts/auto_add_chapter_v2.py upload

Plan 階段會把 cut plan 寫到 ~/Desktop/oxford-uploads/{stem}.plan.json,
upload 階段讀回那個 json 用。

每個 chapter 處理結束會 print mux playback_id + supabase chapter row。
"""
import argparse
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
PC_FOLDER_WSL = "/mnt/c/Users/JD/Desktop/久老師 課程"
# 中文路徑透過 Windows OpenSSH SCP 編碼會壞,所以在 PC WSL 把成品搬到純 ASCII stage,SCP 走 stage
PC_STAGE_WSL = "/mnt/c/tmp/oxford-stage"
PC_STAGE_WIN_FWD = "C:/tmp/oxford-stage"
COURSE_SLUG = "master-space-age-capital"
# 重要架構:每個 chapter 有 2 個 slot,mux_playback_id(久老師正片) + mux_playback_id_bg(背景資料學習補充)
# SIDU/SPIR 這類「背景資料學習」型素材寫進 _bg slot, main slot 留空等久老師正片;
# title 跟 takeaway_summary 不要寫「背景資料學習:」,UI 已 hardcode 那 4 字。
# 仿 #1-9 「副標:詳述」全形冒號風格,用 Sonnet 從 transcript 生成。

# 兩個 zip + 預期成品檔名
TARGETS = [
    {
        "zip": "SIDU 05-07-20260508T110345Z-3-001.zip",
        "stage_name": "sidu.mp4",
        "final_mp4": "Sidus_Space_2026年Q1財報深度解析.mp4",
        "mode": "insert",
        "ticker_hint": "SIDU",
    },
    {
        "zip": "ｓｐｉｒ05-08-20260508T110159Z-3-001.zip",
        "stage_name": "spir.mp4",
        "final_mp4": "Spire_Global：正處於十字路口.mp4",
        "mode": "overwrite",
        "overwrite_sort_order": 10,
        "ticker_hint": "SPIR",
    },
]


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
ANTHROPIC_KEY = ENV["ANTHROPIC_API_KEY"]
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


def sb(path, method="GET", body=None):
    code, b = http(f"{SB_URL}/rest/v1/{path}", method,
                   {**SB_AUTH, "Content-Type": "application/json", "Prefer": "return=representation"},
                   body=body)
    if code >= 300:
        raise RuntimeError(f"supabase {method} {path} {code}: {b[:300]}")
    return json.loads(b) if b else None


def mux(method, path, body=None):
    code, b = http(f"https://api.mux.com{path}", method,
                   {"Authorization": MUX_AUTH, "Content-Type": "application/json"},
                   body=body)
    if code >= 300:
        raise RuntimeError(f"mux {method} {path} {code}: {b[:300]}")
    return json.loads(b)


# ---- step: PC unzip ----

def pc_unzip_to_stage():
    """SSH PC,在 WSL 解 zip 把成品 mp4 拷到 ASCII stage 路徑。"""
    targets_json = json.dumps(TARGETS, ensure_ascii=False)
    script = f"""set -e
mkdir -p "{PC_STAGE_WSL}"
python3 - <<'PYEOF'
import json, os, zipfile, shutil
ROOT = {PC_FOLDER_WSL!r}
STAGE = {PC_STAGE_WSL!r}
TARGETS = json.loads({targets_json!r})
for t in TARGETS:
    zpath = os.path.join(ROOT, t['zip'])
    final = t['final_mp4']
    stage_path = os.path.join(STAGE, t['stage_name'])
    if os.path.exists(stage_path):
        print(f"  stage cached: {{stage_path}} ({{os.path.getsize(stage_path)/1024/1024:.1f}}MB)")
        continue
    if not os.path.exists(zpath):
        print(f"  !! missing zip: {{zpath}}")
        continue
    with zipfile.ZipFile(zpath) as zf:
        candidates = [n for n in zf.namelist() if n.endswith(final)]
        if not candidates:
            mp4s = [(n, zf.getinfo(n).file_size) for n in zf.namelist() if n.endswith('.mp4')]
            mp4s.sort(key=lambda x: x[1])
            candidates = [mp4s[0][0]] if mp4s else []
        if not candidates:
            print(f"  !! no mp4 in {{t['zip']}}")
            continue
        member = candidates[0]
        print(f"  extract {{member}} -> {{stage_path}}")
        with zf.open(member) as src, open(stage_path, 'wb') as dst:
            shutil.copyfileobj(src, dst, length=8*1024*1024)
        print(f"     {{os.path.getsize(stage_path)/1024/1024:.1f}}MB OK")
PYEOF
"""
    r = subprocess.run(["ssh", f"{PC_USER}@{PC_HOST}", "bash -s"],
                       input=script, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"pc unzip stderr: {r.stderr[:800]}\nstdout: {r.stdout[:500]}")
    print(r.stdout)


# ---- step: SCP from PC ----

def scp_from_pc(remote_win_path, local_path):
    cmd = ["scp", f"{PC_USER}@{PC_HOST}:{remote_win_path}", str(local_path)]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"scp failed: {r.stderr}")


def scp_to_pc(local_path, remote_win_path):
    cmd = ["scp", str(local_path), f"{PC_USER}@{PC_HOST}:{remote_win_path}"]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"scp to pc failed: {r.stderr}")


# ---- step: ffmpeg ----

def ffmpeg_extract_audio(video_path, audio_path):
    cmd = ["ffmpeg", "-y", "-i", str(video_path), "-ac", "1", "-ar", "16000",
           "-b:a", "64k", str(audio_path)]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg audio: {r.stderr[-500:]}")


def ffmpeg_trim(video_path, out_path, start_s, end_s):
    """精確 trim。re-encode 比 -c copy 慢但秒級準確,不依賴 keyframe。"""
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-ss", f"{start_s:.2f}",
        "-to", f"{end_s:.2f}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(out_path),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=1800)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg trim: {r.stderr[-500:]}")


# ---- step: Whisper ----

WHISPER_PROMPT_JIU = (
    "SpaceX, Starlink, Blue Origin, Palantir, Anduril, Axiom, "
    "Spire Global, Sidus Space, AST SpaceMobile, Iridium, Globalstar, "
    "Rocket Lab, Firefly Aerospace, Planet Labs, Redwire, Intuitive Machines, "
    "低軌衛星, 太空製造, 國防航太, 資本配置, 產業鏈, "
    "NASA, ISS, 月球, 火箭, 衛星通訊, ARR, EBITDA, EPS, ETF, SPAC, "
    "Q1, Q2, Q3, Q4, 財報, 毛利率, 自由現金流"
)


def whisper_verbose(audio_path):
    """OpenAI Whisper API verbose_json (含 segment + word timestamps)。"""
    boundary = "----whisperv2boundary7MA4YWxkTrZu0gW"
    fields = [
        ("model", "whisper-1"),
        ("response_format", "verbose_json"),
        ("language", "zh"),
        ("prompt", WHISPER_PROMPT_JIU),
        ("timestamp_granularities[]", "segment"),
        ("timestamp_granularities[]", "word"),
    ]
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
        timeout=900,
    )
    if code >= 300:
        raise RuntimeError(f"Whisper {code}: {response.decode()[:500]}")
    return json.loads(response)


# ---- step: Claude trim plan ----

def claude_trim_plan(segments, duration_s):
    """請 Claude 看頭尾各 ~30 秒 segments,判斷實際課程的 start_s 跟 end_s。"""
    head_segs = [s for s in segments if s["start"] < 60]
    tail_segs = [s for s in segments if s["end"] > duration_s - 60]
    head_text = "\n".join(f"S{i}  [{s['start']:.1f}-{s['end']:.1f}s] {s['text']}"
                          for i, s in enumerate(head_segs))
    tail_text = "\n".join(f"S{len(segments)-len(tail_segs)+i}  [{s['start']:.1f}-{s['end']:.1f}s] {s['text']}"
                          for i, s in enumerate(tail_segs))

    prompt = f"""你是課程影片頭尾剪接員。這是久方武老師的太空產業課程,需要剪掉:
- 頭:喬麥克風、確認錄影、寒暄、「大家好今天」這類進場閒聊
- 尾:「我們今天就講到這」「謝謝收看下次見」這類收尾客套

**硬規則:**
1. 主題實際開始的那一句必須完整保留(例如「今天我們來聊一家公司」算實際開始)
2. 主題收尾總結最後一句必須完整保留(例如「所以這就是 Spire 目前的狀態」算實際結束)
3. 剪後一定要落在 segment 邊界,不要切到句子中間
4. 寧可少剪,不可多剪。如果頭尾本來就乾淨(< 5 秒廢話),就回傳該段端點

影片總長 {duration_s:.1f} 秒。

頭部 segments (前 60s):
{head_text}

尾部 segments (後 60s):
{tail_text}

請以 JSON 回覆:
{{
  "start_s": <實際課程開始秒數,落在某 segment 的 start 邊界>,
  "end_s": <實際課程結束秒數,落在某 segment 的 end 邊界>,
  "head_cut_reason": "<剪掉哪幾句,為什麼>",
  "tail_cut_reason": "<剪掉哪幾句,為什麼>"
}}

只回 JSON,不要 markdown code fence。"""

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body, method="POST",
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        })
    with request.urlopen(req, timeout=180) as r:
        res = json.loads(r.read())
    text = res["content"][0]["text"].strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(text)


# ---- step: Claude correct ----

def claude_correct_segments(segments):
    """套 oxford-autopilot/pipeline.py::correct_transcript_terms 邏輯,只改明顯錯誤。"""
    if not segments:
        return segments

    # 分批,每批 100 segments(prompt 不超過 4-5k chars)
    BATCH = 100
    fixed = []
    for batch_idx in range(0, len(segments), BATCH):
        batch = segments[batch_idx:batch_idx + BATCH]
        indexed = "\n".join(f"{i}: {s['text']}" for i, s in enumerate(batch))
        prompt = f"""你是語音逐字稿校對員。講師:久方武,主題:太空科技 / AI 資本市場 / 美股太空概念股(SPIR/SIDU/RKLB/IRDM/ASTS/FLY/PLANET/REDWIRE/LUNA/GLOBALSTAR)

以下是 Whisper 辨識的逐字稿,部分專有詞被誤聽成發音相近的中文,或數字/標點不正確。

**常見錯誤模式:**
- 公司名:Spire / Sidus / Rocket Lab / Iridium / Firefly 被音譯成怪中文
- 股票代號:SPIR / SIDU / RKLB / IRDM / ASTS 被聽成中文諧音
- 財報術語:EBITDA / ARR / 毛利率 / 自由現金流 / Q1 Q2 / EPS 寫錯字
- 標點:句尾忘記標點、逗號該斷沒斷

**硬規則:**
1. 只改明顯錯誤,不要重寫、不要加內容、不要改語氣、不要改長度
2. 英文詞**不要插入空格**拆成多個詞,保持連寫或正式寫法(如 "Spire Global" 中間保留一空格)
3. 保留 Whisper 的口語語氣,「然後」「就是」「對不對」這類口語贅詞**保留**
4. 標點只在句意斷點補,不大改

輸入:
{indexed}

輸出:JSON array,每個 element {{"i": <int>, "text": "<修正後>"}}。
若該行無需修正就原字返回。只回 JSON,不要 ```code fence```。"""

        body = json.dumps({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 8000,
            "messages": [{"role": "user", "content": prompt}],
        }).encode()
        req = request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body, method="POST",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            })
        with request.urlopen(req, timeout=180) as r:
            res = json.loads(r.read())
        text = res["content"][0]["text"].strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        try:
            corrections = json.loads(text)
        except Exception as e:
            print(f"  [correct] batch {batch_idx} parse fail ({e}), 保留原文")
            fixed.extend(batch)
            continue

        by_idx = {int(c["i"]): c["text"] for c in corrections if "i" in c and "text" in c}
        n_changed = 0
        for i, s in enumerate(batch):
            new_s = dict(s)
            if i in by_idx and by_idx[i] != s["text"]:
                n_changed += 1
                new_s["text"] = by_idx[i]
            fixed.append(new_s)
        print(f"  [correct] batch {batch_idx}-{batch_idx+len(batch)}: {n_changed}/{len(batch)} 行調整")
    return fixed


# ---- step: SRT build ----

def fmt_ts(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int((t - int(t)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_srt(segments, trim_start, trim_end):
    """從 segments 重建 SRT,只保留落在 [trim_start, trim_end] 內,並把時間軸 offset。"""
    lines = []
    idx = 1
    for s in segments:
        if s["end"] <= trim_start or s["start"] >= trim_end:
            continue
        # clamp
        ss = max(s["start"], trim_start) - trim_start
        ee = min(s["end"], trim_end) - trim_start
        if ee - ss < 0.05:
            continue
        text = s["text"].strip()
        if not text:
            continue
        lines.append(f"{idx}\n{fmt_ts(ss)} --> {fmt_ts(ee)}\n{text}\n")
        idx += 1
    return "\n".join(lines) + "\n"


# ---- step: Supabase / Mux ----

def upload_srt_to_supabase(srt_path, course_slug, chapter_stem):
    safe = re.sub(r"[^a-zA-Z0-9._-]", "-", chapter_stem)[:80]
    storage_path = f"{course_slug}/{safe}.srt"
    url = f"{SB_URL}/storage/v1/object/subtitles/{storage_path}"
    code, b = http(url, "POST",
                   {**SB_AUTH, "Content-Type": "application/x-subrip", "x-upsert": "true"},
                   raw_body=srt_path.read_bytes())
    if code >= 300:
        raise RuntimeError(f"SRT upload {code}: {b.decode()[:300]}")
    return f"{SB_URL}/storage/v1/object/public/subtitles/{storage_path}"


def mux_delete_asset_by_playback(playback_id):
    if not playback_id:
        return
    try:
        meta = mux("GET", f"/video/v1/playback-ids/{playback_id}")
        asset_id = meta["data"]["object"]["id"]
        print(f"    刪除舊 asset {asset_id}...")
        mux("DELETE", f"/video/v1/assets/{asset_id}")
    except Exception as e:
        print(f"    舊 asset 刪除略過: {e}")


def mux_upload_with_subs(video_path, srt_url):
    print("    Mux 建立 upload...")
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

    size_mb = video_path.stat().st_size / 1024 / 1024
    print(f"    PUT 影片 ({size_mb:.1f} MB)...")
    data = video_path.read_bytes()
    req = request.Request(upload_url, data=data, method="PUT",
                          headers={"Content-Type": "video/mp4"})
    with request.urlopen(req, timeout=1800) as r:
        if r.status >= 300:
            raise RuntimeError(f"Mux PUT {r.status}")

    print("    等 asset_id...")
    asset_id = None
    for _ in range(80):
        time.sleep(5)
        u = mux("GET", f"/video/v1/uploads/{upload_id}")
        if u["data"].get("asset_id"):
            asset_id = u["data"]["asset_id"]
            break
    if not asset_id:
        raise RuntimeError("Mux asset_id timeout")

    print(f"    等 asset ready ({asset_id[:12]}...)")
    playback_id, duration = None, None
    for _ in range(120):
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

    print("    加字幕 track...")
    mux("POST", f"/video/v1/assets/{asset_id}/tracks", {
        "url": srt_url,
        "type": "text",
        "text_type": "subtitles",
        "language_code": "zh-TW",
        "name": "繁體中文",
        "closed_captions": False,
    })

    return asset_id, playback_id, int(duration)


# ---- helpers ----

def title_from_filename(fn):
    stem = fn.rsplit(".", 1)[0]
    return f"{CHAPTER_TITLE_PREFIX}{stem.replace('_', ' ')}"


def safe_stem(title):
    return re.sub(r"[^a-zA-Z0-9._-]", "-", title)[:60]


# ---- phase 1: plan ----

def phase_plan():
    print("=== PHASE 1: 解 zip + Whisper + Claude trim plan ===\n")
    print("[A] PC 解 zip → ASCII stage")
    pc_unzip_to_stage()

    for t in TARGETS:
        title = title_from_filename(t["final_mp4"])
        stem = safe_stem(title)
        print(f"\n--- {title} ---")
        remote_stage = f"{PC_STAGE_WIN_FWD}/{t['stage_name']}"
        local_video = WORKDIR / f"{stem}.mp4"
        local_audio = WORKDIR / f"{stem}.mp3"
        local_transcript = WORKDIR / f"{stem}.transcript.json"
        local_plan = WORKDIR / f"{stem}.plan.json"

        if not local_video.exists():
            print(f"  SCP {remote_stage} ...")
            scp_from_pc(remote_stage, local_video)
        else:
            print(f"  影片已 cached: {local_video}")

        if not local_audio.exists():
            print("  ffmpeg 抽音...")
            ffmpeg_extract_audio(local_video, local_audio)

        if not local_transcript.exists():
            print("  Whisper verbose_json...")
            tr = whisper_verbose(local_audio)
            local_transcript.write_text(json.dumps(tr, ensure_ascii=False, indent=2))
        else:
            tr = json.loads(local_transcript.read_text())
            print(f"  transcript cached: {len(tr.get('segments') or [])} segs")

        duration = float(tr.get("duration") or 0)
        if not duration:
            duration = max(s["end"] for s in tr["segments"])
        segs = tr["segments"]

        print(f"  Claude 出 trim plan (總長 {duration:.1f}s)...")
        plan = claude_trim_plan(segs, duration)
        plan["original_duration_s"] = duration
        plan["target"] = t
        plan["transcript_path"] = str(local_transcript)
        plan["video_path"] = str(local_video)
        local_plan.write_text(json.dumps(plan, ensure_ascii=False, indent=2))

        print(f"  cut: {plan['start_s']:.1f}s ~ {plan['end_s']:.1f}s "
              f"(原 0~{duration:.1f}s, 剪掉頭 {plan['start_s']:.1f}s + 尾 {duration-plan['end_s']:.1f}s)")
        print(f"  head_cut_reason: {plan.get('head_cut_reason')}")
        print(f"  tail_cut_reason: {plan.get('tail_cut_reason')}")
        print(f"  → {local_plan}")

    print("\n=== PHASE 1 完成。檢視 plan,OK 後跑: python3 scripts/auto_add_chapter_v2.py upload ===")


# ---- phase 2: upload ----

def phase_upload():
    print("=== PHASE 2: 套 trim + Claude 校對 + 上 Mux + 寫 db ===\n")

    course = sb(f"courses?slug=eq.{COURSE_SLUG}&select=id")
    if not course:
        sys.exit(f"course not found: {COURSE_SLUG}")
    course_id = course[0]["id"]

    for t in TARGETS:
        title = title_from_filename(t["final_mp4"])
        stem = safe_stem(title)
        print(f"\n--- {title} ---")

        local_plan_path = WORKDIR / f"{stem}.plan.json"
        if not local_plan_path.exists():
            print(f"  ! plan json 不存在: {local_plan_path} — 先跑 plan phase。SKIP")
            continue
        plan = json.loads(local_plan_path.read_text())
        tr = json.loads(Path(plan["transcript_path"]).read_text())
        local_video = Path(plan["video_path"])
        trim_start = plan["start_s"]
        trim_end = plan["end_s"]

        # 1. ffmpeg trim
        local_trimmed = WORKDIR / f"{stem}.trimmed.mp4"
        if not local_trimmed.exists():
            print(f"  ffmpeg trim {trim_start:.1f}~{trim_end:.1f}s...")
            ffmpeg_trim(local_video, local_trimmed, trim_start, trim_end)
        else:
            print(f"  trimmed 影片 cached: {local_trimmed}")
        trimmed_duration_s = trim_end - trim_start

        # 2. Claude 校對
        print(f"  Claude 校對 segments ({len(tr['segments'])} 條)...")
        corrected = claude_correct_segments(tr["segments"])

        # 3. SRT
        local_srt = WORKDIR / f"{stem}.srt"
        local_srt.write_text(build_srt(corrected, trim_start, trim_end), encoding="utf-8")
        n_lines = sum(1 for _ in local_srt.read_text().splitlines() if _.strip())
        print(f"  SRT: {n_lines} 行 ({local_srt.stat().st_size / 1024:.1f} KB)")

        # 4. SRT 上 Supabase
        print("  SRT → Supabase storage...")
        srt_url = upload_srt_to_supabase(local_srt, COURSE_SLUG, stem)

        # 5. SPIR overwrite: 先刪舊 mux asset
        if t["mode"] == "overwrite":
            existing = sb(f"course_chapters?course_id=eq.{course_id}"
                          f"&sort_order=eq.{t['overwrite_sort_order']}"
                          f"&select=id,mux_playback_id,title")
            if not existing:
                print(f"  ! sort_order={t['overwrite_sort_order']} 章節不存在,改 INSERT")
                t["mode"] = "insert"
            else:
                ch = existing[0]
                print(f"  覆蓋 #{t['overwrite_sort_order']} {ch['title']}")
                mux_delete_asset_by_playback(ch["mux_playback_id"])

        # 6. Mux upload + 字幕
        print("  Mux upload + 字幕 track...")
        asset_id, playback_id, duration = mux_upload_with_subs(local_trimmed, srt_url)
        print(f"     duration={duration}s playback={playback_id}")

        # 7. PATCH or INSERT
        # SIDU/SPIR 這類「背景資料學習」型素材 → 寫進 _bg slot, main slot 暫空
        # title 不再帶「背景資料學習:」prefix,需要外面先 Claude 生成大標題再 PATCH
        # (這個 script 上完 db row 後,需要再跑 generate_title.py 補 title + takeaway,參考 5/8 晚間踩雷)
        bg_payload = {
            "mux_playback_id_bg": playback_id,
            "duration_seconds_bg": duration,
        }
        if t["mode"] == "overwrite":
            ch = existing[0]
            sb(f"course_chapters?id=eq.{ch['id']}", "PATCH", {
                **bg_payload,
                # 不動 title — 由人工 / generate_title.py 後補
            })
            print(f"  PATCH chapter {ch['id']} (#{t['overwrite_sort_order']}) bg={playback_id[:14]}")
        else:
            existing_orders = sb(f"course_chapters?course_id=eq.{course_id}"
                                 f"&select=sort_order&order=sort_order.desc&limit=1")
            next_order = (existing_orders[0]["sort_order"] if existing_orders else 0) + 1
            row = sb("course_chapters", "POST", {
                "course_id": course_id,
                "title": f"待生成大標題（{t.get('ticker_hint', '?')}）",  # placeholder,跑 generate_title.py 補
                "sort_order": next_order,
                **bg_payload,
                "is_free_preview": False,
            })
            print(f"  INSERT chapter #{next_order} {row[0]['id']} bg={playback_id[:14]}")
            print(f"  ! title 是 placeholder,記得跑 generate_title.py 補大標題 + takeaway")

        # 8. SCP trimmed 回 PC stage(備份用,best-effort)
        try:
            stage_back = f"{PC_STAGE_WIN_FWD}/{t['stage_name'].replace('.mp4', '_trimmed.mp4')}"
            print(f"  SCP trimmed → PC stage 備份...")
            scp_to_pc(local_trimmed, stage_back)
            print(f"     → {stage_back}")
        except Exception as e:
            print(f"     SCP 備份失敗(不擋): {e}")

    print("\n=== PHASE 2 完成 ===")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("phase", choices=["plan", "upload"])
    args = ap.parse_args()
    if args.phase == "plan":
        phase_plan()
    else:
        phase_upload()


if __name__ == "__main__":
    main()
