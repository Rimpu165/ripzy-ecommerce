import { z } from "zod";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, sessionCookieOptions, signToken } from "@/lib/auth";
import { handler, parseJson, fail } from "@/lib/api";
import { notify } from "@/lib/notify";
import { publish } from "@/lib/events";
import type { Role } from "@/lib/rbac";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, "Password must be at least 8 characters long and contain at least 1 letter and 1 number."),
  phone: z.string().trim().max(20).optional().nullable(),
});

export const POST = handler({ limit: { max: 10, windowMs: 60 * 60 * 1000, key: "register" } }, async ({ req }) => {
  const { name, email, password, phone } = await parseJson(req, schema);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail(409, "An account with this email address already exists.");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, phone: phone || null, role: "CUSTOMER" },
  });

  await notify({
    userId: user.id,
    to: user.email,
    type: "WELCOME",
    subject: "Welcome to Ripzy!",
    content: `Hi ${user.name}, your Ripzy account is ready. Happy shopping!`,
  });
  publish({ type: "customer.registered", title: "New customer", message: user.email, href: "/admin/customers" });

  const token = signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tv: user.tokenVersion,
  });

  const res = NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions);
  return res;
});
