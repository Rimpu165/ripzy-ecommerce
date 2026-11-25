import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { uniqueSlug } from "@/lib/catalog";
import { handleStockChange } from "@/lib/stock-alerts";

const imageUrl = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .refine((u) => /^https?:\/\//i.test(u) || u.startsWith("/"), "Image URL must start with http(s):// or /");

export const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1, "SKU is required").max(64),
  title: z.string().trim().min(1, "Variant title is required").max(120),
  price: z.number().positive("Price must be greater than 0").max(10_000_000),
  compareAtPrice: z.number().positive().max(10_000_000).nullable().optional(),
  stock: z.number().int("Stock must be a whole number").min(0, "Stock cannot be negative").max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(100000).default(5),
  attributes: z.record(z.string().trim().min(1).max(60), z.string().trim().max(120)).default({}),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
      .max(100)
      .optional()
      .or(z.literal("")),
    description: z.string().trim().min(1, "Description is required").max(20000),
    shortDescription: z.string().trim().max(500).nullable().optional(),
    brandId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    taxRate: z.number().min(0).max(100),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    isFeatured: z.boolean().default(false),
    metaTitle: z.string().trim().max(120).nullable().optional(),
    metaDescription: z.string().trim().max(320).nullable().optional(),
    variants: z.array(variantSchema).min(1, "Add at least one variant").max(100),
    images: z
      .array(z.object({ url: imageUrl, altText: z.string().trim().max(200).nullable().optional(), isPrimary: z.boolean().optional() }))
      .max(20)
      .default([]),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.variants.forEach((x, i) => {
      const k = x.sku.toLowerCase();
      if (seen.has(k)) ctx.addIssue({ code: "custom", message: `Duplicate SKU "${x.sku}" in this product`, path: ["variants", i, "sku"] });
      seen.add(k);
      if (x.compareAtPrice != null && x.compareAtPrice < x.price) {
        ctx.addIssue({ code: "custom", message: `MRP must be >= selling price (${x.sku})`, path: ["variants", i, "compareAtPrice"] });
      }
    });
  });

export type ProductInput = z.infer<typeof productSchema>;

const nn = (s?: string | null) => (s && s.trim() ? s.trim() : null);

