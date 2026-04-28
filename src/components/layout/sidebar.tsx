"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "學習總覽", path: "/dashboard" },
  { icon: Settings, label: "設定", path: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 hidden lg:flex flex-col border-r border-outline-variant/30 bg-surface-container-low dark:bg-surface-container-lowest fixed left-0 top-0 pt-24 z-40">
      <div className="flex flex-col gap-2 p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                pathname === item.path
                  ? "bg-surface-container-lowest dark:bg-surface-container-high text-secondary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              )}
            >
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
              {pathname === item.path && (
                <ChevronRight size={16} className="ml-auto" />
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-outline-variant/30 px-4">
          <Link
            href="/dashboard"
            className="signature-gradient text-white w-full py-3 rounded-xl text-sm font-bold shadow-lg hover:brightness-110 transition-all block text-center"
          >
            繼續學習
          </Link>
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-outline-variant/30">
        <Link
          href="/about"
          className="text-on-surface-variant px-4 py-3 hover:bg-surface-container rounded-lg flex items-center gap-3 transition-all"
        >
          <HelpCircle size={20} />
          <span className="text-sm">幫助中心</span>
        </Link>
      </div>
    </aside>
  );
}
