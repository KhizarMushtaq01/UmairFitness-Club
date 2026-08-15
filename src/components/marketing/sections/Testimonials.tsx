// src/components/marketing/sections/Testimonials.tsx
import { Reveal } from "@/components/marketing/Reveal";

/**
 * PLACEHOLDER COPY — REPLACE BEFORE LAUNCH.
 *
 * The database holds no reviews. These are written examples that exist to
 * show the layout, not real member feedback. Swap them for genuine quotes
 * (with permission) before this site goes public, or delete the section.
 */
const PLACEHOLDER_TESTIMONIALS = [
  {
    quote: "I had trained for years without a plan. Six weeks here and I finally knew what I was working towards.",
    who: "Bilal — Strength",
  },
  {
    quote: "The coaching is the difference. Someone actually watches your form and tells you what to fix.",
    who: "Sana — Muay Thai",
  },
  {
    quote: "Nobody pushed me into sparring. When I did step in, I was ready for it.",
    who: "Hamza — Boxing",
  },
] as const;

export function Testimonials() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--panel)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-20">
        <Reveal>
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            WHAT MEMBERS SAY
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {PLACEHOLDER_TESTIMONIALS.map((t, i) => (
            <Reveal key={t.who} delay={i * 0.1}>
              <blockquote className="bg-[var(--card)] border border-[var(--line)] p-6 h-full flex flex-col">
                <div className="text-[var(--red)] text-[32px] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
                  &ldquo;
                </div>
                <p className="text-[var(--mut)] text-sm flex-1">{t.quote}</p>
                <footer className="text-[var(--dim)] text-xs mt-4 uppercase tracking-widest">{t.who}</footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
