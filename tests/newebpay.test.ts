import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  createPaymentForm,
  verifyTradeSha,
  decryptTradeInfo,
} from "@/lib/newebpay";

// Helper: encrypt a JSON payload the way藍新 encrypts its webhook response,
// so we can test decryptTradeInfo against realistic ciphertext.
function encryptAsNewebpayWouldRespond(payload: object): string {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.NEWEBPAY_HASH_KEY!),
    Buffer.from(process.env.NEWEBPAY_HASH_IV!)
  );
  let enc = cipher.update(JSON.stringify(payload), "utf8", "hex");
  enc += cipher.final("hex");
  return enc;
}

describe("newebpay", () => {
  const validParams = {
    orderId: "OV_TEST_ORDER_001",
    amount: 4990,
    description: "牛津視界 — 太空時代的資本配置",
    email: "test@oxford-vision.com",
    returnUrl: "https://oxford-vision.com/api/payment/return",
    notifyUrl: "https://oxford-vision.com/api/webhooks/newebpay",
  };

  describe("createPaymentForm", () => {
    it("returns action URL and required藍新 fields", () => {
      const form = createPaymentForm(validParams);
      expect(form.action).toContain("/MPG/mpg_gateway");
      expect(form.fields.MerchantID).toBe("MS_TEST_12345678");
      expect(form.fields.TradeInfo).toBeTruthy();
      expect(form.fields.TradeSha).toBeTruthy();
      expect(form.fields.Version).toBe("2.0");
    });

    it("TradeSha matches expected SHA256 of HashKey + TradeInfo + HashIV", () => {
      const form = createPaymentForm(validParams);
      // Self-consistency: verifyTradeSha should agree with the same TradeInfo
      expect(verifyTradeSha(form.fields.TradeInfo, form.fields.TradeSha)).toBe(
        true
      );
    });

    it("TradeInfo is encrypted (not plaintext)", () => {
      const form = createPaymentForm(validParams);
      expect(form.fields.TradeInfo).not.toContain("MerchantOrderNo");
      expect(form.fields.TradeInfo).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("verifyTradeSha", () => {
    it("accepts correctly signed TradeInfo", () => {
      const form = createPaymentForm(validParams);
      expect(verifyTradeSha(form.fields.TradeInfo, form.fields.TradeSha)).toBe(
        true
      );
    });

    it("rejects tampered TradeInfo (different bytes, same sha)", () => {
      const form = createPaymentForm(validParams);
      // flip one hex char in TradeInfo — sha should no longer match
      const tampered =
        form.fields.TradeInfo.slice(0, -1) +
        (form.fields.TradeInfo.slice(-1) === "0" ? "1" : "0");
      expect(verifyTradeSha(tampered, form.fields.TradeSha)).toBe(false);
    });

    it("rejects wrong TradeSha", () => {
      const form = createPaymentForm(validParams);
      const fakeSha = "0".repeat(64).toUpperCase();
      expect(verifyTradeSha(form.fields.TradeInfo, fakeSha)).toBe(false);
    });
  });

  describe("decryptTradeInfo (simulated藍新 webhook response)", () => {
    // 藍新 webhook POSTs TradeInfo = AES(JSON), not AES(querystring).
    // Outbound (createPaymentForm) and inbound (decryptTradeInfo) are
    // intentionally asymmetric — this test protects that invariant.
    it("parses a藍新-style encrypted JSON response", () => {
      const webhookPayload = {
        Status: "SUCCESS",
        MerchantID: "MS_TEST_12345678",
        Result: {
          MerchantOrderNo: "OV_TEST_ORDER_001",
          TradeNo: "26042100000001",
          Amt: 4990,
          PaymentType: "CREDIT",
        },
      };
      const cipher = encryptAsNewebpayWouldRespond(webhookPayload);
      const parsed = decryptTradeInfo(cipher) as typeof webhookPayload;

      expect(parsed.Status).toBe("SUCCESS");
      expect(parsed.Result.MerchantOrderNo).toBe("OV_TEST_ORDER_001");
      expect(parsed.Result.Amt).toBe(4990);
    });

    it("throws on corrupt ciphertext", () => {
      expect(() => decryptTradeInfo("deadbeef")).toThrow();
    });
  });
});
