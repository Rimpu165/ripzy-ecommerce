import { z } from "zod";

export const attributeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .max(80)
    .optional()
    .or(z.literal("")),
  values: z.array(z.string().trim().min(1).max(80)).max(200),
});

export function parseValues(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export const dedupeValues = (vals: string[]) => Array.from(new Map(vals.map((v) => [v.toLowerCase(), v])).values());
