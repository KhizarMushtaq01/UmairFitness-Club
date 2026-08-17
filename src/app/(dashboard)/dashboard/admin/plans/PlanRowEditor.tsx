"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlan } from "@/features/plans/actions";

export function PlanRowEditor({
  planKey,
  name,
  priceCents,
}: {
  planKey: string;
  name: string;
  priceCents: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name, priceCents });
  const router = useRouter();

  const field =
    "border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] w-full";
  const button =
    "border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={button}>
        Edit
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-[420px]">
      <input
        aria-label="Plan name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={field}
      />
      <input
        aria-label="Price in cents"
        type="number"
        value={form.priceCents}
        onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
        className={field}
      />
      <p className="text-[var(--dim)] text-xs">
        Price is in cents — 8900 is $89 / mo. This is what the public pricing page shows.
      </p>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await updatePlan({ key: planKey, name: form.name, priceCents: form.priceCents });
                setEditing(false);
                router.refresh();
              } catch {
                setError("Couldn't save. The price must be a whole number of cents, zero or more.");
              }
            })
          }
          className={button}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className={button}>
          Cancel
        </button>
      </div>
    </div>
  );
}
