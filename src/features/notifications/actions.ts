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
  // "/dashboard" (default type: "page") only invalidates dashboard/page.tsx,
  // which is a redirect-only route that renders nothing — it never reaches
  // src/app/(dashboard)/dashboard/{member,trainer,admin}/layout.tsx, where
  // getNotifications actually runs. The "layout" type walks the segment
  // tree under /dashboard and invalidates those layouts too. Without this,
  // the bell only updates because NotificationBell.tsx also calls
  // router.refresh() client-side — this call was inert on its own.
  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  // "/dashboard" (default type: "page") only invalidates dashboard/page.tsx,
  // which is a redirect-only route that renders nothing — it never reaches
  // src/app/(dashboard)/dashboard/{member,trainer,admin}/layout.tsx, where
  // getNotifications actually runs. The "layout" type walks the segment
  // tree under /dashboard and invalidates those layouts too. Without this,
  // the bell only updates because NotificationBell.tsx also calls
  // router.refresh() client-side — this call was inert on its own.
  revalidatePath("/dashboard", "layout");
  return { ok: true as const };
}
