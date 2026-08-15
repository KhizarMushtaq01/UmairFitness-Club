// src/components/marketing/sections/FinalCta.tsx
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { ParallaxImage } from "@/components/marketing/ParallaxImage";
import { SITE_IMAGES } from "@/lib/images";

export function FinalCta() {
  return (
    <section className="relative border-t border-[var(--line)]">
      <ParallaxImage
        src={SITE_IMAGES.finalCta.url}
        alt={SITE_IMAGES.finalCta.alt}
        overlay={0.68}
        sizes="100vw"
        className="absolute inset-0"
      />

      <div className="relative max-w-[1200px] mx-auto px-4 md:px-7 py-24 text-center">
        <Reveal>
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[40px] sm:text-[64px] leading-[0.95]"
          >
            FIRST SESSION
            <br />
            IS ON US
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-[var(--mut)] text-base mt-6 max-w-[420px] mx-auto">
            Come in, get assessed, train once. Decide afterwards.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link
              href="/contact"
              className="min-h-[44px] inline-flex items-center justify-center bg-[var(--red)] text-white px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
            >
              Book your session
            </Link>
            <Link
              href="/pricing"
              className="min-h-[44px] inline-flex items-center justify-center border border-[var(--line2)] text-[var(--txt)] px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
            >
              See plans
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
