"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updateUserRoleSchema, type UpdateUserRoleInput } from "@/features/analytics/schemas";
import { updateMembershipSchema, type UpdateMembershipInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function updateUserRole(rawInput: UpdateUserRoleInput) {
  // Parsing first keeps an arbitrary role string out of the DB even if the
  // client sends one the select never offered.
  const input = updateUserRoleSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.user.update({ where: { id: input.userId }, data: { role: input.role } });
  revalidatePath("/dashboard/admin/roles");
  return { ok: true as const };
}

export async function updateMembership(rawInput: UpdateMembershipInput) {
  const input = updateMembershipSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // The key is a plain string in the schema, so its validity is checked here
  // against the source of truth rather than against a hardcoded list.
  const plan = await db.plan.findUnique({ where: { key: input.plan } });
  if (!plan) throw new Error("Not found: no such plan");

  // A user can hold more than one membership row. The newest is the live one
  // — the same rule getAllMembers and getMemberDetail use to decide which one
  // to display, so editing any other row would be invisible to the admin.
  const membership = await db.membership.findFirst({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
  });
  if (!membership) throw new Error("Not found: member has no membership");

  await db.membership.update({
    where: { id: membership.id },
    data: { plan: input.plan, status: input.status },
  });

  revalidatePath("/dashboard/admin/members");
  revalidatePath(`/dashboard/admin/members/${input.userId}`);
  return { ok: true as const };
}
