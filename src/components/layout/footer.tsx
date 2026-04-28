import Link from "next/link";
import { Globe, Play, MessageSquare, Languages } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#0A192F] text-slate-400 py-20 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1">
            <div className="text-lg font-bold text-white mb-8">
              牛津視界 Oxford Vision
            </div>
            <p className="text-sm leading-relaxed mb-8">
              引領華語世界 AI
              教育的先驅者。我們致力於將最前沿的技術轉化為可習得的職涯競爭力。
            </p>
            <div className="flex gap-4">
              {[Globe, Play, MessageSquare].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center hover:bg-white/5 hover:text-[#00D2FF] transition-all"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold mb-8 tracking-widest text-xs uppercase">
              探索內容
            </h5>
            <ul className="space-y-4 text-sm">
              <li>
                <Link
                  href="/courses"
                  className="hover:text-[#00D2FF] transition-colors"
                >
                  課程
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-[#00D2FF] transition-colors"
                >
                  學員心得
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-8 tracking-widest text-xs uppercase">
              關於我們
            </h5>
            <ul className="space-y-4 text-sm">
              <li>
                <Link
                  href="/about"
                  className="hover:text-[#00D2FF] transition-colors"
                >
                  品牌理念
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-[#00D2FF] transition-colors"
                >
                  隱私政策
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-8 tracking-widest text-xs uppercase">
              法律條款
            </h5>
            <ul className="space-y-4 text-sm">
              <li>
                <Link
                  href="/legal"
                  className="hover:text-[#00D2FF] transition-colors"
                >
                  服務條款與政策
                </Link>
              </li>
              <li>
                <Link
                  href="/legal#privacy"
                  className="hover:text-[#00D2FF] transition-colors"
                >
                  隱私權政策
                </Link>
              </li>
              <li>
                <Link
                  href="/legal#refund"
                  className="hover:text-[#00D2FF] transition-colors"
                >
                  退款政策
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; 2026 巨石文化有限公司 — 牛津視界 Oxford Vision. All rights reserved.</p>
          <div className="flex gap-8">
            <span className="flex items-center gap-1">
              <Languages size={14} /> 繁體中文
            </span>
            <span>Designed with AI Excellence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
