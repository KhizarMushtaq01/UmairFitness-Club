import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { Sidebar } from "@/components/shared/Sidebar";
import { roleHomePath, type Role } from "@/lib/dashboard-nav";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "TRAINER") redirect(roleHomePath(session.user.role as Role));

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen items-start">
      <Sidebar role="TRAINER" userName={session.user.name} userPlan="Coach" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
