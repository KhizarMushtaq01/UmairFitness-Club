import Link from "next/link";
import { getPublicClasses, getPublicPlans } from "@/features/marketing/queries";

// Reads live data (classes, plans), so this page must not be statically
// prerendered — an admin's changes need to show up without a redeploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [classes, plans] = await Promise.all([getPublicClasses(), getPublicPlans()]);

  return (
    <>
      <section className="max-w-[1200px] mx-auto px-4 md:px-7 pt-16 pb-20 md:pt-28 md:pb-28">
        <p className="text-[10.5px] font-semibold tracking-[.26em] uppercase text-[var(--red)]">
          Karachi · Est. 2026
        </p>
        <h1
          style={{ fontFamily: "var(--font-display)" }}
          className="text-[48px] sm:text-[72px] lg:text-[96px] leading-[0.95] mt-4"
        >
          TRAIN LIKE
          <br />
          IT MATTERS
        </h1>
        <p className="text-[var(--mut)] text-base mt-6 max-w-[520px]">
          Boxing, Muay Thai and strength coaching for people who want a plan, not
          a treadmill. Every member gets a programme, a coach, and a number to hit.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link
            href="/pricing"
            className="bg-[var(--red)] text-white px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline text-center"
          >
            See plans
          </Link>
          <Link
            href="/classes"
            className="border border-[var(--line2)] text-[var(--txt)] px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline text-center"
          >
            Class timetable
          </Link>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 md:px-7 pb-20">
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          NEXT SESSIONS
        </h2>
        {classes.length === 0 ? (
          <p className="text-[var(--mut)] text-sm mt-4">Timetable goes live shortly.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {classes.slice(0, 3).map((c) => (
              <div key={c.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
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
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-[1200px] mx-auto px-4 md:px-7 pb-20">
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          MEMBERSHIP
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {plans.map((p) => (
            <div key={p.plan} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl">
                {p.plan}
              </div>
              <div className="text-[var(--red)] text-lg font-semibold mt-2">{p.price}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
