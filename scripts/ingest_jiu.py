"""
把久老師 8 部太空課 long 版灌進牛津視界 course_content 表（pgvector）。

來源：~/Desktop/oxford-autopilot/notes/ch{NN}_{TICKER}.md
目標：courses.slug = 'master-space-age-capital'
切 chunk + embed + 寫進 course_content（含 course_id + chapter_id）。

Idempotent：先 DELETE 既有 course_content where course_id = 此課程，再重新插入。

執行：
  cd ~/Desktop/oxford-world
  python3 scripts/ingest_jiu.py
"""
import json
import os
import re
import sys
from pathlib import Path
from urllib import request

import yaml  # pip install pyyaml；若無，下 fallback

ENV_FILE = Path(__file__).resolve().parent.parent / ".env.local"


def load_env():
    env = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


ENV = load_env()
SUPABASE_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_KEY = ENV["OPENAI_API_KEY"]

NOTES_DIR = Path.home() / "Desktop/oxford-autopilot/notes"
COURSE_SLUG = "master-space-age-capital"


def http_json(url: str, method: str = "GET", headers: dict = None, body: dict = None):
    headers = dict(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers.setdefault("Content-Type", "application/json")
    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def supabase_headers():
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    }


def parse_md(path: Path) -> tuple[dict, str]:
    """切出 YAML frontmatter + body。"""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    fm_text = parts[1].strip()
    body = parts[2].lstrip("\n")
    try:
        fm = yaml.safe_load(fm_text)
    except Exception:
        # naive fallback
        fm = {}
        for line in fm_text.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip().strip('"')
    return fm or {}, body


def chunk_text(text: str, max_chars: int = 1500, overlap_chars: int = 300) -> list[str]:
    """同 oxford-world/src/lib/embeddings.ts 的 chunkText，段落優先 → 句子 fallback。"""
    cleaned = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(cleaned) <= max_chars:
        return [cleaned]

    paragraphs = re.split(r"\n\n+", cleaned)
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 > max_chars and current:
            chunks.append(current.strip())
            current = current[-overlap_chars:] + "\n\n" + para
        else:
            current += ("\n\n" if current else "") + para
    if current.strip():
        chunks.append(current.strip())

    if len(chunks) == 1 and len(cleaned) > max_chars:
        sentences = re.split(r"(?<=[。！？.!?])\s*", cleaned)
        sentence_chunks = []
        buf = ""
        for s in sentences:
            if len(buf) + len(s) > max_chars and buf:
                sentence_chunks.append(buf.strip())
                buf = buf[-overlap_chars:] + s
            else:
                buf += s
        if buf.strip():
            sentence_chunks.append(buf.strip())
        return sentence_chunks
    return chunks


def embed_batch(texts: list[str]) -> list[list[float]]:
    """OpenAI batch embedding（一次最多 2048 inputs）。"""
    res = http_json(
        "https://api.openai.com/v1/embeddings",
        method="POST",
        headers={"Authorization": f"Bearer {OPENAI_KEY}"},
        body={"model": "text-embedding-3-small", "input": texts},
    )
    return [d["embedding"] for d in res["data"]]


def get_course_id(slug: str) -> str:
    res = http_json(
        f"{SUPABASE_URL}/rest/v1/courses?slug=eq.{slug}&select=id",
        headers=supabase_headers(),
    )
    if not res:
        sys.exit(f"course not found: {slug}")
    return res[0]["id"]


def get_chapter_map(course_id: str) -> dict[int, str]:
    """sort_order → chapter_id"""
    res = http_json(
        f"{SUPABASE_URL}/rest/v1/course_chapters?course_id=eq.{course_id}&select=id,sort_order&order=sort_order.asc",
        headers=supabase_headers(),
    )
    return {c["sort_order"]: c["id"] for c in res}


def delete_existing(course_id: str):
    """清掉這門課的舊 course_content（idempotent）。"""
    request.urlopen(request.Request(
        f"{SUPABASE_URL}/rest/v1/course_content?course_id=eq.{course_id}",
        method="DELETE",
        headers=supabase_headers(),
    )).read()


def insert_rows(rows: list[dict]):
    """批次插入 course_content（200 一批）。"""
    BATCH = 100
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        request.urlopen(request.Request(
            f"{SUPABASE_URL}/rest/v1/course_content",
            method="POST",
            headers={**supabase_headers(), "Content-Type": "application/json"},
            data=json.dumps(chunk).encode(),
        )).read()


def main():
    print(f"NOTES_DIR: {NOTES_DIR}")
    course_id = get_course_id(COURSE_SLUG)
    print(f"course_id: {course_id}")
    chapter_map = get_chapter_map(course_id)
    print(f"chapters: {chapter_map}")

    print(f"\n[1] DELETE existing course_content for {COURSE_SLUG}")
    delete_existing(course_id)

    md_files = sorted(NOTES_DIR.glob("ch*.md"))
    print(f"\n[2] Processing {len(md_files)} MDs")

    all_rows = []
    for md in md_files:
        fm, body = parse_md(md)
        ticker = fm.get("ticker", "")
        ch_order = int(fm.get("chapter_order", 0))
        ch_title = fm.get("chapter_title", "").strip('"')
        chapter_id = chapter_map.get(ch_order)
        if not chapter_id:
            print(f"  SKIP {md.name} (no chapter for sort_order={ch_order})")
            continue

        chunks = chunk_text(body)
        print(f"  {md.name}: ticker={ticker} ch={ch_order} → {len(chunks)} chunks")

        # 加章節 prefix（每個 chunk 都帶上章節脈絡，retrieval 帶 context）
        prefix = f"[第{ch_order}章 {ch_title}]"
        prefixed = [f"{prefix}\n{c}" for c in chunks]

        embeddings = embed_batch(prefixed)
        for content, emb in zip(prefixed, embeddings):
            all_rows.append({
                "course_id": course_id,
                "chapter_id": chapter_id,
                "content": content,
                "content_type": "transcript",
                "embedding": emb,
            })

    print(f"\n[3] Inserting {len(all_rows)} rows to course_content")
    insert_rows(all_rows)

    print(f"\n[OK] DONE. Course '{COURSE_SLUG}' has {len(all_rows)} indexed chunks across {len(md_files)} chapters.")


if __name__ == "__main__":
    main()
