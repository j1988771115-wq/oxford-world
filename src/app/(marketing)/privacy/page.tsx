export const metadata = {
  title: "隱私政策 — 牛津視界",
};

export default function PrivacyPage() {
  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-3xl mx-auto px-8 prose prose-lg text-on-surface prose-headings:text-on-surface prose-p:text-on-surface-variant prose-li:text-on-surface-variant prose-strong:text-on-surface">
        <h1 className="text-4xl font-black tracking-tight">隱私政策</h1>
        <p className="text-on-surface-variant">最後更新日期：2026 年 3 月 28 日</p>

        <h2>1. 資料蒐集</h2>
        <p>牛津視界（以下簡稱「本平台」）在您使用服務時，可能蒐集以下個人資料：</p>
        <ul>
          <li>姓名、電子郵件地址（註冊時提供）</li>
          <li>付款資訊（透過藍新金流處理，本平台不儲存信用卡號碼）</li>
          <li>學習行為資料（課程觀看紀錄、AI 助手對話紀錄）</li>
          <li>裝置資訊與 Cookie（用於改善使用體驗）</li>
        </ul>

        <h2>2. 資料使用</h2>
        <p>我們使用您的資料來：</p>
        <ul>
          <li>提供、維護和改善本平台服務</li>
          <li>處理付款和管理您的帳戶</li>
          <li>個人化您的學習體驗和 AI 推薦</li>
          <li>發送服務通知和週報（您可隨時取消訂閱）</li>
        </ul>

        <h2>3. 資料分享</h2>
        <p>我們不會出售您的個人資料。我們僅在以下情況分享資料：</p>
        <ul>
          <li>您加入 Discord 社群時（分享必要的身份驗證資訊）</li>
          <li>處理付款時（與藍新金流共享交易資訊）</li>
          <li>法律要求時</li>
        </ul>

        <h2>4. AI 助手</h2>
        <p>
          您與 AI 助手的對話會被記錄用於改善服務品質。對話內容會透過第三方 AI
          服務（Anthropic Claude）處理。我們不會將您的對話用於訓練 AI 模型。
        </p>

        <h2>5. 資料安全</h2>
        <p>
          我們採用業界標準的安全措施保護您的資料，包括加密傳輸（HTTPS）、加密儲存、和存取控制。
        </p>

        <h2>6. 您的權利</h2>
        <p>您有權：</p>
        <ul>
          <li>存取、更正或刪除您的個人資料</li>
          <li>取消電子報訂閱</li>
          <li>要求我們停止處理您的資料</li>
          <li>要求匯出您的資料</li>
        </ul>

        <h2>7. 聯繫我們</h2>
        <p>如有任何隱私相關問題，請聯繫：privacy@oxford-vision.com</p>
      </div>
    </main>
  );
}
