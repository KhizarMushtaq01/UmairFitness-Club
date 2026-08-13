import { getAllMembers } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

type MemberRow = Awaited<ReturnType<typeof getAllMembers>>[number];

export default async function AdminMembersPage() {
  const members = await getAllMembers();

  return (
    <>
      <Topbar title="Members" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {members.length === 0 ? (
          <EmptyState body="No members yet." />
        ) : (
          <DataTable<MemberRow>
            columns={[
              { header: "Name", render: (r) => r.name },
              { header: "Email", render: (r) => r.email },
              { header: "Plan", render: (r) => r.plan },
              {
                header: "Status",
                render: (r) => <StatusBadge label={r.status} color={r.statusColor} />,
              },
            ]}
            rows={members}
          />
        )}
      </div>
    </>
  );
}
