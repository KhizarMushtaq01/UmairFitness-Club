import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { roleHomePath, type Role } from "@/lib/dashboard-nav";
import { getNotifications } from "@/features/notifications/queries";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "TRAINER") redirect(roleHomePath(session.user.role as Role));

  const notifications = await getNotifications(session.user.id);

  return (
    <DashboardShell role="TRAINER" userName={session.user.name} userPlan="Coach" notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
