"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceOrderStatus } from "@/features/shop/actions";

export function AdvanceOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await advanceOrderStatus({ orderId });
              router.refresh();
            } catch {
              setError("Couldn't advance that order.");
            }
          })
        }
        className="border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]"
      >
        {isPending ? "Working…" : "Advance"}
      </button>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
