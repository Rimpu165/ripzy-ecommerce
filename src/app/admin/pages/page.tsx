import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PagesClient, { type PageRow } from "@/components/admin/marketing/PagesClient";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  if (!(await getAdminUser("pages.manage"))) redirect("/admin");

  const rows = await prisma.page.findMany({ orderBy: { title: "asc" } });
  const pages: PageRow[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    isPublished: p.isPublished,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <PagesClient pages={pages} />;
}
