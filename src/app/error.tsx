"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-slate-500">
        We hit an unexpected error. Please try again. If it keeps happening, contact support
        {error.digest ? ` with reference ${error.digest}` : ""}.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go home
        </Link>
      </div>
    </div>
  );
}
