// Test env — must be set before any module import that reads them at load time.
// Matches藍新 sandbox example keys (32 chars HashKey + 16 chars HashIV).
process.env.NEWEBPAY_MERCHANT_ID = "MS_TEST_12345678";
process.env.NEWEBPAY_HASH_KEY = "abcdefghijklmnopqrstuvwxyz123456";
process.env.NEWEBPAY_HASH_IV = "abcdef1234567890";
process.env.NEWEBPAY_API_URL = "https://ccore.newebpay.com";
