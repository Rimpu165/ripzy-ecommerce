import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/marketing";
import SafeMarkdown from "@/components/admin/marketing/SafeMarkdown";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page || !page.isPublished) return { title: "Page not found", robots: { index: false } };
  const plain = page.content.replace(/[#*\[\]()>`-]/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: page.title,
    description: plain.slice(0, 160) || undefined,
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page || !page.isPublished) notFound();

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mx-auto mb-4 max-w-3xl text-xs text-slate-500">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/" className="hover:text-indigo-600">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-700">{page.title}</li>
        </ol>
      </nav>
      <article className="card mx-auto max-w-3xl p-6 sm:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{page.title}</h1>
        <p className="mt-2 border-b border-slate-100 pb-5 text-xs text-slate-500">
          Last updated {new Date(page.updatedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
        </p>
        <div className="mt-6 space-y-4 text-base leading-7 text-slate-700 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-slate-900 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          <SafeMarkdown source={page.content} />
        </div>
      </article>
    </div>
  );
}
