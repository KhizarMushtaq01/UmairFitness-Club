"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import {
  updateProfileSchema,
  type UpdateProfileInput,
  freezeMembershipSchema,
  type FreezeMembershipInput,
} from "./schemas";
import { revalidatePath } from "next/cache";
import { computeFreezeAllowance } from "./freeze-allowance";
import { cancelSubscription } from "@/lib/payments";
import { notify } from "@/features/notifications/notify";

export async function updateProfile(rawInput: UpdateProfileInput) {
  const input = updateProfileSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  // Scoped to the caller's own id — a user can only rename themselves.
  await db.user.update({ where: { id: session.user.id }, data: { name: input.name } });
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CANCELLATION_NOTICE_DAYS = 30;

export async function freezeMembership(rawInput: FreezeMembershipInput) {
  const input = freezeMembershipSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { freezes: true },
  });
  if (!membership) throw new Error("Not found: no membership to freeze");

  const { remainingWeeks } = computeFreezeAllowance(membership.freezes, new Date().getFullYear());
  if (input.weeks > remainingWeeks) {
    throw new Error(`Freeze allowance exceeded: ${remainingWeeks} week(s) left this year`);
  }

  // A member already frozen into the future extends that freeze rather than
  // truncating it: starting the new window at `frozenUntil` (when it's still
  // ahead of us) means "2 more weeks" actually adds 2 weeks on top of what
  // they already have, instead of overwriting frozenUntil with an earlier
  // date computed from today.
  const now = new Date();
  const from = membership.frozenUntil && membership.frozenUntil > now ? membership.frozenUntil : now;
  const to = new Date(from.getTime() + input.weeks * 7 * DAY_MS);

  await db.membershipFreeze.create({ data: { membershipId: membership.id, from, to } });
  await db.membership.update({ where: { id: membership.id }, data: { frozenUntil: to } });

  // Outside the writes on purpose, same reasoning as bookClass/cancelBooking:
  // the freeze has already committed by this point, so a notify failure must
  // not turn that success into a rejection the caller sees as failure.
  try {
    await notify(
      session.user.id,
      "Membership frozen",
      `Your membership is frozen until ${to.toLocaleDateString()}.`
    );
  } catch (err) {
    console.error("[freezeMembership] notify failed after freeze commit", err);
  }
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const, frozenUntil: to };
}

export async function cancelMembership() {
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { freezes: true },
  });
  if (!membership) throw new Error("Not found: no membership to cancel");

  // 30 days' notice, or the end of the paid period, whichever is later. The
  // status is deliberately left alone: the member paid through the period and
  // keeps access until it ends.
  const noticeEnd = new Date(Date.now() + CANCELLATION_NOTICE_DAYS * DAY_MS);
  const effectiveAt =
    membership.renewsAt && membership.renewsAt > noticeEnd ? membership.renewsAt : noticeEnd;

  // Deliberately unguarded, unlike the notify() call below: if Stripe fails
  // to cancel, we must NOT record a cancellation the billing system never
  // honoured. Letting this throw keeps the member with access and keeps them
  // billed — consistent and recoverable. The alternative (DB says cancelled,
  // Stripe still charges) leaves them believing they cancelled while still
  // being billed, which is worse and harder to unwind.
  await cancelSubscription({ membershipId: membership.id });

  await db.membership.update({
    where: { id: membership.id },
    data: { cancelRequestedAt: new Date() },
  });

  // Outside the writes on purpose, same reasoning as bookClass/cancelBooking:
  // the cancellation has already committed by this point, so a notify
  // failure must not turn that success into a rejection the caller sees as
  // failure.
  try {
    await notify(
      session.user.id,
      "Cancellation requested",
      `Your membership stays active until ${effectiveAt.toLocaleDateString()}.`
    );
  } catch (err) {
    console.error("[cancelMembership] notify failed after cancellation commit", err);
  }
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const, effectiveAt };
}
