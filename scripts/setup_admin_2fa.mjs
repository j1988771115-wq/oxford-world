#!/usr/bin/env node
// 一次性 script:產 admin 後台 TOTP secret + QR code
// 用法:node scripts/setup_admin_2fa.mjs
//
// 步驟:
//   1. 跑這個 script
//   2. 用 Google Authenticator / 1Password / Authy 掃 QR code
//   3. 把 ADMIN_TOTP_SECRET 加到 Vercel env vars (production + preview)
//   4. redeploy
//   5. 之後 admin 登入要密碼 + 6 位數驗證碼

import { generate, generateSecret, generateURI } from "otplib";
import qrcode from "qrcode";

const ISSUER = "Oxford Vision Admin";
const ACCOUNT = "admin";

const secret = generateSecret();
const otpauth = generateURI({ issuer: ISSUER, label: ACCOUNT, secret });

console.log("\n=== Oxford Vision Admin 2FA Setup ===\n");
console.log("Secret (存到 Vercel env ADMIN_TOTP_SECRET):");
console.log(`\n  ${secret}\n`);
console.log("otpauth URI:");
console.log(`  ${otpauth}\n`);
console.log("掃下面的 QR code (Google Authenticator / 1Password / Authy):\n");

const qr = await qrcode.toString(otpauth, { type: "terminal", small: true });
console.log(qr);

const sample = await generate({ secret, strategy: "totp" });
console.log(`目前驗證碼 (測試用,30 秒換一次): ${sample}\n`);
console.log("掃完後到 Vercel:");
console.log("  vercel env add ADMIN_TOTP_SECRET production");
console.log(`  → 貼:${secret}\n`);
console.log("preview / development 環境也建議一起加。\n");
