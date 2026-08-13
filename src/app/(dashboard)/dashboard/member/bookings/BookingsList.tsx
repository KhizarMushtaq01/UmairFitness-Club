"use client";
import { useState, useTransition } from "react";
import { cancelBooking } from "@/features/bookings/actions";

type Row = { id: string; time: string; title: string; room: string; status: string };

export function BookingsList({ bookings }: { bookings: Row[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-[var(--card)] border border-[var(--line)]">
      {error && (
        <p role="alert" className="text-[var(--red)] text-sm p-4 border-b border-[var(--line)]">
          {error}
        </p>
      )}
      {bookings.map((b) => (
        <div
          key={b.id}
          className="flex items-center gap-4 p-4 border-b border-[var(--line)] last:border-0"
        >
          <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg w-16">
            {b.time}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">{b.title}</div>
            <div className="text-[var(--dim)] text-xs">
              {b.room} · {b.status}
            </div>
          </div>
          <button
            disabled={isPending}
            onClick={() =>
              // The action is awaited so a rejection surfaces instead of
              // becoming an unhandled promise and leaving the row unchanged.
              startTransition(async () => {
                setError(null);
                try {
                  await cancelBooking({ bookingId: b.id });
                } catch {
                  setError("Couldn't cancel that booking. Try again.");
                }
              })
            }
            className="border border-[var(--line2)] px-4 py-2 text-xs uppercase tracking-widest"
          >
            {b.status === "WAITLIST" ? "Leave" : "Cancel"}
          </button>
        </div>
      ))}
    </div>
  );
}
