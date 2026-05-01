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
          <li>Pro 會員為月繳訂閱制，隨時可取消，當期已付週期繼續使用至到期</li>
          <li>
            依消費者保護法數位內容例外規定，課程一經開通即不退款。Pro 訂閱可隨時取消，但已扣款週期不退
          </li>
          <li>個案爭議請寄 support@oxford-vision.com</li>
        </ul>

        <h2>4. 智慧財產權</h2>
        <p>
          本平台所有課程內容（影片、文字、圖片、程式碼範例、AI 助教 RAG 嵌入向量、課程章節 takeaway 摘要等）著作權皆屬於
          <strong>巨石文化有限公司</strong>所有,部分內容由講師（如久方武院長）授權使用。
        </p>
        <p>您同意以下使用限制：</p>
        <ul>
          <li>不得以任何形式錄製、截錄、下載、轉存或重新分發課程影片或衍生內容</li>
          <li>不得將帳號分享給非付費用戶；本平台對同一帳號多裝置 / 異地登入有偵測機制,違反者立即封鎖且不退費</li>
          <li>不得將課程內容用於商業培訓、二次製作、轉售、或任何形式的公開傳輸</li>
          <li>不得抓取、複製平台 AI 助教產出的回答用於訓練其他 AI 模型</li>
        </ul>
        <p>
          影片畫面均嵌入您的登入帳號浮水印（半透明、隨機位置變化）。違反上述條款致著作權人受有損害者,
          除依《著作權法》第 88 條請求損害賠償（含實際損害、所得利益、或請求 1 萬元以上 100 萬元以下法定賠償）外,
          另加計每件違約金新台幣 <strong>200,000 元</strong>整,並由觀看者承擔所有訴訟費、律師費、調查費。
        </p>
        <p>
          檢舉非法散播本平台內容者,經查證屬實後將獲得新台幣 5,000 元以上獎金（與課程定價同級）。
        </p>

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
        <p>如有任何問題，請聯繫：support@oxford-vision.com</p>
      </div>
    </main>
  );
}
