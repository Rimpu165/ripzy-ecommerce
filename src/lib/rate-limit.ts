/**
 * Sliding-window in-memory rate limiter. Good for a single Node instance;
 * swap the store for Redis (e.g. Upstash) when running multiple instances.
 */
type Bucket = { hits: number[] };
const g = globalThis as unknown as { __rl?: Map<string, Bucket> };
const store = (g.__rl ??= new Map<string, Bucket>());

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    store.set(key, bucket);
    const retryAfterSec = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    return { ok: false, remaining: 0, retryAfterSec };
  }

  bucket.hits.push(now);
  store.set(key, bucket);

  // opportunistic cleanup so the map cannot grow forever
  if (store.size > 5000) {
    for (const [k, b] of store) {
      if (b.hits.every((t) => now - t > windowMs)) store.delete(k);
    }
  }
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}
