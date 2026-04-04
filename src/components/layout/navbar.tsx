"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const isDark =
    pathname === "/" || pathname === "/pricing" || theme === "dark";

  return (
    <nav
      className={cn(
        "fixed top-0 w-full z-50 h-20 transition-all duration-300",
        isDark
          ? "bg-[#0A192F]/80 backdrop-blur-xl"
          : "bg-surface-container-lowest/80 backdrop-blur-xl shadow-sm"
      )}
    >
      <div className="flex justify-between items-center max-w-7xl mx-auto px-8 h-full">
        <Link href="/" className="flex items-center gap-2">
          <span
            className={cn(
              "text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r",
              isDark
                ? "from-white to-[#00D2FF]"
                : "from-on-background to-secondary"
            )}
          >
            牛津視界 Oxford Vision
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-10 font-medium text-sm tracking-tight">
          {[
            { href: "/courses", label: "課程" },
            { href: "/about", label: "關於我們" },
            { href: "/insights", label: "最新內容" },
            { href: "/pricing", label: "方案" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors duration-300",
                isDark
                  ? "text-slate-300 hover:text-[#00D2FF]"
                  : "text-on-surface-variant hover:text-secondary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isDark
                ? "text-slate-300 hover:text-[#00D2FF]"
                : "text-on-surface-variant hover:text-secondary"
            )}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link
            href="/dashboard"
            className={cn(
              "px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 active:scale-95",
              isDark
                ? "bg-[#00D2FF] text-[#0A192F] hover:opacity-90"
                : "signature-gradient text-white hover:opacity-90"
            )}
          >
            我的學習
          </Link>
        </div>
      </div>
    </nav>
  );
}
