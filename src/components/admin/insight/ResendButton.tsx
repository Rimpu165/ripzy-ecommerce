"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { btnGhostCls } from "./ui";

export default function ResendButton({ id, action }: { id: string; action: (id: string) => Promise<{ ok: boolean; error?: string }> }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      className={btnGhostCls}
      onClick={() =>
        start(async () => {
          const r = await action(id);
          if (r.ok) {
            toast.success("Resent. A new log entry was added.");
            router.refresh();
          } else toast.error(r.error || "Resend failed");
        })
      }
    >
      {pending ? "Sending…" : "Resend"}
    </button>
  );
}
