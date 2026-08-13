import { db } from "@/lib/db";

export async function getAllMembers() {
  const members = await db.user.findMany({
    where: { role: "MEMBER" },
    include: { memberships: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return members.map((m) => {
    const ms = m.memberships[0];
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      plan: ms?.plan ?? "—",
      status: ms?.status ?? "NONE",
      statusColor: ms?.status === "AT_RISK" ? "var(--red)" : "var(--mut)",
    };
  });
}

export async function getAllTrainers() {
  const trainers = await db.user.findMany({
    where: { role: "TRAINER" },
    include: { _count: { select: { coachClasses: true, coachPrograms: true } } },
  });
  return trainers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    classCount: t._count.coachClasses,
    programCount: t._count.coachPrograms,
  }));
}

const PLAN_PRICES: Record<string, string> = {
  CONTENDER: "$89 / mo",
  FIGHTER: "$149 / mo",
  CHAMPION: "$249 / mo",
};

export async function getPlanBreakdown() {
  const byPlan = await db.membership.groupBy({ by: ["plan"], _count: { plan: true } });
  return byPlan.map((p) => ({
    plan: p.plan,
    price: PLAN_PRICES[p.plan] ?? "—",
    memberCount: p._count.plan,
  }));
}
