import { db } from "@/lib/db";

// Public pages must not leak staff email addresses, so these queries select
// their fields explicitly rather than reusing the admin queries.
const PLAN_PRICES: Record<string, string> = {
  CONTENDER: "$89 / mo",
  FIGHTER: "$149 / mo",
  CHAMPION: "$249 / mo",
};

export async function getPublicClasses() {
  const classes = await db.class.findMany({
    include: { coach: true, bookings: true },
    orderBy: { startsAt: "asc" },
  });
  return classes.map((c) => ({
    id: c.id,
    discipline: c.discipline,
    title: c.title,
    room: c.room,
    day: c.startsAt.toLocaleDateString([], { weekday: "short" }),
    time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    durationMin: c.durationMin,
    coachName: c.coach.name,
    spotsLeft: c.capacity - c.bookings.filter((b) => b.status === "CONFIRMED").length,
  }));
}

export async function getPublicTrainers() {
  const trainers = await db.user.findMany({
    where: { role: "TRAINER" },
    include: { _count: { select: { coachClasses: true, coachPrograms: true } } },
    orderBy: { name: "asc" },
  });
  return trainers.map((t) => ({
    id: t.id,
    name: t.name,
    classCount: t._count.coachClasses,
    programCount: t._count.coachPrograms,
  }));
}

// No memberCount here — per-plan member counts are a business metric that
// does not belong on a public marketing page. See admin-only
// getPlanBreakdown() in src/features/memberships/queries.ts for that.
//
// The catalogue is sourced from PLAN_PRICES itself, not from who currently
// holds a membership — a public price list must always show every tier,
// regardless of enrollment. This is why getPublicPlans is synchronous with
// no DB read: there is nothing to await.
export async function getPublicPlans() {
  return Object.entries(PLAN_PRICES).map(([plan, price]) => ({ plan, price }));
}

export async function getSiteStats() {
  const [memberCount, coachCount, classCount] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.user.count({ where: { role: "TRAINER" } }),
    db.class.count(),
  ]);
  return { memberCount, classCount, coachCount };
}

export async function getPublicGallery() {
  const images = await db.galleryImage.findMany();
  return images.map((i) => ({ id: i.id, url: i.url, caption: i.caption }));
}

// PUBLISHED only. The admin getAllPosts() returns drafts on purpose; a public
// query without this filter would put an unpublished draft on the homepage.
export async function getPublicPosts() {
  const posts = await db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    tag: p.tag,
    date: p.createdAt.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }),
  }));
}
