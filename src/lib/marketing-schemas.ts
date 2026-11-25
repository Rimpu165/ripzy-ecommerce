import { z } from "zod";
import { isSafeUrl } from "./marketing";

const dateStr = z
  .string()
  .trim()
  .min(1)
  .transform((s) => new Date(s))
  .refine((d) => !Number.isNaN(d.getTime()), "Invalid date");

const optDate = z
  .union([dateStr, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v instanceof Date ? v : null));

const optNum = z.union([z.number(), z.null()]).optional();

export const couponBase = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Code must be 3-30 characters: A-Z, 0-9, - or _")),
  description: z.string().trim().max(200).optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce.number().positive("Discount value must be greater than 0"),
  minOrderAmount: z.coerce.number().min(0, "Minimum order cannot be negative").default(0),
  maxDiscountAmount: optNum,
  startsAt: dateStr.optional(),
  expiresAt: optDate,
  usageLimitTotal: z.union([z.number().int().min(1, "Total usage limit must be at least 1"), z.null()]).optional(),
  usageLimitPerUser: z.coerce.number().int().min(1, "Per-user limit must be at least 1").default(1),
  isActive: z.boolean().default(true),
});

export const couponSchema = couponBase.superRefine((c, ctx) => {
  if (c.discountType === "PERCENTAGE" && (c.discountValue < 1 || c.discountValue > 100)) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage must be between 1 and 100" });
  }
  if (c.maxDiscountAmount != null && c.maxDiscountAmount <= 0) {
    ctx.addIssue({ code: "custom", path: ["maxDiscountAmount"], message: "Max discount must be greater than 0" });
  }
  if (c.expiresAt && c.startsAt && c.expiresAt <= c.startsAt) {
    ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiry must be after the start date" });
  }
});

const safeUrl = z.string().trim().max(500).refine(isSafeUrl, "Must be a site path (/...) or an http(s) URL");

export const bannerSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    subtitle: z.string().trim().max(300).optional().nullable(),
    imageUrl: safeUrl,
    linkUrl: z.union([safeUrl, z.literal(""), z.null()]).optional(),
    badge: z.string().trim().max(40).optional().nullable(),
    sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
    isActive: z.boolean().default(true),
    startsAt: dateStr.optional(),
    endsAt: optDate,
  })
  .superRefine((b, ctx) => {
    if (b.endsAt && b.startsAt && b.endsAt <= b.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after the start" });
    }
  });

export const pageSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and hyphens only").min(2).max(80)),
  content: z.string().max(50_000, "Content is too long"),
  isPublished: z.boolean().default(true),
});

const nonNeg = (label: string) =>
  z.coerce.number({ message: `${label} must be a number` }).min(0, `${label} cannot be negative`);

export const settingsSchema = z
  .object({
    "store.name": z.string().trim().min(1, "Store name is required").max(80),
    "store.supportEmail": z.string().trim().email("Enter a valid support email"),
    "store.supportPhone": z.string().trim().min(3, "Support phone is required").max(30),
    "store.gstin": z
      .string()
      .trim()
      .toUpperCase()
      .pipe(z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN")),
    "store.address": z.string().trim().min(1, "Address is required").max(300),
    "shipping.freeThreshold": nonNeg("Free shipping threshold"),
    "shipping.flatFee": nonNeg("Flat shipping fee"),
    "order.returnWindowDays": nonNeg("Return window").pipe(z.number().int("Return window must be a whole number").max(365)),
    "order.stockReservationMinutes": nonNeg("Reservation time").pipe(
      z.number().int("Reservation time must be a whole number").min(1, "Reservation time must be at least 1 minute").max(1440)
    ),
    "order.codEnabled": z.boolean(),
    "order.codMaxAmount": nonNeg("COD limit"),
    "catalog.lowStockThreshold": nonNeg("Low stock threshold").pipe(z.number().int("Low stock threshold must be a whole number")),
    "maintenance.enabled": z.boolean(),
  })
  .strict();
