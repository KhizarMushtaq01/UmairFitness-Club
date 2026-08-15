// src/components/marketing/sections/StatsBar.tsx
import { Reveal } from "@/components/marketing/Reveal";

export function StatsBar({
  stats,
}: {
  stats: { memberCount: number; classCount: number; coachCount: number };
}) {
  const cells = [
    { label: "Members training", value: String(stats.memberCount) },
    { label: "Classes a week", value: String(stats.classCount) },
    { label: "Coaches on the floor", value: String(stats.coachCount) },
    { label: "Disciplines", value: "3" },
  ];

  return (
    <section className="border-y border-[var(--line)] bg-[var(--panel)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {cells.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.08}>
            <div style={{ fontFamily: "var(--font-heading)" }} className="text-[40px] leading-none">
              {c.value}
            </div>
            <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)] mt-2">
              {c.label}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
