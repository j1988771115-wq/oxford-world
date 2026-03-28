import crypto from "crypto";

const MERCHANT_ID = process.env.NEWEBPAY_MERCHANT_ID!;
const HASH_KEY = process.env.NEWEBPAY_HASH_KEY!;
const HASH_IV = process.env.NEWEBPAY_HASH_IV!;
const API_URL = process.env.NEWEBPAY_API_URL || "https://ccore.newebpay.com";

interface PaymentParams {
  orderId: string;
  amount: number;
  description: string;
  email: string;
  returnUrl: string;
  notifyUrl: string;
}

function aesEncrypt(data: string): string {
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
  return expectedSha === receivedSha;
}

export function decryptTradeInfo(encryptedData: string): Record<string, unknown> {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(HASH_KEY),
    Buffer.from(HASH_IV)
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}
