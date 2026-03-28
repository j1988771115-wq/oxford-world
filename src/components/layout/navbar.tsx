import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          牛津視界
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/courses"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            課程
          </Link>
          <Link
            href="/about"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            關於我們
          </Link>
          <Link
            href="/insights"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            最新內容
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                登入
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              我的學習
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
