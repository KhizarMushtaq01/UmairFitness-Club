import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { roleHomePath, type Role } from "@/lib/dashboard-nav";

export default async function DashboardIndex() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(roleHomePath(session.user.role as Role));
}