export async function saveProduct(input: ProductInput, actor: string, existingId?: string) {
  const existing = existingId
    ? await prisma.product.findFirst({ where: { id: existingId, deletedAt: null }, include: { variants: true } })
    : null;
  if (existingId && !existing) throw new ApiError(404, "Product not found");

  if (input.brandId && !(await prisma.brand.findUnique({ where: { id: input.brandId }, select: { id: true } })))
    throw new ApiError(400, "Selected brand does not exist");
  if (input.categoryId && !(await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } })))
    throw new ApiError(400, "Selected category does not exist");

  // Slug
  let slug: string;
  if (input.slug) {
    const clash = await prisma.product.findFirst({
      where: { slug: input.slug, ...(existingId ? { id: { not: existingId } } : {}) },
      select: { id: true },
    });
    if (clash) throw new ApiError(409, `Slug "${input.slug}" is already used by another product`);
    slug = input.slug;
  } else {
    slug = existing?.slug ?? (await uniqueSlug("product", input.name));
  }

  // SKU uniqueness against other products' variants
  const ownIds = input.variants.map((v) => v.id).filter(Boolean) as string[];
  const skuClash = await prisma.productVariant.findFirst({
    where: { sku: { in: input.variants.map((v) => v.sku) }, ...(ownIds.length ? { id: { notIn: ownIds } } : {}) },
    select: { sku: true },
  });
  if (skuClash) throw new ApiError(409, `SKU "${skuClash.sku}" is already in use`);

  const existingById = new Map((existing?.variants ?? []).map((v) => [v.id, v]));
  for (const v of input.variants) {
    if (v.id && !existingById.has(v.id)) throw new ApiError(400, `Variant ${v.sku} does not belong to this product`);
  }

  // Variants removed by the editor: block if any order references them
  const keepIds = new Set(ownIds);
  const removed = (existing?.variants ?? []).filter((v) => !keepIds.has(v.id));
  for (const v of removed) {
    const refs = await prisma.orderItem.count({ where: { variantId: v.id } });
    if (refs > 0) {
      throw new ApiError(
        409,
        `Variant "${v.sku}" is referenced by ${refs} order line(s) and cannot be deleted. Keep it and set its stock to 0 instead.`
      );
    }
  }

  const increases: { variantId: string; prevAvailable: number }[] = [];

  const productData = {
    name: input.name,
    slug,
    description: input.description,
    shortDescription: nn(input.shortDescription),
    brandId: input.brandId || null,
    categoryId: input.categoryId || null,
    taxRate: input.taxRate,
    status: input.status,
    isFeatured: input.isFeatured,
    metaTitle: nn(input.metaTitle),
    metaDescription: nn(input.metaDescription),
  };

  try {
    const product = await prisma.$transaction(
      async (tx) => {
        const p = existing
          ? await tx.product.update({ where: { id: existing.id }, data: productData })
          : await tx.product.create({ data: productData });

        for (const v of removed) {
          await tx.cartItem.deleteMany({ where: { variantId: v.id } });
          await tx.productImage.updateMany({ where: { variantId: v.id }, data: { variantId: null } });
          await tx.productVariant.delete({ where: { id: v.id } });
        }

        for (const v of input.variants) {
          const base = {
            sku: v.sku,
            title: v.title,
            price: v.price,
            compareAtPrice: v.compareAtPrice ?? null,
            lowStockThreshold: v.lowStockThreshold,
            attributes: Object.keys(v.attributes).length ? JSON.stringify(v.attributes) : null,
          };
          const prev = v.id ? existingById.get(v.id) : undefined;
          if (prev) {
            if (v.stock < prev.reservedStock) {
              throw new ApiError(409, `Stock for ${v.sku} cannot be below its ${prev.reservedStock} reserved units`);
            }
            await tx.productVariant.update({ where: { id: prev.id }, data: { ...base, stock: v.stock } });
            const delta = v.stock - prev.stock;
            if (delta !== 0) {
              await tx.inventoryLedger.create({
                data: {
                  variantId: prev.id,
                  changeQty: delta,
                  previousStock: prev.stock,
                  newStock: v.stock,
                  reason: "MANUAL_ADJUSTMENT",
                  referenceId: `PRODUCT-EDIT-${p.slug}`,
                  createdBy: actor,
                },
              });
              if (delta > 0) increases.push({ variantId: prev.id, prevAvailable: prev.stock - prev.reservedStock });
            }
          } else {
            const created = await tx.productVariant.create({ data: { ...base, productId: p.id, stock: v.stock } });
            if (v.stock > 0) {
              await tx.inventoryLedger.create({
                data: {
                  variantId: created.id,
                  changeQty: v.stock,
                  previousStock: 0,
                  newStock: v.stock,
                  reason: "MANUAL_ADJUSTMENT",
                  referenceId: `PRODUCT-CREATE-${p.slug}`,
                  createdBy: actor,
                },
              });
              increases.push({ variantId: created.id, prevAvailable: 0 });
            }
          }
        }

        // Image gallery: replace wholesale, exactly one primary.
        await tx.productImage.deleteMany({ where: { productId: p.id } });
        if (input.images.length) {
          const primaryIdx = Math.max(input.images.findIndex((i) => i.isPrimary), 0);
          await tx.productImage.createMany({
            data: input.images.map((img, i) => ({
              productId: p.id,
              url: img.url,
              altText: nn(img.altText) ?? input.name,
              sortOrder: i,
              isPrimary: i === primaryIdx,
            })),
          });
        }
        return p;
      },
      { timeout: 20_000 }
    );

    for (const inc of increases) await handleStockChange(inc.variantId, inc.prevAvailable);
    return { product, previousSlug: existing?.slug, created: !existing };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "A unique value (slug or SKU) is already in use");
    }
    throw e;
  }
}
