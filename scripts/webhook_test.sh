#!/bin/bash
# 對 production webhook 連打 4 種 payload,測 handler 是否全部回 200 + 寫 webhook_log。
# 不依賴真實 HASH_KEY — 各種失敗 path 都該被 graceful 處理。

URL="https://oxford-vision.com/api/webhooks/newebpay"

run() {
  local label="$1"; shift
  local code=$(curl -sS -o /tmp/wh_resp.txt -w "%{http_code}" "$@" "$URL")
  printf "%-30s HTTP %s  body=%s\n" "$label" "$code" "$(cat /tmp/wh_resp.txt | head -c 80)"
}

echo "=== 1. empty body ==="
run "empty body" -X POST -d ""

echo
echo "=== 2. body 不是 form-data ==="
run "JSON body" -X POST -H "Content-Type: application/json" -d '{"foo":"bar"}'

echo
echo "=== 3. form-data 但缺欄位 ==="
run "missing fields" -X POST -F "TradeInfo=garbage"

echo
echo "=== 4. form-data 但 SHA 錯 ==="
run "bad SHA" -X POST \
  -F "TradeInfo=abc123notrealencrypted" \
  -F "TradeSha=DEADBEEF" \
  -F "MerchantOrderNo=TEST_FAKE_001"

echo
echo "=== 5. 大量 garbage data 看會不會 throw ==="
run "huge garbage" -X POST \
  -F "TradeInfo=$(head -c 5000 /dev/urandom | base64 | head -c 4000)" \
  -F "TradeSha=$(head -c 200 /dev/urandom | base64 | head -c 64)" \
  -F "MerchantOrderNo=TEST_HUGE_001"
