"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { cancelBookingSchema, type CancelBookingInput } from "./schemas";
import { revalidatePath } from "next/cache";

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
