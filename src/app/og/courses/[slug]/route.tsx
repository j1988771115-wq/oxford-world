// 動態 og-image per course — 社群分享 CTR 翻倍
// 自動帶上課程標題 + 講師 + 價格 overlay,1200x630 @ Edge runtime
import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;

  // Edge runtime 用 fetch 打 PostgREST(不能用 supabase-js admin)
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let course: { title: string; instructor: string | null; price: number; original_price: number | null; category: string | null } | null = null;
  try {
    const res = await fetch(
      `${supaUrl}/rest/v1/courses?slug=eq.${encodeURIComponent(slug)}&select=title,instructor,price,original_price,category`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      }
    );
    const data = await res.json();
    course = Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    // fall through to default
  }

  const title = course?.title || "牛津視界 Oxford Vision";
  const instructor = course?.instructor || "";
  const price = course?.price || 0;
  const original = course?.original_price || 0;
  const category = course?.category || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0A192F 0%, #0d2845 50%, #00D2FF 100%)",
          fontFamily: "sans-serif",
          padding: "60px",
          color: "white",
          position: "relative",
        }}
      >
        {/* 頂部 — 品牌 + 分類 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "linear-gradient(135deg,#00D2FF,#0a1f44)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              牛
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>牛津視界</div>
              <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2 }}>OXFORD VISION</div>
            </div>
          </div>
          {category && (
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 2,
                padding: "10px 18px",
                background: "rgba(0,210,255,0.15)",
                border: "1.5px solid rgba(0,210,255,0.5)",
                borderRadius: 999,
                display: "flex",
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* 中間 — 大標題 */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: title.length > 20 ? 64 : 80,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -1,
              marginBottom: 24,
              color: "white",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {title}
          </div>
          {instructor && (
            <div style={{ fontSize: 28, opacity: 0.85, fontWeight: 600, display: "flex" }}>
              講師 · {instructor}
            </div>
          )}
        </div>

        {/* 底部 — 價格 */}
        {price > 0 && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, justifyContent: "flex-start" }}>
            {original > price && (
              <div
                style={{
                  fontSize: 26,
                  textDecoration: "line-through",
                  opacity: 0.5,
                  display: "flex",
                }}
              >
                NT${original.toLocaleString()}
              </div>
            )}
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: "#00D2FF",
                display: "flex",
              }}
            >
              NT${price.toLocaleString()}
            </div>
            <div style={{ fontSize: 20, opacity: 0.7, fontWeight: 600, display: "flex" }}>
              一次付費 · 1 年無限看 + 贈送
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
