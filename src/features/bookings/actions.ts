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

  // Role alone isn't enough here — the booking must also belong to the caller,
  // otherwise any signed-in member could cancel anyone's booking.
  const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking || booking.userId !== session.user.id) {
    throw new Error("Forbidden: not your booking");
  }

  await db.booking.update({ where: { id: input.bookingId }, data: { status: "CANCELLED" } });
  revalidatePath("/dashboard/member/bookings");
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
