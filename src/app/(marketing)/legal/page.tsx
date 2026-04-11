export const metadata = {
  title: "服務條款與政策 — 牛津視界",
};

export default function LegalPage() {
  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-3xl mx-auto px-8 prose prose-lg text-on-surface prose-headings:text-on-surface prose-p:text-on-surface-variant prose-li:text-on-surface-variant prose-strong:text-on-surface prose-a:text-secondary prose-th:text-on-surface prose-td:text-on-surface-variant">
        <h1 className="text-4xl font-black tracking-tight">服務條款與政策</h1>
        <p className="text-on-surface-variant">最後更新日期：2026 年 4 月 11 日</p>

        {/* Quick nav */}
        <div className="bg-surface-container-low rounded-xl p-6 not-prose mb-12">
          <p className="font-bold text-on-surface mb-3">快速導覽</p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            <li><a href="#transaction-flow" className="text-secondary hover:underline">一、交易模式說明</a></li>
            <li><a href="#invoice" className="text-secondary hover:underline">二、收據開立流程</a></li>
            <li><a href="#terms" className="text-secondary hover:underline">三、服務條款</a></li>
            <li><a href="#privacy" className="text-secondary hover:underline">四、隱私權政策</a></li>
            <li><a href="#refund" className="text-secondary hover:underline">五、退款政策</a></li>
            <li><a href="#consumer-rights" className="text-secondary hover:underline">六、消費者權益</a></li>
          </ul>
        </div>

        {/* ==================== 一、交易模式說明 ==================== */}
        <h2 id="transaction-flow">一、交易模式說明</h2>

        <h3>1.1 事業概述</h3>
        <p>
          牛津視界 Oxford Vision 為線上學習平台，由巨石文化有限公司營運，提供 AI 與科技領域之線上課程、市場分析報告、AI 學習助教、學習社群等服務，協助職場人士與學習者掌握 AI 時代所需的知識與技能。
        </p>
        <ul>
          <li><strong>經營者：</strong>巨石文化有限公司</li>
          <li><strong>統一編號：</strong>60516174</li>
          <li><strong>平台網址：</strong><a href="https://oxford-vision.com">oxford-vision.com</a></li>
          <li><strong>聯絡信箱：</strong><a href="mailto:support@oxford-vision.com">support@oxford-vision.com</a></li>
        </ul>

        <h3>1.2 服務內容與方案</h3>
        <table>
          <thead>
            <tr><th>方案</th><th>內容</th><th>價格</th></tr>
          </thead>
          <tbody>
            <tr><td>免費方案</td><td>課程試看、AI 工具分享文章、Email 週報訂閱</td><td>NT$0</td></tr>
            <tr><td>Pro 訂閱</td><td>Vibe Coding 全系列課程、市場分析報告、Eyesy AI 助教、個人化學習路徑、Discord 社群</td><td>NT$999/月 或 NT$9,990/年</td></tr>
            <tr><td>大師課</td><td>頂尖講師深度獨立課程，單課買斷永久觀看</td><td>依課程定價</td></tr>
          </tbody>
        </table>
        <p>Pro 訂閱方案提供 <strong>7 天免費試用</strong>，試用期間可隨時取消，不收取任何費用。</p>

        <h3>1.3 完整交易流程</h3>

        <div className="not-prose space-y-4 mb-8">
          {[
            { step: "1", title: "選擇方案或課程", desc: "消費者於本平台瀏覽服務方案或課程，選擇適合之項目後點擊購買或訂閱。" },
            { step: "2", title: "註冊 / 登入帳號", desc: "消費者以電子郵件註冊或登入帳號，填寫必要資料。" },
            { step: "3", title: "線上付款", desc: "系統導向藍新金流（NewebPay）第三方金流平台進行付款。支援信用卡（一次付清）、網路 ATM 轉帳、超商代碼繳費等付款方式。所有付款資訊由藍新金流加密處理，本平台不經手任何信用卡資訊。" },
            { step: "4", title: "訂單成立與通知", desc: "付款成功後，系統自動建立訂單並發送確認信至消費者電子信箱。課程或服務權限即時開通。" },
            { step: "5", title: "開始使用服務", desc: "消費者可立即觀看課程影片、使用 AI 助教、參與社群等已購買之服務內容。" },
            { step: "6", title: "訂閱管理", desc: "Pro 訂閱用戶可隨時於個人設定頁面管理訂閱狀態，包括取消續訂。取消後權益維持至當前計費週期結束。" },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start bg-surface-container-low rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg signature-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">{item.step}</div>
              <div>
                <h4 className="font-bold text-on-surface text-sm">{item.title}</h4>
                <p className="text-on-surface-variant text-sm mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h3>1.4 金流安全機制</h3>
        <ul>
          <li>本平台使用<strong>藍新金流 NewebPay</strong> 為第三方金流服務商，所有交易資料皆經 SSL 加密傳輸。</li>
          <li>本平台<strong>不儲存</strong>任何消費者之信用卡號碼、CVV 或銀行帳號等敏感資訊。</li>
          <li>藍新金流通過 PCI DSS 認證，確保交易安全。</li>
          <li>每筆交易皆有唯一訂單編號可供查詢與對帳。</li>
        </ul>

        {/* ==================== 二、收據開立流程 ==================== */}
        <h2 id="invoice">二、收據開立流程</h2>

        <div className="bg-surface-container-low rounded-xl p-6 not-prose mb-6">
          <p className="text-on-surface-variant text-sm">
            本平台由<strong className="text-on-surface">巨石文化有限公司</strong>（統一編號：60516174）營運，依法開立電子發票。
          </p>
          <ul className="text-on-surface-variant text-sm mt-3 space-y-2">
            <li><strong className="text-on-surface">開立時機：</strong>消費者完成付款後，系統自動開立電子發票並寄送至消費者填寫之電子信箱。</li>
            <li><strong className="text-on-surface">發票內容：</strong>訂單編號、服務內容（方案名稱）、交易金額、付款日期。</li>
            <li><strong className="text-on-surface">品名：</strong>線上課程服務 / 線上學習訂閱服務。</li>
          </ul>
        </div>

        {/* ==================== 三、服務條款 ==================== */}
        <h2 id="terms">三、服務條款</h2>
        <p>歡迎使用牛津視界 Oxford Vision（以下簡稱「本平台」）提供之線上學習服務。當您使用本服務時，即表示您已閱讀、瞭解並同意接受以下條款。如不同意，請勿使用本服務。</p>

        <h3>3.1 服務內容與範圍</h3>
        <ol>
          <li>本平台提供線上課程影片、AI 學習助教（Eyesy）、學習路徑測驗、市場分析報告、討論社群等學習服務。</li>
          <li>各方案之服務內容依網站公告為準。</li>
          <li>課程內容僅供學習參考，不構成任何投資、法律或專業建議。</li>
          <li>AI 助教（Eyesy）的回答基於課程教材生成，可能包含不準確之內容，使用者應自行判斷。</li>
        </ol>

        <h3>3.2 訂單與付款</h3>
        <ol>
          <li>消費者於本平台選擇方案後，經由藍新金流（NewebPay）第三方金流平台完成付款，訂單即成立。</li>
          <li>付款方式包含：信用卡一次付清、網路 ATM 轉帳、超商代碼繳費。</li>
          <li>訂單成立後，系統將發送確認通知至消費者填寫之電子信箱。</li>
          <li>服務價格以訂購當時網站公告之價格為準。</li>
        </ol>

        <h3>3.3 帳戶使用</h3>
        <ol>
          <li>消費者應提供正確之個人資訊進行註冊。</li>
          <li>帳戶僅供註冊本人使用，不得轉讓、共享或出借。</li>
          <li>消費者有責任保管帳戶安全，因帳戶遭盜用所生之損害，本平台不負賠償責任。</li>
        </ol>

        <h3>3.4 智慧財產權</h3>
        <p>本平台所有課程內容（影片、文字、圖片、程式碼範例）及網站設計，均受中華民國著作權法及相關法律保護。消費者不得：</p>
        <ol>
          <li>錄製、下載、截取或重新分發課程影片。</li>
          <li>分享付費內容給非付費用戶。</li>
          <li>將課程內容用於商業用途。</li>
          <li>未經授權重製或修改本平台之任何內容。</li>
        </ol>

        <h3>3.5 免責聲明</h3>
        <ol>
          <li>本平台盡力確保課程品質與內容正確性，但不保證學習成果或特定效益。</li>
          <li>課程中涉及之投資、金融資訊僅供教學參考，不構成投資建議。消費者應自行評估風險，投資決策所生之損益由消費者自行負責。</li>
          <li>AI 助教之回答僅供參考，本平台不對其準確性或完整性負責。</li>
        </ol>

        <h3>3.6 條款修改</h3>
        <p>本平台保留隨時修改本條款之權利。修改後之條款將公告於本頁面，並以最後更新日期為準。重大變更時將透過電子郵件通知。</p>

        <h3>3.7 準據法與管轄</h3>
        <p>本條款以中華民國法律為準據法。因本條款所生之爭議，雙方同意以臺灣臺北地方法院為第一審管轄法院。</p>

        {/* ==================== 四、隱私權政策 ==================== */}
        <h2 id="privacy">四、隱私權政策</h2>
        <p>牛津視界（Oxford Vision）重視您的隱私權。本隱私權政策說明我們如何蒐集、使用、保護及處理您的個人資料。使用本服務即表示您同意本政策之內容。</p>

        <h3>4.1 個人資料之蒐集</h3>
        <table>
          <thead>
            <tr><th>資料類別</th><th>蒐集項目</th><th>蒐集目的</th></tr>
          </thead>
          <tbody>
            <tr><td>帳戶資料</td><td>姓名、電子信箱</td><td>帳戶建立、服務通知</td></tr>
            <tr><td>學習資料</td><td>課程觀看紀錄、測驗結果、AI 對話紀錄</td><td>個人化學習體驗、服務改善</td></tr>
            <tr><td>付款資料</td><td>交易編號、付款方式、付款狀態</td><td>訂單對帳及客服查詢</td></tr>
          </tbody>
        </table>

        <div className="bg-surface-container-low rounded-xl p-6 not-prose my-6">
          <p className="text-on-surface font-bold text-sm">重要聲明</p>
          <p className="text-on-surface-variant text-sm mt-1">
            所有付款資訊（信用卡號碼、CVV、銀行帳號等）皆由藍新金流（NewebPay）第三方金流平台直接處理。本平台<strong className="text-on-surface">不經手、不儲存</strong>任何消費者之敏感付款資訊。
          </p>
        </div>

        <h3>4.2 個人資料之使用目的</h3>
        <ol>
          <li><strong>服務履行：</strong>提供課程存取、AI 助教、學習路徑等服務。</li>
          <li><strong>個人化體驗：</strong>根據學習紀錄推薦課程、調整學習路徑。</li>
          <li><strong>客戶服務：</strong>回覆詢問、處理退款或爭議。</li>
          <li><strong>服務通知：</strong>寄送訂單確認、課程更新、週報等通知。</li>
        </ol>
        <p>我們<strong>不會</strong>將您的個人資料用於與上述目的無關之行銷或廣告用途，除非事先取得您的明確同意。</p>

        <h3>4.3 AI 助教資料處理</h3>
        <p>
          您與 AI 助教（Eyesy）的對話會被記錄用於改善服務品質。對話內容透過第三方 AI 服務（Anthropic Claude）處理。我們不會將您的對話用於訓練 AI 模型。
        </p>

        <h3>4.4 個人資料之保護</h3>
        <ul>
          <li>本網站使用 SSL/TLS 加密傳輸，確保資料在傳輸過程中之安全。</li>
          <li>個人資料儲存於受存取控制保護之雲端伺服器（AWS 新加坡區域），僅授權人員得以存取。</li>
          <li>我們定期檢視資料安全措施，以防止未經授權之存取、洩漏或破壞。</li>
        </ul>

        <h3>4.5 個人資料之分享與揭露</h3>
        <p>我們不會出售、出租或交換您的個人資料予第三方。僅在以下情況下可能分享：</p>
        <ol>
          <li><strong>第三方金流服務商：</strong>藍新金流（NewebPay）— 處理付款交易所必要之資料。</li>
          <li><strong>AI 服務供應商：</strong>Anthropic — 處理 AI 助教對話所必要之資料。</li>
          <li><strong>法律要求：</strong>依中華民國法律規定、政府機關之合法調查或司法命令，有義務揭露時。</li>
        </ol>

        <h3>4.6 Cookie 及追蹤技術</h3>
        <p>本網站使用 Cookie 以維持登入狀態和改善使用體驗。Cookie 不包含個人識別資料，您可透過瀏覽器設定停用 Cookie。</p>

        <h3>4.7 您的權利</h3>
        <p>依據中華民國個人資料保護法，您享有以下權利：</p>
        <ul>
          <li>查詢或請求閱覽您的個人資料。</li>
          <li>請求補充或更正您的個人資料。</li>
          <li>請求停止蒐集、處理或利用您的個人資料。</li>
          <li>請求刪除您的個人資料。</li>
        </ul>
        <p>如需行使上述權利，請寄信至 <a href="mailto:support@oxford-vision.com">support@oxford-vision.com</a>，我們將於收到請求後 30 日內處理。</p>

        <h3>4.8 資料保存期限</h3>
        <p>您的個人資料將保存至服務目的達成後，依相關法規保存必要期間後刪除。訂單相關資料依法至少保存 5 年。</p>

        {/* ==================== 五、退款與取消政策 ==================== */}
        <h2 id="refund">五、退款與取消政策</h2>

        <h3>5.1 Pro 訂閱方案</h3>
        <ul>
          <li><strong>7 天免費試用：</strong>試用期內取消訂閱，不收取任何費用。</li>
          <li><strong>試用期結束後自動扣款：</strong>開始正式計費後，<strong>不提供退款</strong>。</li>
          <li><strong>取消續訂：</strong>可隨時取消下期續訂，權益維持至當前計費週期結束。</li>
        </ul>

        <h3>5.2 大師課（單課購買）</h3>
        <div className="bg-surface-container-low rounded-xl p-6 not-prose my-6">
          <p className="text-on-surface font-bold text-sm">數位內容不退款聲明</p>
          <p className="text-on-surface-variant text-sm mt-2">
            依據《通訊交易解除權合理例外情事適用準則》第 2 條，本平台之線上課程屬於「經消費者事先同意始提供之數位內容」。
            消費者於購買前已可透過<strong className="text-on-surface">免費試看章節</strong>預覽課程內容，
            並於結帳時<strong className="text-on-surface">明確勾選同意</strong>「本商品為數位內容，一經購買即可使用，不適用七天鑑賞期」後始完成交易。
          </p>
          <p className="text-on-surface-variant text-sm mt-2">
            因此，大師課一經購買，<strong className="text-on-surface">不提供退款</strong>。請於購買前善用免費試看功能，確認課程內容符合您的需求。
          </p>
        </div>

        <h3>5.3 例外情形</h3>
        <p>若發生以下情形，消費者得聯繫客服協商處理：</p>
        <ul>
          <li>課程內容與網站描述嚴重不符。</li>
          <li>技術問題導致課程無法正常觀看，且本平台無法於 7 個工作日內修復。</li>
          <li>重複扣款等系統錯誤。</li>
        </ul>

        <h3>5.4 聯繫客服</h3>
        <p>如有付款或訂閱相關問題，請寄信至 <a href="mailto:support@oxford-vision.com">support@oxford-vision.com</a>，我們將於 3 個工作日內回覆。</p>

        {/* ==================== 六、消費者權益 ==================== */}
        <h2 id="consumer-rights">六、消費者權益</h2>

        <div className="bg-surface-container-low rounded-xl p-6 not-prose mb-6">
          <h3 className="font-bold text-on-surface mb-3">您享有以下權益：</h3>
          <ul className="space-y-3 text-sm text-on-surface-variant">
            <li><strong className="text-on-surface">知情權：</strong>我們在網站清楚揭露所有方案內容、價格、服務流程及各項條款，確保您在消費前充分了解服務內容。</li>
            <li><strong className="text-on-surface">安全交易：</strong>所有付款透過藍新金流（NewebPay）第三方金流平台處理，交易資料經 SSL 加密，本平台不儲存任何敏感付款資訊。</li>
            <li><strong className="text-on-surface">試用保障：</strong>Pro 訂閱方案提供 7 天免費試用，試用期間可隨時取消，不收取任何費用。</li>
            <li><strong className="text-on-surface">購前預覽：</strong>大師課提供免費試看章節，消費者可在購買前充分了解課程內容與品質。</li>
            <li><strong className="text-on-surface">個資保護：</strong>您的個人資料受本平台隱私權政策保護，不會用於非服務相關之用途。</li>
            <li><strong className="text-on-surface">申訴管道：</strong>如有任何問題或不滿，您可隨時透過電子信箱聯繫我們，我們將於 3 個工作日內回覆。</li>
          </ul>
        </div>

        <h3>爭議處理</h3>
        <ol>
          <li>如消費者對服務有任何爭議，請先透過電子郵件（support@oxford-vision.com）與我們聯繫協商。</li>
          <li>如協商不成，消費者得依中華民國消費者保護法向各地消費者服務中心申訴，或向消費爭議調解委員會申請調解。</li>
          <li>消費者亦得依法向管轄法院提起訴訟。</li>
        </ol>

        {/* ==================== 聯絡方式 ==================== */}
        <h2>聯絡方式</h2>
        <p>如對上述任何條款或政策有疑問，請聯繫：</p>
        <ul>
          <li>經營者：巨石文化有限公司</li>
          <li>統一編號：60516174</li>
          <li>電子信箱：<a href="mailto:support@oxford-vision.com">support@oxford-vision.com</a></li>
          <li>處理時間：週一至週五 10:00–18:00（不含國定假日）</li>
        </ul>

        <h3>政策修改</h3>
        <p>本平台保留隨時修改上述條款與政策之權利。修改後將公告於本頁面，並更新最後修改日期。重大變更時將透過電子郵件通知。</p>
      </div>
    </main>
  );
}
