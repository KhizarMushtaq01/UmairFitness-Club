import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shared/Sidebar";
import { roleHomePath, type Role } from "@/lib/dashboard-nav";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "MEMBER") redirect(roleHomePath(session.user.role as Role));

  const membership = await db.membership.findFirst({ where: { userId: session.user.id } });

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen items-start">
      <Sidebar role="MEMBER" userName={session.user.name} userPlan={membership?.plan ?? "Member"} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
