import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { roleHomePath, type Role } from "@/lib/dashboard-nav";
import { getNotifications } from "@/features/notifications/queries";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "MEMBER") redirect(roleHomePath(session.user.role as Role));

  const [membership, notifications] = await Promise.all([
    db.membership.findFirst({ where: { userId: session.user.id } }),
    getNotifications(session.user.id),
  ]);

  return (
    <DashboardShell
      role="MEMBER"
      userName={session.user.name}
      userPlan={membership?.plan ?? "Member"}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  );
}
