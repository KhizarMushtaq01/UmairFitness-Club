export function EmptyState({
  title = "Nothing here yet",
  body,
  ctaLabel,
  ctaHref,
}: {
  title?: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="border border-dashed border-[var(--line2)] px-10 py-[90px] text-center flex flex-col items-center gap-3.5">
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[30px]">
        {title}
      </div>
      <p className="text-[var(--mut)] text-sm max-w-[340px]">{body}</p>
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          className="mt-2 bg-[var(--red)] text-white px-6 py-3 font-bold text-xs uppercase tracking-widest no-underline"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}
