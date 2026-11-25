import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_NAV, can, isAdminRole } from "@/lib/rbac";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ripzy Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect("/login?next=/admin");

  const nav = ADMIN_NAV.filter((n) => can(user.role, n.permission)).map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <AdminShell nav={nav} user={{ name: user.name, role: user.role }}>
      {children}
    </AdminShell>
  );
}
