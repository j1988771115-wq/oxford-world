import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 一次性 debug endpoint:確認 prod runtime 真的拿到正確的 NEWEBPAY_HASH_KEY/IV
// 不印 plain value(避免 leak),只印 byte length + SHA-256 fingerprint + 前後 char codes
// 確認後立刻刪掉。
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const HK = (process.env.NEWEBPAY_HASH_KEY || "").trim();
  const HV = (process.env.NEWEBPAY_HASH_IV || "").trim();

  const charCodes = (s: string) => [...s].map((c) => c.charCodeAt(0));
  const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

  return NextResponse.json({
    HK: {
      string_length: HK.length,
      byte_length: Buffer.from(HK).length,
      sha256_first16: sha(HK),
      first6_codes: charCodes(HK.slice(0, 6)),
      last6_codes: charCodes(HK.slice(-6)),
    },
    HV: {
      string_length: HV.length,
      byte_length: Buffer.from(HV).length,
      sha256_first16: sha(HV),
      first6_codes: charCodes(HV.slice(0, 6)),
      last6_codes: charCodes(HV.slice(-6)),
    },
    self_test: (() => {
      try {
        const c = crypto.createCipheriv("aes-256-cbc", Buffer.from(HK), Buffer.from(HV));
        let e = c.update("Status=SUCCESS", "utf8", "hex");
        e += c.final("hex");
        const d = crypto.createDecipheriv("aes-256-cbc", Buffer.from(HK), Buffer.from(HV));
        let p = d.update(e, "hex", "utf8");
        p += d.final("utf8");
        return p === "Status=SUCCESS" ? "PASS" : `FAIL: ${p}`;
      } catch (e) {
        return `THROW: ${e instanceof Error ? e.message : String(e)}`;
      }
    })(),
  });
}
