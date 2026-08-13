export default function AboutPage() {
  return (
    <section className="max-w-[760px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        ABOUT THE CLUB
      </h1>
      <p className="text-[var(--mut)] mt-6">
        Umair Fitness Club is a coaching gym. Members are not left to work out
        alone — every one of them is on a written programme, reviewed by a coach,
        with attendance and adherence tracked week to week.
      </p>
      <p className="text-[var(--mut)] mt-4">
        We run boxing, Muay Thai and strength blocks out of two rings and a
        platform floor. Class sizes are capped so a coach can actually see you.
      </p>
      <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em] mt-12">
        HOW IT WORKS
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {[
          ["01", "Assessment", "You come in, we test where you are and what you want."],
          ["02", "Programme", "A coach writes you a block — sets, loads, tempo, the lot."],
          ["03", "Review", "Adherence gets tracked. The block gets adjusted, not repeated."],
        ].map(([n, title, body]) => (
          <li key={n} className="flex gap-4 border-b border-[var(--line)] pb-4">
            <span style={{ fontFamily: "var(--font-heading)" }} className="text-[var(--dim)] text-lg">
              {n}
            </span>
            <div>
              <div className="font-semibold text-sm">{title}</div>
              <div className="text-[var(--dim)] text-xs mt-1">{body}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
