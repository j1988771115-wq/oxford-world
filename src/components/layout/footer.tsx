import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-8 border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p>&copy; 2026 牛津視界 Oxford Vision</p>
        <div className="flex gap-4">
          <Link href="/about" className="hover:text-gray-900">
            關於
          </Link>
          <Link href="/courses" className="hover:text-gray-900">
            課程
          </Link>
          <a
            href="https://discord.gg/your-invite"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900"
          >
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
