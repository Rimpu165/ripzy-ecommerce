/**
 * Central, validated access to environment variables.
 * In production a missing/weak JWT secret is a hard failure — never fall back
 * to a hard-coded secret on a live server.
 */
const DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production-0000000000";

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("JWT_SECRET must be set (>= 32 chars) in production.");
  }
  return DEV_SECRET;
}

export const env = {
  get jwtSecret() {
    return resolveJwtSecret();
  },
  isProd: process.env.NODE_ENV === "production",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpFrom: process.env.SMTP_FROM || "Ripzy <no-reply@ripzy.com>",
  cronSecret: process.env.CRON_SECRET || "",
};
