import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .max(100)
    .optional()
    .or(z.literal("")),
  logo: z
    .string()
    .trim()
    .max(1000)
    .refine((u) => u === "" || /^https?:\/\//i.test(u) || u.startsWith("/"), "Logo URL must start with http(s):// or /")
    .nullable()
    .optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().default(true),
});
