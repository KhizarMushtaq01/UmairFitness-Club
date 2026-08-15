// src/components/marketing/sections/HowItWorks.tsx
import { Reveal } from "@/components/marketing/Reveal";

const STEPS = [
  ["01", "Assessment", "You come in, we test where you are and what you want. No sales pitch."],
  ["02", "Programme", "A coach writes you a block — sets, loads, tempo, the lot. It is yours, not a template."],
  ["03", "Review", "Adherence gets tracked. The block gets adjusted, not repeated."],
] as const;

export function HowItWorks() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--panel)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-20">
        <Reveal>
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            HOW IT WORKS
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
          {STEPS.map(([n, title, body], i) => (
            <Reveal key={n} delay={i * 0.1}>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-[var(--red)] text-[32px] leading-none">
                {n}
              </div>
              <div className="font-semibold text-sm mt-3">{title}</div>
              <p className="text-[var(--mut)] text-sm mt-2">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
