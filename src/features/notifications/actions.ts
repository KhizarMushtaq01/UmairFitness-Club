"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { markNotificationReadSchema, type MarkNotificationReadInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(rawInput: MarkNotificationReadInput) {
  const input = markNotificationReadSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  // Role alone is not enough — the notification must belong to the caller,
  // or any signed-in user could clear someone else's bell.
  const notification = await db.notification.findUnique({ where: { id: input.notificationId } });
  if (!notification || notification.userId !== session.user.id) {
    throw new Error("Forbidden: not your notification");
  }

  await db.notification.update({
    where: { id: input.notificationId },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true as const };
}
