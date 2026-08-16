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

  const promoted = await db.$transaction(async (tx) => {
    // Role alone isn't enough here — the booking must also belong to the
    // caller, otherwise any signed-in member could cancel anyone's booking.
    const booking = await tx.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking || booking.userId !== session.user.id) {
      throw new Error("Forbidden: not your booking");
    }

    await tx.booking.update({ where: { id: input.bookingId }, data: { status: "CANCELLED" } });

    // Cancelling a waitlist entry frees no seat, so nobody moves up.
    if (booking.status !== "CONFIRMED") return null;

    const next = await tx.booking.findFirst({
      where: { classId: booking.classId, status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return null;

    await tx.booking.update({ where: { id: next.id }, data: { status: "CONFIRMED" } });
    return next;
  });

  // Outside the transaction on purpose, same reasoning as bookClass: notify
  // sends email and its in-app db.notification.create write is unguarded. If
  // that throws here, the cancellation (and any promotion) has already
  // committed, so this action must not turn that success into a rejection
  // the caller sees as failure.
  if (promoted) {
    try {
      await notify(
        promoted.userId,
        "A seat opened up",
        "You were on the waitlist and your place is now confirmed."
      );
    } catch (err) {
      console.error("[cancelBooking] notify failed after promotion commit", err);
    }
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

  // Counting seats and taking one must be atomic. Without the transaction,
  // two members clicking the last seat both read "one free" and both confirm.
  const booked = await db.$transaction(async (tx) => {
    const klass = await tx.class.findUnique({ where: { id: input.classId } });
    if (!klass) throw new Error("Not found: no such class");

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
  //
  // The booking has already committed by this point. notify's own doc
  // comment calls it best-effort, but its in-app `db.notification.create`
  // write is unguarded — if that throws, this action must not turn an
  // already-successful booking into a rejection the caller sees as failure.
  try {
    await notify(
      userId,
      booked.status === "CONFIRMED" ? "Booked in" : "Added to the waitlist",
      booked.status === "CONFIRMED"
        ? `Your seat for ${booked.title} is confirmed.`
        : `${booked.title} is full. We'll confirm you automatically if a seat frees up.`
    );
  } catch (err) {
    console.error("[bookClass] notify failed after booking commit", err);
  }

  revalidatePath("/dashboard/member/classes");
  revalidatePath("/dashboard/member/bookings");
  return { ok: true as const, status: booked.status as "CONFIRMED" | "WAITLIST" };
}
