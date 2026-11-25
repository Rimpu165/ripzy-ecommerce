import { getPublishedPages } from "./marketing";
import { getCommerceConfig } from "./commerce";
import { getSettings } from "./settings";
import { getNavCategories } from "./catalog";
import type { StorefrontConfig } from "./use-storefront";

/** Public storefront config used by the layout (SSR initial data) and /api/storefront. */
export async function getStorefrontConfig(): Promise<StorefrontConfig> {
  const [pages, s, cfg, categories] = await Promise.all([
    getPublishedPages(),
    getSettings(),
    getCommerceConfig(),
    getNavCategories(),
  ]);
  return {
    pages: pages.map((p) => ({ slug: p.slug, title: p.title })),
    categories,
    store: {
      name: s["store.name"],
      supportEmail: s["store.supportEmail"],
      supportPhone: s["store.supportPhone"],
      address: s["store.address"],
      freeShippingThreshold: cfg.freeShippingThreshold,
      returnWindowDays: cfg.returnWindowDays,
    },
  };
}
