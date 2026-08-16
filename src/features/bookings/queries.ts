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

export async function getTrainerSchedule(coachId: string) {
  const classes = await db.class.findMany({
    where: { coachId },
    include: { bookings: true },
    orderBy: { startsAt: "asc" },
  });
  return classes.map((c) => ({
    id: c.id,
    day: c.startsAt.toLocaleDateString([], { weekday: "short" }),
    time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: c.title,
    room: c.room,
    booked: c.bookings.filter((b) => b.status === "CONFIRMED").length,
    capacity: c.capacity,
  }));
}

export async function getBookableClasses(userId: string) {
  const classes = await db.class.findMany({
    where: { startsAt: { gte: new Date() } },
    include: { coach: true, bookings: true },
    orderBy: { startsAt: "asc" },
  });

  return classes.map((c) => {
    const confirmed = c.bookings.filter((b) => b.status === "CONFIRMED").length;
    const mine = c.bookings.find(
      (b) => b.userId === userId && (b.status === "CONFIRMED" || b.status === "WAITLIST")
    );
    return {
      id: c.id,
      title: c.title,
      discipline: c.discipline,
      coach: c.coach.name,
      room: c.room,
      day: c.startsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
      time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      seatsLeft: Math.max(0, c.capacity - confirmed),
      capacity: c.capacity,
      myStatus: (mine?.status ?? null) as "CONFIRMED" | "WAITLIST" | null,
    };
  });
}
