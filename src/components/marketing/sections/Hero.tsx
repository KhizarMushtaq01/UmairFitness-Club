// src/components/marketing/sections/Hero.tsx
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { ParallaxImage } from "@/components/marketing/ParallaxImage";
import { SITE_IMAGES } from "@/lib/images";

export function Hero() {
  return (
    <section className="relative" style={{ perspective: "1000px" }}>
      {/* priority: this is the largest paint above the fold, so it must not
          wait behind the lazy-loading queue. */}
      <ParallaxImage
        src={SITE_IMAGES.hero.url}
        alt={SITE_IMAGES.hero.alt}
        priority
        overlay={0.62}
        sizes="100vw"
        className="absolute inset-0"
      />

      <div className="relative max-w-[1200px] mx-auto px-4 md:px-7 pt-16 pb-20 md:pt-28 md:pb-28">
        <Reveal>
          <p className="text-[10.5px] font-semibold tracking-[.26em] uppercase text-[var(--red)]">
            Karachi · Est. 2026
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[48px] sm:text-[72px] lg:text-[96px] leading-[0.95] mt-4"
          >
            TRAIN LIKE
            <br />
            IT MATTERS
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="text-[var(--mut)] text-base mt-6 max-w-[520px]">
            Boxing, Muay Thai and strength coaching for people who want a plan,
            not a treadmill. Every member gets a programme, a coach, and a number
            to hit.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              href="/pricing"
              className="min-h-[44px] inline-flex items-center justify-center bg-[var(--red)] text-white px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
            >
              See plans
            </Link>
            <Link
              href="/classes"
              className="min-h-[44px] inline-flex items-center justify-center border border-[var(--line2)] text-[var(--txt)] px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
            >
              Class timetable
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
