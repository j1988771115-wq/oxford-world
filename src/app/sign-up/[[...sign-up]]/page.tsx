import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-surface-container-lowest p-12 rounded-2xl deep-diffusion text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-on-surface mb-4">註冊</h1>
        <p className="text-on-surface-variant mb-8">
          認證系統尚未設定，請稍後再試。
        </p>
        <Link
          href="/"
          className="signature-gradient text-white px-8 py-3 rounded-xl font-bold inline-block hover:opacity-90 transition"
        >
          返回首頁
        </Link>
      </div>
    </div>
  );
}
