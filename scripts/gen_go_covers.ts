import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

const client = new OpenAI();

const OUT_DIR = path.join(process.cwd(), "public/covers");

interface CoverSpec {
  filename: string;
  prompt: string;
}

const COVERS: CoverSpec[] = [
  {
    filename: "legacy-go-basics.png",
    prompt: `A premium online course cover image, 16:9 landscape, dark navy gradient background with subtle cyan-blue glow.
Bold typography reading "Go 初階班" (large Chinese title in white, sans-serif Black weight).
Below it smaller secondary text: "從零學會 Go 語法 · 第一個微服務".
Top-left small grayscale brand mark "巨石文化 BOULDER · 牛津視界 Oxford Vision" (subtle, light gray).
A subtle stylized "G" letterform watermark on the right (90% opacity, blueish).
Tag at bottom: "BASIC · 入門課程".
Modern tech course aesthetic, clean, professional, no clutter, no random text, no people. NOT photorealistic, NOT cluttered.
Color palette: deep navy #0a0f1e, cyan accent #00ADD8 (Go official cyan), white text.`,
  },
  {
    filename: "legacy-go-advanced.png",
    prompt: `A premium online course cover image, 16:9 landscape, dark deep purple gradient background with violet glow.
Bold typography reading "Go 進階班" (large Chinese title in white, sans-serif Black weight).
Below it smaller secondary text: "並發 · 系統架構 · 生產級實戰".
Top-left small grayscale brand mark "巨石文化 BOULDER · 牛津視界 Oxford Vision" (subtle, light gray).
A subtle stylized "G" letterform watermark on the right (90% opacity, violet).
Tag at bottom: "ADVANCED · 進階課程".
Modern tech course aesthetic, premium, sophisticated, NOT cluttered, no random text, no people.
Color palette: deep purple #1a0d33, violet accent #8b5cf6, white text.`,
  },
];

async function genOne(spec: CoverSpec) {
  console.log(`Generating ${spec.filename}...`);
  const tryModels = ["gpt-image-2", "gpt-image-1"];
  for (const model of tryModels) {
    try {
      const result = await client.images.generate({
        model,
        prompt: spec.prompt,
        size: "1536x1024",
        n: 1,
      } as Parameters<typeof client.images.generate>[0]);
      const data = result.data?.[0];
      if (!data) throw new Error("no data");
      const b64 = (data as { b64_json?: string }).b64_json;
      const url = (data as { url?: string }).url;
      let buf: Buffer;
      if (b64) {
        buf = Buffer.from(b64, "base64");
      } else if (url) {
        const resp = await fetch(url);
        buf = Buffer.from(await resp.arrayBuffer());
      } else {
        throw new Error("neither b64 nor url");
      }
      const outPath = path.join(OUT_DIR, spec.filename);
      fs.writeFileSync(outPath, buf);
      const sz = (buf.length / 1024).toFixed(0);
      console.log(`  ${model} OK ${outPath} (${sz} KB)`);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ${model} failed: ${msg.slice(0, 200)}`);
    }
  }
  throw new Error(`all models failed for ${spec.filename}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const spec of COVERS) {
    await genOne(spec);
  }
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
