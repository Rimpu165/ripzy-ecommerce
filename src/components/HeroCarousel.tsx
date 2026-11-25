"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Tag } from "lucide-react";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  linkUrl?: string | null;
  imageUrl: string;
}

const AUTOPLAY_MS = 6000;

function CtaLink({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = "btn bg-white text-slate-900 shadow-subtle hover:bg-slate-100";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function HeroCarousel({ slides, promoCode }: { slides: HeroSlide[]; promoCode?: string }) {
  const count = slides.length;
  const [rawIndex, setIndex] = useState(0);
  const index = rawIndex < count ? rawIndex : 0; // stays valid if the slide list shrinks
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduceMotion = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  const paused = hovered || focused || userPaused || reduceMotion;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  const arrow =
    "absolute top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/60 bg-white/90 p-2 text-slate-700 shadow-subtle hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:flex";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="container-page pt-4 sm:pt-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:min-h-[400px] lg:min-h-[440px]">
        <div aria-live={paused ? "polite" : "off"}>
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <div
                key={s.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!active}
                inert={!active}
                className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
                  active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.imageUrl}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-slate-900/45" />

                <div className="relative z-10 max-w-xl space-y-4 p-6 pb-16 sm:p-10 sm:pb-16 lg:p-14">
                  {s.badge && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">
                      {s.badge}
                    </span>
                  )}
                  {i === 0 ? (
                    <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">{s.title}</h1>
                  ) : (
                    <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">{s.title}</h2>
                  )}
                  {s.subtitle && <p className="max-w-md text-sm leading-relaxed text-slate-100 sm:text-base">{s.subtitle}</p>}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <CtaLink href={s.linkUrl || "/products"}>
                      Shop now
                      <ArrowRight className="h-4 w-4" />
                    </CtaLink>
                    {promoCode && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-xs font-medium text-white ring-1 ring-white/30">
                        <Tag className="h-3.5 w-3.5" />
                        Use code <strong className="font-semibold">{promoCode}</strong> for 10% off
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className={`${arrow} left-3`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className={`${arrow} right-3`}>
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? "Resume slideshow" : "Pause slideshow"}
                className="rounded-full bg-white/90 p-1.5 text-slate-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                {userPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <div className="flex items-center gap-2" role="group" aria-label="Choose slide">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Go to slide ${i + 1}: ${s.title}`}
                    aria-current={i === index ? "true" : undefined}
                    className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                      i === index ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/90"
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
