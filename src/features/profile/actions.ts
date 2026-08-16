"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updateProfileSchema, type UpdateProfileInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function updateProfile(rawInput: UpdateProfileInput) {
  const input = updateProfileSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  // Scoped to the caller's own id — a user can only rename themselves.
  await db.user.update({ where: { id: session.user.id }, data: { name: input.name } });
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const };
}
