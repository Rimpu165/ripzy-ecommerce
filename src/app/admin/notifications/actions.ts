"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

type NotifyType = Parameters<typeof notify>[0]["type"];

export async function resendNotification(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getAdminUser("notifications.view");
  if (!user) return { ok: false, error: "Forbidden" };
  if (!z.string().min(1).max(64).safeParse(id).success) return { ok: false, error: "Invalid id" };
  if (!rateLimit(`notif-resend:${user.id}`, 20, 60_000).ok) return { ok: false, error: "Too many resends. Slow down." };

  const original = await prisma.notification.findUnique({ where: { id } });
  if (!original) return { ok: false, error: "Notification not found" };

  const created = await notify({
    userId: original.userId,
    to: original.recipientEmail,
    subject: original.subject,
    type: original.type as NotifyType,
    content: original.content,
  });
  if (!created) return { ok: false, error: "Resend failed" };
  await audit({
    userId: user.id,
    action: "CREATE",
    entityType: "NOTIFICATION",
    entityId: created.id,
    newValues: { resendOf: original.id, to: original.recipientEmail, type: original.type },
  });
  revalidatePath("/admin/notifications");
  return { ok: true };
}
