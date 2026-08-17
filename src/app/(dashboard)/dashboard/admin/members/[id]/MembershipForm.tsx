"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMembership } from "@/features/memberships/actions";

const STATUSES = ["ACTIVE", "TRIAL", "AT_RISK", "CANCELLED"] as const;

export function MembershipForm({
  userId,
  plan,
  status,
  planOptions,
}: {
  userId: string;
  plan: string;
  status: string;
  planOptions: { key: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nextPlan, setNextPlan] = useState(plan);
  const [nextStatus, setNextStatus] = useState(status);
  const router = useRouter();

  // A member with no membership row has plan "—", which is not a real key.
  // Submitting it would fail the action's plan check, so the form says why
  // instead of offering a control that cannot succeed.
  const hasMembership = planOptions.some((p) => p.key === plan);

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]">
      <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
        Edit membership
      </div>

      {!hasMembership ? (
        <p className="text-[var(--mut)] text-sm">This member has no membership to edit.</p>
      ) : (
        <>
          <select
            aria-label="Plan"
            value={nextPlan}
            onChange={(e) => setNextPlan(e.target.value)}
            className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
          >
            {planOptions.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Status"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {error && (
            <p role="alert" className="text-[var(--red)] text-sm">
              {error}
            </p>
          )}

          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await updateMembership({
                    userId,
                    plan: nextPlan,
                    status: nextStatus as (typeof STATUSES)[number],
                  });
                  router.refresh();
                } catch {
                  // Next redacts server action error messages in production,
                  // so surfacing err.message would read well in dev and be
                  // useless where it matters. A fixed hint instead.
                  setError("Couldn't save that change. Reload the page and try again.");
                }
              })
            }
            className="bg-[var(--red)] text-white p-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </>
      )}
    </div>
  );
}
