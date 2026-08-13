import { db } from "@/lib/db";

export async function getMemberBookings(userId: string) {
  const bookings = await db.booking.findMany({
    where: { userId, status: { in: ["CONFIRMED", "WAITLIST"] } },
    include: { class: true },
    orderBy: { class: { startsAt: "asc" } },
  });
  return bookings.map((b) => ({
    id: b.id,
    time: b.class.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: b.class.title,
    room: b.class.room,
    status: b.status,
  }));
}
