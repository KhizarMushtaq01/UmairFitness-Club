"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { freezeMembership, cancelMembership } from "@/features/profile/actions";

type Props = {
  plan: string;
  displayStatus: string;
  frozenUntil: string | null;
  cancelEffectiveAt: string | null;
  remainingWeeks: number;
};

export function MembershipControls(m: Props) {
  const [weeks, setWeeks] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<unknown>, fallback: string) =>
    startTransition(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch {
        setError(fallback);
      }
    });

  const cancelled = m.cancelEffectiveAt !== null;

  // router.refresh() re-fetches props but does not remount this component, so
  // `weeks` can outlive a shrunk `remainingWeeks` after a successful freeze.
  // Clamping here (rather than resetting `weeks` on success) makes a
  // mismatched selection unrepresentable: the <select> can never show a value
  // with no matching <option>, and a freeze can never submit more weeks than
  // the current allowance.
  const selectedWeeks = Math.min(weeks, m.remainingWeeks);

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 w-full max-w-[420px] flex flex-col gap-4">
      <div>
        <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
          Plan
        </div>
        <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">
          {m.plan}
        </div>
        <div className="text-[var(--dim)] text-xs mt-1">Status: {m.displayStatus}</div>
        {m.frozenUntil && (
          <div className="text-[var(--dim)] text-xs mt-1">Frozen until {m.frozenUntil}</div>
        )}
        {cancelled && (
          <div className="text-[var(--red)] text-xs mt-1">
            Cancellation requested — active until {m.cancelEffectiveAt}
          </div>
        )}
      </div>

      {!cancelled && (
        <>
          <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            <label
              htmlFor="freeze-weeks"
              className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]"
            >
              Freeze — {m.remainingWeeks} week(s) left this year
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                id="freeze-weeks"
                value={selectedWeeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                disabled={m.remainingWeeks === 0}
                className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] flex-1"
              >
                {Array.from({ length: m.remainingWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    {w} week{w > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <button
                disabled={isPending || m.remainingWeeks === 0}
                onClick={() =>
                  run(
                    () => freezeMembership({ weeks: selectedWeeks }),
                    "Couldn't freeze — your allowance may have changed. Reload and try again."
                  )
                }
                className="border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]"
              >
                Freeze
              </button>
            </div>
          </div>

          <button
            disabled={isPending}
            onClick={() =>
              run(() => cancelMembership(), "Couldn't request cancellation. Try again.")
            }
            className="border border-[var(--red)] text-[var(--red)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest"
          >
            Cancel membership
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
