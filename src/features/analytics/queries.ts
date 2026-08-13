import { db } from "@/lib/db";

export async function getMemberOverview(userId: string) {
  const [bookingsThisMonth, attendanceCount] = await Promise.all([
    db.booking.count({ where: { userId, status: { in: ["CONFIRMED", "ATTENDED"] } } }),
    db.attendanceLog.count({ where: { userId } }),
  ]);
  const nextBookings = await db.booking.findMany({
    where: { userId, status: "CONFIRMED" },
    include: { class: true },
    orderBy: { class: { startsAt: "asc" } },
    take: 3,
  });

  const stats = [
    { label: "Sessions this month", value: String(bookingsThisMonth), delta: "", deltaColor: "var(--red)" },
    { label: "Total check-ins", value: String(attendanceCount), delta: "", deltaColor: "var(--mut)" },
  ];
  const upNext = nextBookings.map((b) => ({
    time: b.class.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: b.class.title,
    sub: `${b.class.room} · ${b.class.startsAt.toLocaleDateString()}`,
  }));

  return { stats, upNext };
}
