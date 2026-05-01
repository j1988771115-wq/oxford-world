/**
 * Mux signed playback token helpers.
 *
 * 需要環境變數：
 *   MUX_SIGNING_KEY          — signing key ID（公開，從 Mux dashboard 拿）
 *   MUX_SIGNING_KEY_PRIVATE  — base64-encoded RSA private key PEM
 *
 * 設定步驟（到 https://dashboard.mux.com/）：
 *   Settings → API Access → Signing Keys → Create new
 *   建完拿到 Key ID + Private Key (PEM)，把 PEM 用 base64 包起來放 .env
 */
import Mux from "@mux/mux-node";

// .trim() 防 Vercel env 帶 \n
const SIGNING_KEY_ID = (process.env.MUX_SIGNING_KEY || "").trim();
const SIGNING_KEY_PRIVATE = (process.env.MUX_SIGNING_KEY_PRIVATE || "").trim();

let mux: Mux | null = null;

function getMux(): Mux {
  if (!mux) {
    mux = new Mux({
      tokenId: (process.env.MUX_TOKEN_ID || "").trim(),
      tokenSecret: (process.env.MUX_TOKEN_SECRET || "").trim(),
    });
  }
  return mux;
}

/**
 * 為某個 Mux playback ID 簽一個 signed URL token，預設 60 分鐘有效。
 * 學員載入課程影片時呼叫，token 過期就自動失效，連結 leak 也只能短時間用。
 */
export async function signPlaybackToken(
  playbackId: string,
  options: { expirationSeconds?: number } = {}
): Promise<string> {
  if (!SIGNING_KEY_ID || !SIGNING_KEY_PRIVATE) {
    throw new Error(
      "Mux signing key 沒設定。到 Mux dashboard 建一個，把 Key ID 寫到 MUX_SIGNING_KEY、Private Key 用 base64 包成 MUX_SIGNING_KEY_PRIVATE"
    );
  }
  const ttl = options.expirationSeconds ?? 3600; // 1 hour
  const muxClient = getMux();
  const token = await muxClient.jwt.signPlaybackId(playbackId, {
    keyId: SIGNING_KEY_ID,
    keySecret: SIGNING_KEY_PRIVATE,
    expiration: `${ttl}s`,
    type: "video",
  });
  return token;
}

export function isMuxSigningConfigured(): boolean {
  return !!SIGNING_KEY_ID && !!SIGNING_KEY_PRIVATE;
}
