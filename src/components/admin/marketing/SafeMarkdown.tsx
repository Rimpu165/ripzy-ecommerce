import React from "react";
import Link from "next/link";

/**
 * Tiny, safe markdown renderer. Supports: # / ## / ### headings, paragraphs, - / * bullet lists,
 * 1. numbered lists, **bold**, *italic*, and [text](url) links (site paths, http(s), mailto only).
 * Everything is rendered as React elements (auto-escaped) - never dangerouslySetInnerHTML.
 */

const SAFE_HREF = /^(\/(?!\/)|https?:\/\/|mailto:)/i;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[2] !== undefined) {
      nodes.push(<strong key={key}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={key}>{m[3]}</em>);
    } else {
      const label = m[4];
      const href = m[5];
      if (!SAFE_HREF.test(href)) {
        nodes.push(label);
      } else if (href.startsWith("/")) {
        nodes.push(
          <Link key={key} href={href} className="font-semibold text-indigo-600 underline hover:text-indigo-700">
            {label}
          </Link>
        );
      } else {
        nodes.push(
          <a
            key={key}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer nofollow"
            className="font-semibold text-indigo-600 underline hover:text-indigo-700"
          >
            {label}
          </a>
        );
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function SafeMarkdown({ source, className = "" }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      const key = `p${k++}`;
      blocks.push(
        <p key={key} className="leading-relaxed text-slate-700">
          {renderInline(para.join(" "), key)}
        </p>
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const key = `l${k++}`;
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag
          key={key}
          className={`space-y-1 pl-5 text-slate-700 ${list.ordered ? "list-decimal" : "list-disc"}`}
        >
          {list.items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `${key}-${idx}`)}</li>
          ))}
        </Tag>
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);

    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      const key = `h${k++}`;
      const level = h[1].length;
      const cls =
        level === 1
          ? "mt-8 text-2xl font-extrabold text-slate-900"
          : level === 2
            ? "mt-6 text-xl font-bold text-slate-900"
            : "mt-4 text-base font-bold text-slate-900";
      // Page title is the H1, so content headings start at H2.
      const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
      blocks.push(
        <Tag key={key} className={cls}>
          {renderInline(h[2], key)}
        </Tag>
      );
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((ul ?? ol)![1]);
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return <div className={`space-y-4 text-sm ${className}`}>{blocks}</div>;
}
