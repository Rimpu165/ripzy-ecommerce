import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { pageSchema } from "@/lib/marketing-schemas";

export const GET = handler({ permission: "pages.manage" }, async () => {
  const pages = await prisma.page.findMany({ orderBy: { title: "asc" } });
  return ok({ pages });
});

export const POST = handler({ permission: "pages.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const d = await parseJson(req, pageSchema);
  if (await prisma.page.findUnique({ where: { slug: d.slug } })) return fail(409, `Slug "${d.slug}" is already in use.`);
  try {
    const page = await prisma.page.create({ data: d });
    revalidateTag("pages", "max");
    await audit({ userId: user!.id, action: "CREATE", entityType: "Page", entityId: page.id, newValues: page, req });
    return ok({ page }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, `Slug "${d.slug}" is already in use.`);
    throw e;
  }
});
