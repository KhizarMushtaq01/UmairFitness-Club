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

export async function getTrainerOverview(coachId: string) {
  const [classCount, clientCount] = await Promise.all([
    db.class.count({ where: { coachId } }),
    db.programAssignment.count({ where: { program: { coachId } } }),
  ]);
  const classesToday = await db.class.findMany({
    where: { coachId },
    include: { bookings: true },
    orderBy: { startsAt: "asc" },
    take: 4,
  });

  const stats = [
    { label: "Classes", value: String(classCount), delta: "", deltaColor: "var(--red)" },
    { label: "Active clients", value: String(clientCount), delta: "", deltaColor: "var(--red)" },
  ];
  const sessionsToday = classesToday.map((c) => ({
    time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: c.title,
    room: c.room,
    attendees: `${c.bookings.filter((b) => b.status === "CONFIRMED").length} / ${c.capacity} booked`,
  }));

  return { stats, sessionsToday };
}

export async function getAdminAnalytics() {
  const [memberCount, activeCount, checkInsToday] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.membership.count({ where: { status: "ACTIVE" } }),
    db.attendanceLog.count({
      where: { checkedInAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);
  const byPlan = await db.membership.groupBy({ by: ["plan"], _count: { plan: true } });

  const stats = [
    { label: "Total members", value: String(memberCount), delta: "", deltaColor: "var(--red)" },
    { label: "Active memberships", value: String(activeCount), delta: "", deltaColor: "var(--red)" },
    { label: "Check-ins today", value: String(checkInsToday), delta: "", deltaColor: "var(--mut)" },
  ];
  const planMix = byPlan.map((p) => ({ plan: p.plan, count: p._count.plan }));

  return { stats, planMix };
}
