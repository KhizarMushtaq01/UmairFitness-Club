// src/components/marketing/sections/Disciplines.tsx
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";

const DISCIPLINES = [
  {
    name: "BOXING",
    blurb: "Footwork, guard, and combinations. Pad work every session, sparring when you are ready — never before.",
    detail: "Ring 1 · 60 min",
  },
  {
    name: "MUAY THAI",
    blurb: "Eight points of contact. Clinch work, knees and elbows, shin conditioning built up over weeks, not days.",
    detail: "Ring 2 · 60 min",
  },
  {
    name: "STRENGTH",
    blurb: "Barbell work on a written block. Squat, press, pull, hinge — loads that move up because they are tracked.",
    detail: "Platform floor · 75 min",
  },
] as const;

export function Disciplines() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-20" style={{ perspective: "1000px" }}>
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          WHAT WE TRAIN
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {DISCIPLINES.map((d, i) => (
          <Reveal key={d.name} delay={i * 0.1}>
            <TiltCard className="bg-[var(--card)] border border-[var(--line)] p-6 h-full">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-[28px]">
                {d.name}
              </div>
              <div className="text-[var(--red)] text-[10.5px] font-semibold tracking-[.18em] uppercase mt-1">
                {d.detail}
              </div>
              <p className="text-[var(--mut)] text-sm mt-4">{d.blurb}</p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
