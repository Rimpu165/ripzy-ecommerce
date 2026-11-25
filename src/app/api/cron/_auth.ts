import crypto from "crypto";
import { env } from "@/lib/env";
import { fail } from "@/lib/api";

/** Returns an error Response when the cron request is not authorised, otherwise null. */
export function cronGuard(req: Request): Response | null {
  const secret = env.cronSecret;
  if (!secret) {
    if (env.isProd) return fail(503, "CRON_SECRET is not configured.");
    return null; // open in local development only
  }
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(401, "Unauthorized");
  return null;
}
