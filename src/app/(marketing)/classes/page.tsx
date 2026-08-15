import Link from "next/link";
import { getPublicClasses } from "@/features/marketing/queries";
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";
import { ParallaxImage } from "@/components/marketing/ParallaxImage";
import { SITE_IMAGES } from "@/lib/images";
import { BOOKINGS_SIGN_IN_HREF } from "@/lib/site-links";

// Reads live data, so this page must not be statically prerendered — an
// admin's changes need to show up without a redeploy.
export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const classes = await getPublicClasses();

  return (
    <section
      className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24"
      style={{ perspective: "1000px" }}
    >
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        TIMETABLE
      </h1>

      <Reveal>
        <ParallaxImage
          src={SITE_IMAGES.classes.url}
          alt={SITE_IMAGES.classes.alt}
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="h-[200px] sm:h-[280px] mt-8 border border-[var(--line)]"
        />
      </Reveal>

      {classes.length === 0 ? (
        <p className="text-[var(--mut)] mt-6">No classes scheduled yet — check back shortly.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {classes.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.1}>
              <TiltCard className="bg-[var(--card)] border border-[var(--line)] p-5 h-full flex flex-col">
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
                <div className="text-[var(--red)] text-sm font-semibold mt-3 flex-1">
                  {c.spotsLeft} spots left
                </div>
                {/* Booking needs an account, so this is honest about being a
                    sign-in step rather than a button that pretends to book. */}
                <Link
                  href={BOOKINGS_SIGN_IN_HREF}
                  className="min-h-[44px] inline-flex items-center justify-center border border-[var(--line2)] text-[var(--txt)] px-4 py-3 font-bold uppercase tracking-widest text-[10.5px] no-underline mt-4"
                >
                  Sign in to book
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-12">
        <Link
          href="/contact"
          className="min-h-[44px] inline-flex items-center justify-center bg-[var(--red)] text-white px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
        >
          Book a free session
        </Link>
        <Link
          href="/pricing"
          className="min-h-[44px] inline-flex items-center justify-center border border-[var(--line2)] text-[var(--txt)] px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
        >
          See plans
        </Link>
      </div>
    </section>
  );
}
