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
              fontSize: "72px",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            牛津視界
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
            Oxford Vision
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              marginTop: "16px",
            }}
          >
            AI 時代，不再當無頭蒼蠅
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
