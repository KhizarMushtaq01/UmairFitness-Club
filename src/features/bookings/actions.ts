"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { cancelBookingSchema, type CancelBookingInput, bookClassSchema, type BookClassInput } from "./schemas";
import { revalidatePath } from "next/cache";
import { notify } from "@/features/notifications/notify";

export async function cancelBooking(rawInput: CancelBookingInput) {
  const input = cancelBookingSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  const cancelled = await db.$transaction(async (tx) => {
    // Role alone isn't enough here — the booking must also belong to the
    // caller, otherwise any signed-in member could cancel anyone's booking.
    const booking = await tx.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking || booking.userId !== session.user.id) {
      throw new Error("Forbidden: not your booking");
    }

    await tx.booking.update({ where: { id: input.bookingId }, data: { status: "CANCELLED" } });

    // Cancelling a waitlist entry frees no seat, so nobody moves up.
    if (booking.status !== "CONFIRMED") return { booking, promoted: null };

    const next = await tx.booking.findFirst({
      where: { classId: booking.classId, status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return { booking, promoted: null };

    await tx.booking.update({ where: { id: next.id }, data: { status: "CONFIRMED" } });
    return { booking, promoted: next };
  });

  // Outside the transaction on purpose: notify sends email, and holding a
  // database transaction open across a network call is how deadlocks start.
  // notify never rejects (see its doc comment), so no guard is needed here —
  // the cancellation and any promotion have already committed.
  await notify(cancelled.booking.userId, "Booking cancelled", "Your booking has been cancelled.");
  if (cancelled.promoted) {
    await notify(
      cancelled.promoted.userId,
      "A seat opened up",
      "You were on the waitlist and your place is now confirmed."
    );
  }

  revalidatePath("/dashboard/member/bookings");
  revalidatePath("/dashboard/member/classes");
  return { ok: true as const };
}

export async function bookClass(rawInput: BookClassInput) {
  const input = bookClassSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);
  const userId = session.user.id;

  // Counting seats and taking one happen inside one transaction so a
  // client can never observe (or record) an over-confirmed class: the seat
  // count and the insert either commit together or not at all. That
  // guarantees safety (never more CONFIRMED bookings than capacity), but not
  // liveness of a specific outcome — on SQLite, Prisma's interactive
  // transactions are deferred, so two members racing for the last seat more
  // likely resolve as one commit and one SQLITE_BUSY error on the loser
  // (surfaced to that caller as a failed booking to retry) than as one
  // CONFIRMED and one WAITLIST in the same round trip.
  const booked = await db.$transaction(async (tx) => {
    const klass = await tx.class.findUnique({ where: { id: input.classId } });
    if (!klass) throw new Error("Not found: no such class");
    if (klass.startsAt < new Date()) throw new Error("Conflict: class has already started");

    // Only an active booking blocks a rebooking — a member who cancelled
    // is free to book the class again.
    const existing = await tx.booking.findFirst({
      where: { userId, classId: input.classId, status: { in: ["CONFIRMED", "WAITLIST"] } },
    });
    if (existing) throw new Error("Conflict: already booked onto this class");

    const confirmed = await tx.booking.count({
      where: { classId: input.classId, status: "CONFIRMED" },
    });
    const status = confirmed < klass.capacity ? "CONFIRMED" : "WAITLIST";
    await tx.booking.create({ data: { userId, classId: input.classId, status } });

    return { status, title: klass.title };
  });

  // Outside the transaction on purpose: notify sends email, and holding a
  // database transaction open across a network call is how deadlocks start.
  // notify never rejects, so the committed booking cannot be undone by a
  // delivery failure.
  await notify(
    userId,
    booked.status === "CONFIRMED" ? "Booked in" : "Added to the waitlist",
    booked.status === "CONFIRMED"
      ? `Your seat for ${booked.title} is confirmed.`
      : `${booked.title} is full. We'll confirm you automatically if a seat frees up.`
  );

  revalidatePath("/dashboard/member/classes");
  revalidatePath("/dashboard/member/bookings");
  return { ok: true as const, status: booked.status as "CONFIRMED" | "WAITLIST" };
}
