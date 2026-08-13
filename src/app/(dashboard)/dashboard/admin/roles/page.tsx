import { db } from "@/lib/db";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { RoleSelect } from "./RoleSelect";

export default async function AdminRolesPage() {
  const users = await db.user.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <Topbar title="Roles" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {users.length === 0 ? (
          <EmptyState body="No users yet." />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-4 p-4 border-b border-[var(--line)] last:border-0"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{u.name}</div>
                  <div className="text-[var(--dim)] text-xs">{u.email}</div>
                </div>
                <RoleSelect userId={u.id} currentRole={u.role} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
