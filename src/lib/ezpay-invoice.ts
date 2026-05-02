/**
 * ezPay 電子發票 API 串接
 * 文件:https://inv.ezpay.com.tw/Files/INV_MerchantApi.pdf
 *
 * 流程:
 * 1. AES-256-CBC 加密 PostData(同金流加密邏輯)
 * 2. POST /Api/invoice_issue 開立發票
 * 3. ezPay 回傳發票號碼 + 字軌
 * 4. ezPay 自動寄發票 email 給買受人
 *
 * 環境變數(Vercel encrypted):
 *   EZPAY_MERCHANT_ID   會員編號(C 開頭)
 *   EZPAY_HASH_KEY      32 字元
 *   EZPAY_HASH_IV       16 字元
 *   EZPAY_API_URL       預設 production https://inv.ezpay.com.tw
 */
import crypto from "crypto";

const MID = (process.env.EZPAY_MERCHANT_ID || "").trim();
const KEY = (process.env.EZPAY_HASH_KEY || "").trim();
const IV = (process.env.EZPAY_HASH_IV || "").trim();
const API_URL = (process.env.EZPAY_API_URL || "https://inv.ezpay.com.tw").trim();

function aesEncrypt(data: string): string {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(KEY),
    Buffer.from(IV)
  );
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function aesDecrypt(encrypted: string): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(KEY),
    Buffer.from(IV)
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

interface IssueParams {
  /** 對應訂單號(必填) */
  merchantOrderNo: string;
  /** 買受人類型:1=B2C 個人 / 2=B2B 公司(需統編) */
  category: "B2C" | "B2B";
  /** 買受人姓名 / 公司名 */
  buyerName: string;
  /** 買受人 email(電子載具寄送用) */
  buyerEmail: string;
  /** 買受人統編(B2B 必填,B2C 不填) */
  buyerUbn?: string;
  /** 載具類型:0=不使用 / 1=會員載具 / 2=自然人憑證 / 3=手機條碼 */
  carrierType?: "0" | "1" | "2" | "3";
  /** 載具編號(手機條碼/自然人憑證) */
  carrierNum?: string;
  /** 捐贈愛心碼(若捐贈,3-7 位數) */
  loveCode?: string;
  /** 品名 */
  itemName: string;
  /** 數量 */
  itemCount: number;
  /** 單價(含稅) */
  itemPrice: number;
  /** 課稅別:1=應稅 / 2=零稅率 / 3=免稅 */
  taxType?: "1" | "2" | "3";
  /** 備註 */
  comment?: string;
}

interface IssueResult {
  ok: boolean;
  invoiceNumber?: string;
  invoiceTransNo?: string;
  randomNum?: string;
  createTime?: string;
  rawStatus?: string;
  rawMessage?: string;
  rawResult?: Record<string, unknown>;
}

/**
 * 開立電子發票
 * 成功時 ezPay 會自動寄發票 email 給 buyerEmail
 */
export async function issueInvoice(p: IssueParams): Promise<IssueResult> {
  if (!MID || !KEY || !IV) {
    return { ok: false, rawMessage: "EZPAY env not configured" };
  }

  const taxType = p.taxType || "1";
  // 應稅:稅率 5%,Amt = 含稅 / 1.05,TaxAmt = Amt * 0.05
  const totalAmt = p.itemCount * p.itemPrice;
  const amt = taxType === "1" ? Math.round(totalAmt / 1.05) : totalAmt;
  const taxAmt = totalAmt - amt;

  const params: Record<string, string | number> = {
    RespondType: "JSON",
    Version: "1.5",
    TimeStamp: Math.floor(Date.now() / 1000),
    MerchantOrderNo: p.merchantOrderNo,
    Status: "1", // 1 = 立即開立
    Category: p.category === "B2B" ? "B2B" : "B2C",
    BuyerName: p.buyerName,
    BuyerEmail: p.buyerEmail,
    PrintFlag: "Y",
    TaxType: taxType,
    TaxRate: taxType === "1" ? 5 : 0,
    Amt: amt,
    TaxAmt: taxAmt,
    TotalAmt: totalAmt,
    ItemName: p.itemName,
    ItemCount: p.itemCount,
    ItemUnit: "堂",
    ItemPrice: p.itemPrice,
    ItemAmt: totalAmt,
    Comment: p.comment || "",
  };
  if (p.buyerUbn) params.BuyerUBN = p.buyerUbn;
  if (p.carrierType && p.carrierType !== "0") {
    params.CarrierType = p.carrierType;
    if (p.carrierNum) params.CarrierNum = p.carrierNum;
  }
  if (p.loveCode) params.LoveCode = p.loveCode;

  const queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const postData = aesEncrypt(queryString);

  const formData = new URLSearchParams({
    MerchantID_: MID,
    PostData_: postData,
  });

  try {
    const resp = await fetch(`${API_URL}/Api/invoice_issue`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const text = await resp.text();
    let body: { Status: string; Message: string; Result?: string };
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, rawMessage: `non-JSON response: ${text.slice(0, 200)}` };
    }
    if (body.Status !== "SUCCESS") {
      return {
        ok: false,
        rawStatus: body.Status,
        rawMessage: body.Message,
      };
    }
    let result: Record<string, unknown> | undefined;
    if (body.Result) {
      try {
        result = typeof body.Result === "string" ? JSON.parse(body.Result) : body.Result;
      } catch {
        result = undefined;
      }
    }
    return {
      ok: true,
      invoiceNumber: result?.InvoiceNumber as string | undefined,
      invoiceTransNo: result?.InvoiceTransNo as string | undefined,
      randomNum: result?.RandomNum as string | undefined,
      createTime: result?.CreateTime as string | undefined,
      rawResult: result,
    };
  } catch (e) {
    return { ok: false, rawMessage: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 解密 ezPay webhook PostData(/api/inv 收到的 callback)
 * 用於驗證背景回傳通知
 */
export function decryptCallback(postData: string): Record<string, unknown> | null {
  try {
    const decrypted = aesDecrypt(postData);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}
