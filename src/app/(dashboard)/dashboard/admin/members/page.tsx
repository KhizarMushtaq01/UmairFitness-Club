import Link from "next/link";
import { getAllMembers } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MemberSearchForm } from "./MemberSearchForm";

type MemberRow = Awaited<ReturnType<typeof getAllMembers>>[number];

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const members = await getAllMembers(q);

  return (
    <>
      <Topbar title="Members" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <MemberSearchForm q={q ?? ""} />
        {members.length === 0 ? (
          <EmptyState body={q ? `No members match "${q}".` : "No members yet."} />
        ) : (
          <DataTable<MemberRow>
            columns={[
              {
                header: "Name",
                render: (r) => (
                  <Link
                    href={`/dashboard/admin/members/${r.id}`}
                    className="underline underline-offset-4"
                  >
                    {r.name}
                  </Link>
                ),
              },
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
