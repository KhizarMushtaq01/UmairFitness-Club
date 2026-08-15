// src/components/marketing/PolicyPage.tsx
export function PolicyPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-[760px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1
        style={{ fontFamily: "var(--font-display)" }}
        className="text-[36px] sm:text-[56px] leading-[0.95]"
      >
        {title}
      </h1>
      <p className="text-[var(--dim)] text-xs mt-3 uppercase tracking-widest">
        Last updated {updated}
      </p>

      <div
        role="note"
        className="border border-[var(--red)] bg-[var(--card)] p-4 mt-8 text-sm text-[var(--mut)]"
      >
        <strong className="text-[var(--txt)]">Template — pending legal review.</strong>{" "}
        This wording is a starting draft, not legal advice. Have a qualified
        solicitor review and amend it for your jurisdiction before relying on
        it, then remove this notice.
      </div>

      <div className="mt-10 flex flex-col gap-6 text-sm text-[var(--mut)]">{children}</div>
    </section>
  );
}
