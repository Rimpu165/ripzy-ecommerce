import { getAdminUser } from "@/lib/auth";
import { subscribe, type RealtimeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-Sent Events feed of live store activity for the admin panel. */
export async function GET(req: Request) {
  const user = await getAdminUser("dashboard.view");
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* closed */
        }
      };
      send(`retry: 3000\n\n`);
      send(`event: ready\ndata: {}\n\n`);
      unsubscribe = subscribe((e: RealtimeEvent) => send(`event: activity\ndata: ${JSON.stringify(e)}\n\n`));
      heartbeat = setInterval(() => send(`: ping\n\n`), 25000);

      req.signal.addEventListener("abort", () => {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
