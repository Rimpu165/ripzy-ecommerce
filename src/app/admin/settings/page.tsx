import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SETTING_DEFAULTS } from "@/lib/settings";
import SettingsClient from "@/components/admin/marketing/SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!(await getAdminUser("settings.manage"))) redirect("/admin");

  // Read straight from the DB (not the cache) so the form never shows stale values.
  const rows = await prisma.setting.findMany();
  const initial: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in SETTING_DEFAULTS) initial[r.key] = r.value;

  return <SettingsClient initial={initial} />;
}
