import { db } from "@/lib/db";

export async function getNotifications(userId: string) {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    items: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt.toLocaleDateString([], { month: "short", day: "numeric" }),
      read: n.readAt !== null,
    })),
    unread: rows.filter((n) => n.readAt === null).length,
  };
}
