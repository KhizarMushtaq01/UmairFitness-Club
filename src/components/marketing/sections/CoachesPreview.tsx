// src/components/marketing/sections/CoachesPreview.tsx
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";

export function CoachesPreview({
  trainers,
}: {
  trainers: { id: string; name: string; classCount: number; programCount: number }[];
}) {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-20" style={{ perspective: "1000px" }}>
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            YOUR COACHES
          </h2>
          <Link
            href="/trainers"
            className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
          >
            All coaches →
          </Link>
        </div>
      </Reveal>
      {trainers.length === 0 ? (
        <p className="text-[var(--mut)] text-sm mt-6">Coach profiles going up soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {trainers.slice(0, 3).map((t, i) => (
            <Reveal key={t.id} delay={i * 0.1}>
              <TiltCard className="bg-[var(--card)] border border-[var(--line)] p-6 h-full">
                <div className="w-14 h-14 bg-[var(--red)] text-white grid place-items-center text-lg font-bold">
                  {t.name.split(" ").map((p) => p[0]).join("")}
                </div>
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-4">
                  {t.name}
                </div>
                <div className="text-[var(--mut)] text-xs mt-2">
                  {t.classCount} classes · {t.programCount} programmes
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
