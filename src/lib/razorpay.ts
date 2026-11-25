import crypto from "crypto";
import { env } from "./env";

export interface RefundResult {
  id: string;
  status: string;
  simulated: boolean;
}

export const razorpayConfigured = () => !!(env.razorpayKeyId && env.razorpayKeySecret);

/**
 * Refund a captured Razorpay payment (amount in INR, converted to paise).
 * With RAZORPAY_KEY_ID/SECRET set this calls the real REST API; otherwise it
 * returns a simulated success so the flow is testable locally.
 * Throws on gateway failure.
 */
export async function refundPayment(input: {
  paymentId: string | null;
  amount: number;
  notes?: Record<string, string>;
}): Promise<RefundResult> {
  if (!razorpayConfigured() || !input.paymentId || input.paymentId.startsWith("mock_")) {
    return { id: `rfnd_sim_${crypto.randomBytes(7).toString("hex")}`, status: "processed", simulated: true };
  }
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(input.paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(input.amount * 100), speed: "normal", notes: input.notes ?? {} }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; status?: string; error?: { description?: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.description || `Razorpay refund failed (${res.status})`);
  }
  return { id: data.id, status: data.status || "pending", simulated: false };
}

/** Constant-time HMAC-SHA256 verification of a Razorpay webhook body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
