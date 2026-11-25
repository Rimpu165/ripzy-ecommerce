import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Compass className="h-7 w-7" />
      </span>
      <p className="mt-4 text-sm font-semibold text-indigo-600">Error 404</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Page not found</h1>
      <p className="mt-3 text-sm text-slate-500">The page you are looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn-primary">
          Browse products
        </Link>
        <Link href="/" className="btn-secondary">
          <Home className="h-4 w-4" /> Go home
        </Link>
      </div>
    </div>
  );
}
