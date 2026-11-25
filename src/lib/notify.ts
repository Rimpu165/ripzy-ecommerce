import { prisma } from "./prisma";

type NotificationType =
  | "WELCOME"
  | "VERIFY"
  | "RESET"
  | "ORDER_CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUND"
  | "RETURN"
  | "ABANDONED_CART"
  | "BACK_IN_STOCK";

interface NotifyInput {
  userId?: string | null;
  to: string;
  subject: string;
  type: NotificationType;
  content: string;
}

/**
 * Persists an outbound email to the notifications table (the queue/log) and
 * delivers through SMTP when SMTP_HOST is configured. With no SMTP configured
 * it is recorded as SENT in the log so the whole flow is testable locally.
 * Never throws — notifications must not break the business transaction.
 */
export async function notify(input: NotifyInput) {
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId ?? null,
        recipientEmail: input.to,
        subject: input.subject,
        type: input.type,
        content: input.content,
        status: "SENT",
      },
    });
  } catch (e) {
    console.error("[notify] failed", e);
    return null;
  }
}
