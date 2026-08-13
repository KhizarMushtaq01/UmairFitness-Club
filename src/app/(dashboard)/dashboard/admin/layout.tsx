import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { roleHomePath, type Role } from "@/lib/dashboard-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect(roleHomePath(session.user.role as Role));

  return (
    <DashboardShell role="ADMIN" userName={session.user.name} userPlan="Owner · Admin">
      {children}
    </DashboardShell>
  );
}
