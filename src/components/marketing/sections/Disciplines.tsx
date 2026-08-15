// src/components/marketing/sections/Disciplines.tsx
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";
import { DISCIPLINE_IMAGES } from "@/lib/images";

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
        {DISCIPLINES.map((d, i) => {
          const img = DISCIPLINE_IMAGES[d.name];
          return (
            <Reveal key={d.name} delay={i * 0.1}>
              <TiltCard className="bg-[var(--card)] border border-[var(--line)] h-full flex flex-col">
                <div className="relative h-[180px] overflow-hidden">
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div style={{ fontFamily: "var(--font-heading)" }} className="text-[28px]">
                    {d.name}
                  </div>
                  <div className="text-[var(--red)] text-[10.5px] font-semibold tracking-[.18em] uppercase mt-1">
                    {d.detail}
                  </div>
                  <p className="text-[var(--mut)] text-sm mt-4 flex-1">{d.blurb}</p>
                  <Link
                    href="/classes"
                    className="min-h-[44px] inline-flex items-center text-[var(--txt)] text-xs uppercase tracking-widest no-underline mt-4"
                  >
                    See the timetable →
                  </Link>
                </div>
              </TiltCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
