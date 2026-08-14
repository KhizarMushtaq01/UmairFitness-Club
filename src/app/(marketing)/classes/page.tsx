import { getPublicClasses } from "@/features/marketing/queries";

// Reads live data, so this page must not be statically prerendered — an
// admin's changes need to show up without a redeploy.
export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const classes = await getPublicClasses();

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        TIMETABLE
      </h1>
      {classes.length === 0 ? (
        <p className="text-[var(--mut)] mt-6">No classes scheduled yet — check back shortly.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {classes.map((c) => (
            <div key={c.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                {c.discipline}
              </div>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">
                {c.title}
              </div>
              <div className="text-[var(--mut)] text-xs mt-2">
                {c.day} {c.time} · {c.durationMin} min · {c.room}
              </div>
              <div className="text-[var(--dim)] text-xs mt-1">Coach {c.coachName}</div>
              <div className="text-[var(--red)] text-sm font-semibold mt-3">
                {c.spotsLeft} spots left
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
