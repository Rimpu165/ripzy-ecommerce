/**
 * Tiny in-process realtime bus that feeds the admin Server-Sent-Events stream
 * (/api/admin/stream). Single-instance by design; replace with Redis pub/sub
 * for horizontally scaled deployments.
 */
export type RealtimeEvent = {
  type:
    | "order.created"
    | "order.updated"
    | "stock.low"
    | "review.created"
    | "return.requested"
    | "customer.registered";
  title: string;
  message?: string;
  href?: string;
  at: string;
};

type Listener = (e: RealtimeEvent) => void;
const g = globalThis as unknown as { __rtListeners?: Set<Listener> };
const listeners = (g.__rtListeners ??= new Set<Listener>());

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publish(e: Omit<RealtimeEvent, "at">) {
  const evt: RealtimeEvent = { ...e, at: new Date().toISOString() };
  for (const l of listeners) {
    try {
      l(evt);
    } catch {
      /* ignore dead listener */
    }
  }
}
