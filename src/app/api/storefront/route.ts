import { ok } from "@/lib/api";
import { getStorefrontConfig } from "@/lib/storefront";

/** Public, cacheable storefront config for client chrome (navbar + footer). */
export async function GET() {
  return ok(await getStorefrontConfig(), {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
