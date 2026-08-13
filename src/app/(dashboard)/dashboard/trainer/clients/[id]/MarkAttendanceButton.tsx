"use client";
import { useState, useTransition } from "react";
import { markAttendance } from "@/features/workouts/actions";

export function MarkAttendanceButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition();
  const [marked, setMarked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        disabled={isPending || marked}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await markAttendance({ memberId });
              setMarked(true);
            } catch {
              setError("Couldn't mark attendance.");
            }
          })
        }
        className="bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs"
      >
        {marked ? "Marked" : isPending ? "Marking…" : "Mark attendance"}
      </button>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
