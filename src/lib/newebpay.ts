import crypto from "crypto";

// .trim() 防 Vercel env 尾巴有 \n / 空白 — 之前 Mux token 踩過同樣的雷
const MERCHANT_ID = (process.env.NEWEBPAY_MERCHANT_ID || "").trim();
const HASH_KEY = (process.env.NEWEBPAY_HASH_KEY || "").trim();
const HASH_IV = (process.env.NEWEBPAY_HASH_IV || "").trim();
const API_URL = (process.env.NEWEBPAY_API_URL || "https://ccore.newebpay.com").trim();

interface PaymentParams {
  orderId: string;
  amount: number;
  description: string;
  email: string;
  returnUrl: string;
  notifyUrl: string;
}

export function aesEncrypt(data: string): string {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(HASH_KEY),
    Buffer.from(HASH_IV)
  );
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex").toUpperCase();
}

export function createPaymentForm(params: PaymentParams) {
  const tradeInfo: Record<string, string | number> = {
    MerchantID: MERCHANT_ID,
    RespondType: "JSON",
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
    Version: "2.0",
    MerchantOrderNo: params.orderId,
    Amt: params.amount,
    ItemDesc: params.description,
    Email: params.email,
    ReturnURL: params.returnUrl,
    NotifyURL: params.notifyUrl,
    CREDIT: 1,
    VACC: 1, // ATM 轉帳
    CVS: 1, // 超商代碼
  };

  const queryString = Object.entries(tradeInfo)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const tradeInfoEncrypted = aesEncrypt(queryString);
  const tradeSha = sha256(
    `HashKey=${HASH_KEY}&${tradeInfoEncrypted}&HashIV=${HASH_IV}`
  );

  return {
    action: `${API_URL}/MPG/mpg_gateway`,
    fields: {
      MerchantID: MERCHANT_ID,
      TradeInfo: tradeInfoEncrypted,
      TradeSha: tradeSha,
      Version: "2.0",
    },
  };
}

export function verifyTradeSha(tradeInfo: string, receivedSha: string): boolean {
  const expectedSha = sha256(
    `HashKey=${HASH_KEY}&${tradeInfo}&HashIV=${HASH_IV}`
  );
  // timing-safe — 比對 hex string 不能用 ===
  const a = Buffer.from(expectedSha, "utf8");
  const b = Buffer.from(receivedSha, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function decryptTradeInfo(encryptedData: string): Record<string, unknown> {
  // 藍新用非標準 padding(觀察到 0x1A 補到 32-byte 對齊,而非 PKCS#7 16-byte),
  // Node.js 預設驗 PKCS#7 會 throw "bad decrypt"。關掉 autoPadding 自己 strip。
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(HASH_KEY),
    Buffer.from(HASH_IV)
  );
  decipher.setAutoPadding(false);
  const buf = Buffer.concat([
    decipher.update(encryptedData, "hex"),
    decipher.final(),
  ]);
  let end = buf.length;
  if (end > 0) {
    const padLen = buf[end - 1];
    if (padLen > 0 && padLen <= 32 && buf.slice(end - padLen).every((b) => b === padLen)) {
      end -= padLen;
    }
  }
  return JSON.parse(buf.slice(0, end).toString("utf8"));
}

/**
 * 主動查藍新訂單狀態 — webhook 沒打進來時的後備驗證
 * 回 { status: "SUCCESS"|"PENDING"|"FAILED"|"NOT_FOUND", paymentType?, tradeNo?, paidAt? }
 * 文件:https://www.newebpay.com/developer (查詢訂單 API)
 */
export async function queryNewebPayOrder(
  merchantOrderNo: string,
  amount: number
): Promise<{
  status: string;
  paymentType?: string;
  tradeNo?: string;
  paidAt?: string;
  raw?: Record<string, unknown>;
  error?: string;
}> {
  // CheckValue: SHA256("IV={HashIV}&Amt={Amt}&MerchantID={MID}&MerchantOrderNo={N}&Key={HashKey}")
  // 注意:藍新查單 API 的 SHA 是 IV/Key 順序而不是 HashKey/HashIV(跟 mpg_gateway 不同)
  const checkValue = sha256(
    `IV=${HASH_IV}&Amt=${amount}&MerchantID=${MERCHANT_ID}&MerchantOrderNo=${merchantOrderNo}&Key=${HASH_KEY}`
  );

  const params = new URLSearchParams({
    MerchantID: MERCHANT_ID,
    Version: "1.3",
    RespondType: "JSON",
    CheckValue: checkValue,
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
    MerchantOrderNo: merchantOrderNo,
    Amt: amount.toString(),
  });

  // production: https://core.newebpay.com  / testing: https://ccore.newebpay.com
  const queryUrl = `${API_URL}/API/QueryTradeInfo`;

  try {
    const resp = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const text = await resp.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return { status: "ERROR", error: `non-JSON response: ${text.slice(0, 200)}` };
    }
    // 藍新回應結構:{ Status, Message, Result: { TradeStatus, PaymentType, TradeNo, PayTime, ... } }
    const Status = body.Status as string;
    const Result = (body.Result || {}) as Record<string, unknown>;
    if (Status !== "SUCCESS") {
      // Status 不是 SUCCESS 通常是查不到單 / 訂單尚未付款
      return {
        status: "NOT_FOUND",
        error: (body.Message as string) || "query failed",
        raw: body,
      };
    }
    // TradeStatus: 0=未付款 / 1=已付款 / 2=付款失敗 / 3=取消 / 6=退款
    const tradeStatus = String(Result.TradeStatus || "");
    const mapped =
      tradeStatus === "1"
        ? "SUCCESS"
        : tradeStatus === "0"
        ? "PENDING"
        : tradeStatus === "2"
        ? "FAILED"
        : tradeStatus === "3"
        ? "CANCELLED"
        : tradeStatus === "6"
        ? "REFUNDED"
        : `UNKNOWN_${tradeStatus}`;
    return {
      status: mapped,
      paymentType: Result.PaymentType as string | undefined,
      tradeNo: Result.TradeNo as string | undefined,
      paidAt: Result.PayTime as string | undefined,
      raw: body,
    };
  } catch (e) {
    return { status: "ERROR", error: e instanceof Error ? e.message : String(e) };
  }
}
