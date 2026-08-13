"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { publishPostSchema, type PublishPostInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function publishPost(rawInput: PublishPostInput) {
  const input = publishPostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.post.update({ where: { id: input.postId }, data: { status: "PUBLISHED" } });
  revalidatePath("/dashboard/admin/content");
  return { ok: true as const };
}
