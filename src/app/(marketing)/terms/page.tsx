export const metadata = {
  title: "服務條款 — 牛津視界",
};

export default function TermsPage() {
  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-3xl mx-auto px-8 prose prose-lg text-on-surface prose-headings:text-on-surface prose-p:text-on-surface-variant prose-li:text-on-surface-variant prose-strong:text-on-surface">
        <h1 className="text-4xl font-black tracking-tight">服務條款</h1>
        <p className="text-on-surface-variant">最後更新日期：2026 年 3 月 28 日</p>

        <h2>1. 服務說明</h2>
        <p>
          牛津視界（Oxford Vision）提供線上學習課程、AI 學習助手、學習社群等服務。
          使用本平台即表示您同意遵守以下條款。
        </p>

        <h2>2. 帳戶</h2>
        <ul>
          <li>您必須提供正確的個人資訊進行註冊</li>
          <li>您有責任保管您的帳戶安全</li>
          <li>一個帳戶僅供一人使用，不得共享</li>
        </ul>

        <h2>3. 付款與退款</h2>
        <ul>
          <li>課程單次購買後，您將獲得永久存取權</li>
          <li>Pro 會員為月繳或年繳訂閱制，可隨時取消</li>
          <li>購買後 7 天內可申請全額退款</li>
          <li>退款後將撤銷相應的課程存取權</li>
        </ul>

        <h2>4. 智慧財產權</h2>
        <p>
          本平台所有課程內容（影片、文字、圖片、程式碼範例）均受著作權保護。您不得：
        </p>
        <ul>
          <li>錄製、下載或重新分發課程影片</li>
          <li>分享付費內容給非付費用戶</li>
          <li>將課程內容用於商業用途</li>
        </ul>

        <h2>5. AI 助手使用規範</h2>
        <ul>
          <li>AI 助手的回答僅供學習參考，不構成專業建議</li>
          <li>請勿嘗試繞過 AI 的安全限制</li>
          <li>請勿輸入違法、騷擾或不當內容</li>
        </ul>

        <h2>6. Discord 社群規範</h2>
        <ul>
          <li>尊重其他成員</li>
          <li>不得發布廣告或垃圾訊息</li>
          <li>違反規範可能導致帳戶停權</li>
        </ul>

        <h2>7. 免責聲明</h2>
        <p>
          本平台盡力確保課程品質，但不保證學習成果。AI
          助手的回答可能包含錯誤，使用者應自行判斷。
        </p>

        <h2>8. 條款修改</h2>
        <p>我們保留修改服務條款的權利。重大修改時會透過電子郵件通知您。</p>

        <h2>9. 聯繫我們</h2>
        <p>如有任何問題，請聯繫：support@oxfordvision.tw</p>
      </div>
    </main>
  );
}
