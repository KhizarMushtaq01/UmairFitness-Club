// src/components/marketing/sections/Faq.tsx
import { Reveal } from "@/components/marketing/Reveal";

const FAQS = [
  ["Do I need experience?", "No. Most people who walk in have never thrown a punch. Beginners get taught the basics before anything else."],
  ["What should I bring?", "Training clothes, a water bottle, and a towel. We have gloves and wraps you can borrow for your first few sessions."],
  ["Is there a trial?", "Yes — your first session is free, and you can cancel a new membership within fourteen days if you have not used the gym."],
  ["Will I have to spar?", "Only when you and your coach agree you are ready, and never as a condition of membership."],
  ["Can I freeze my plan?", "Any plan can be frozen for up to one month a year at no charge."],
  ["What are the hours?", "Monday to Saturday 06:00–23:00, Sunday 08:00–20:00."],
] as const;

export function Faq() {
  return (
    <section className="max-w-[760px] mx-auto px-4 md:px-7 py-20">
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          QUESTIONS
        </h2>
      </Reveal>
      <dl className="mt-8">
        {FAQS.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.05}>
            <div className="border-b border-[var(--line)] py-5">
              <dt className="font-semibold text-sm">{q}</dt>
              <dd className="text-[var(--mut)] text-sm mt-2">{a}</dd>
            </div>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
