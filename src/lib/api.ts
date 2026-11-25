import { NextResponse } from "next/server";
import { z, ZodError, type ZodType } from "zod";
import { getAdminUser, getCurrentUser, type CurrentUser } from "./auth";
import type { Permission } from "./rbac";
import { clientIp, rateLimit } from "./rate-limit";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (status: number, error: string, details?: unknown) =>
  NextResponse.json({ error, ...(details ? { details } : {}) }, { status });

/** Same-origin check for state-changing requests (CSRF defence in depth on top of SameSite=Lax). */
function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients / same-origin fetches without Origin
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new ApiError(403, "Cross-origin request blocked.");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(403, "Invalid origin.");
  }
}

export async function parseJson<S extends ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid input.", parsed.error.flatten());
  }
  return parsed.data;
}

interface HandlerOptions {
  /** Require an admin holding this permission. */
  permission?: Permission;
  /** Require any signed-in user. */
  auth?: boolean;
  /** Per-IP rate limit. */
  limit?: { max: number; windowMs: number; key?: string };
}

type Ctx<P> = { user: CurrentUser | null; req: Request; params: P };

/**
 * Wraps a route handler with: origin check, rate limiting, authn/authz,
 * uniform error handling. Usage:
 *   export const POST = handler({ permission: "orders.update" }, async ({ user, req }) => ...)
 */
export function handler<P = Record<string, string>>(
  opts: HandlerOptions,
  fn: (ctx: Ctx<P>) => Promise<Response>
) {
  return async (req: Request, routeCtx?: { params: Promise<P> }): Promise<Response> => {
    try {
      assertSameOrigin(req);

      if (opts.limit) {
        const key = `${opts.limit.key ?? new URL(req.url).pathname}:${clientIp(req)}`;
        const rl = rateLimit(key, opts.limit.max, opts.limit.windowMs);
        if (!rl.ok) {
          return NextResponse.json(
            { error: "Too many requests. Please slow down." },
            { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
          );
        }
      }

      let user: CurrentUser | null = null;
      if (opts.permission) {
        user = await getAdminUser(opts.permission);
        if (!user) {
          const anyUser = await getCurrentUser();
          return fail(anyUser ? 403 : 401, anyUser ? "Forbidden" : "Authentication required");
        }
      } else if (opts.auth) {
        user = await getCurrentUser();
        if (!user) return fail(401, "Authentication required");
      }

      const params = (routeCtx?.params ? await routeCtx.params : {}) as P;
      return await fn({ user, req, params });
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message, e.details);
      if (e instanceof ZodError) return fail(400, e.issues[0]?.message || "Invalid input.");
      console.error(`[api] ${req.method} ${new URL(req.url).pathname}`, e);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}
