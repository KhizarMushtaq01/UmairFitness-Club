import { db } from "@/lib/db";
import { computeFreezeAllowance } from "@/features/profile/freeze-allowance";
import { DAY_MS, CANCELLATION_NOTICE_DAYS } from "@/features/profile/constants";

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

export async function getMembershipStatus(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { freezes: true },
  });
  if (!membership) return null;

  const now = new Date();
  const frozen = membership.frozenUntil !== null && membership.frozenUntil > now;
  const { usedWeeks, remainingWeeks } = computeFreezeAllowance(
    membership.freezes,
    now.getFullYear()
  );

  const noticeEnd = membership.cancelRequestedAt
    ? new Date(membership.cancelRequestedAt.getTime() + CANCELLATION_NOTICE_DAYS * DAY_MS)
    : null;
  const cancelEffectiveAt =
    noticeEnd && membership.renewsAt && membership.renewsAt > noticeEnd
      ? membership.renewsAt
      : noticeEnd;

  return {
    plan: membership.plan,
    status: membership.status,
    // Derived, not stored — adding FROZEN to the stored values would mean
    // updating every status colour map and the seed to say what frozenUntil
    // already says.
    displayStatus: frozen ? "FROZEN" : membership.status,
    frozenUntil: frozen ? membership.frozenUntil : null,
    cancelEffectiveAt,
    usedWeeks,
    remainingWeeks,
  };
}
