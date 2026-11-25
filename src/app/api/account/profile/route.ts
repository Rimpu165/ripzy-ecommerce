import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9 -]{7,15}$/, "Enter a valid phone number.")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const GET = handler({ auth: true }, async ({ user }) => ok({ user }));

export const PATCH = handler({ auth: true }, async ({ user, req }) => {
  const { name, phone } = await parseJson(req, schema);
  const updated = await prisma.user.update({
    where: { id: user!.id },
    data: { name, phone: phone || null },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  return ok({ success: true, user: updated });
});
