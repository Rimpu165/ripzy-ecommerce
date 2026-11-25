import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline — Ripzy" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <WifiOff className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">You&apos;re offline</h1>
      <p className="mt-3 text-sm text-slate-500">
        Check your connection and try again. Pages you visited recently are still available.
      </p>
    </div>
  );
}
