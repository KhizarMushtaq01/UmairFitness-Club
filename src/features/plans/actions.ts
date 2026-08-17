"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updatePlanSchema, type UpdatePlanInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function updatePlan(rawInput: UpdatePlanInput) {
  const input = updatePlanSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // Keyed on `key`, not id: it is unique, it is what Membership.plan holds,
  // and it is what the admin table has in hand.
  await db.plan.update({
    where: { key: input.key },
    data: { name: input.name, priceCents: input.priceCents },
  });

  revalidatePath("/dashboard/admin/plans");
  // getPublicPlans backs both of these. Revalidating only the admin screen
  // would leave the old price on the public site.
  revalidatePath("/pricing");
  revalidatePath("/");
  return { ok: true as const };
}
