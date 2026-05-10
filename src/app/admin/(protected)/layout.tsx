import { redirect } from "next/navigation";
import { getAdminActor, isAdmin } from "@/lib/admin-auth";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  roles: Array<"superadmin" | "admin" | "instructor">;
}> = [
  { href: "/admin", label: "總覽", roles: ["superadmin", "admin", "instructor"] },
  { href: "/admin/courses", label: "課程管理", roles: ["superadmin", "admin"] },
  { href: "/admin/orders", label: "訂單", roles: ["superadmin", "admin", "instructor"] },
  { href: "/admin/email", label: "Email", roles: ["superadmin", "admin", "instructor"] },
  { href: "/admin/insights", label: "Insights", roles: ["superadmin", "admin"] },
  { href: "/admin/knowledge", label: "知識庫", roles: ["superadmin", "admin"] },
  { href: "/admin/dungeons", label: "副本", roles: ["superadmin", "admin"] },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  const actor = await getAdminActor();
  // role 為 "user" 不該到這(isAdmin 已擋),但保險:預設給 superadmin 視角(legacy ADMIN_PASSWORD 也是 superadmin)
  const role =
    actor?.role === "instructor" || actor?.role === "admin" || actor?.role === "superadmin"
      ? actor.role
      : "superadmin";
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              OV
            </div>
            <span className="font-bold text-white">牛津視界 — 後台管理</span>
            {role === "instructor" && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                講師
              </span>
            )}
          </div>
          <nav className="flex items-center gap-5 text-sm flex-wrap">
            {visibleNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/api/admin/logout"
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              登出
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
