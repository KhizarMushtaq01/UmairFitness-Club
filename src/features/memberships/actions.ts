"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updateUserRoleSchema, type UpdateUserRoleInput } from "@/features/analytics/schemas";
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
