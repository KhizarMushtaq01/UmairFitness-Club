"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookClass } from "@/features/bookings/actions";

type Props = {
  id: string;
  title: string;
  discipline: string;
  coach: string;
  room: string;
  day: string;
  time: string;
  seatsLeft: number;
  capacity: number;
  myStatus: "CONFIRMED" | "WAITLIST" | null;
};

export function ClassCard(c: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const full = c.seatsLeft === 0;
  const label = c.myStatus === "CONFIRMED" ? "Booked" : c.myStatus === "WAITLIST" ? "On waitlist" : full ? "Join waitlist" : "Book";

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3">
      <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--red)]">
        {c.discipline}
      </div>
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
        {c.title}
      </div>
      <div className="text-[var(--dim)] text-xs flex flex-wrap gap-x-3 gap-y-1">
        <span>{c.day}</span>
        <span>{c.time}</span>
        <span>{c.room}</span>
        <span>{c.coach}</span>
      </div>
      <div className="text-xs" style={{ color: full ? "var(--red)" : "var(--mut)" }}>
        {full ? `Full · ${c.capacity} seats` : `${c.seatsLeft} of ${c.capacity} seats left`}
      </div>

      <button
        disabled={isPending || c.myStatus !== null}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await bookClass({ classId: c.id });
              router.refresh();
            } catch {
              setError("Couldn't book that class. Try again.");
            }
          })
        }
        className="mt-auto w-full border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]"
      >
        {isPending ? "Working…" : label}
      </button>

      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
