import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { Sidebar } from "@/components/shared/Sidebar";
import { roleHomePath, type Role } from "@/lib/dashboard-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect(roleHomePath(session.user.role as Role));

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen items-start">
      <Sidebar role="ADMIN" userName={session.user.name} userPlan="Owner · Admin" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
