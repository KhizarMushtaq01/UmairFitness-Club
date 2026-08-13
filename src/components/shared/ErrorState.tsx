"use client";
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="border border-[var(--red)] bg-[var(--card)] px-10 py-[90px] text-center flex flex-col items-center gap-3.5"
    >
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[30px]">
        Something broke
      </div>
      <p className="text-[var(--mut)] text-sm max-w-[360px]">
        We couldn&apos;t load this view. It&apos;s on us — try again, and if it keeps happening the
        front desk can help.
      </p>
      <button
        onClick={onRetry}
        className="mt-2 border border-[var(--line2)] px-6 py-3 font-bold text-xs uppercase tracking-widest"
      >
        Retry
      </button>
    </div>
  );
}
