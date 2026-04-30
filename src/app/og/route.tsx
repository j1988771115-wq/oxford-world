import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d1c32 0%, #0a1628 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#94a3b8",
              letterSpacing: "4px",
              marginBottom: "8px",
            }}
          >
            牛津視界 OXFORD VISION
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
              textAlign: "center",
            }}
          >
            太空時代的資本配置
          </div>
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              background: "linear-gradient(135deg, #00677f, #00d2ff)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            下一個十年的產業革命
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              marginTop: "16px",
            }}
          >
            久方武院長親授 · 10 章深度拆解美股太空標的
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
