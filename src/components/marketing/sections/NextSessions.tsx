// src/components/marketing/sections/NextSessions.tsx
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { BOOKINGS_SIGN_IN_HREF } from "@/lib/site-links";

export function NextSessions({
  classes,
}: {
  classes: {
    id: string;
    discipline: string;
    title: string;
    room: string;
    day: string;
    time: string;
    durationMin: number;
    coachName: string;
    spotsLeft: number;
  }[];
}) {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 pb-20">
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          NEXT SESSIONS
        </h2>
      </Reveal>
      {classes.length === 0 ? (
        <p className="text-[var(--mut)] text-sm mt-4">Timetable goes live shortly.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {classes.slice(0, 3).map((c, i) => (
            <Reveal key={c.id} delay={i * 0.1}>
              <div className="bg-[var(--card)] border border-[var(--line)] p-5">
                <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                  {c.discipline}
                </div>
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">
                  {c.title}
                </div>
                <div className="text-[var(--mut)] text-xs mt-2">
                  {c.day} {c.time} · {c.room} · {c.coachName}
                </div>
                <div className="text-[var(--red)] text-sm font-semibold mt-3">
                  {c.spotsLeft} spots left
                </div>
                <Link
                  href={BOOKINGS_SIGN_IN_HREF}
                  className="min-h-[44px] inline-flex items-center text-[var(--txt)] text-[10.5px] font-bold uppercase tracking-widest no-underline mt-2"
                >
                  Sign in to book →
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
