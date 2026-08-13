import Link from "next/link";
import { requireSession } from "@/lib/rbac";
import { getTrainerClients } from "@/features/workouts/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

type ClientRow = Awaited<ReturnType<typeof getTrainerClients>>[number];

export default async function TrainerClientsPage() {
  const session = await requireSession();
  const clients = await getTrainerClients(session.user.id);

  return (
    <>
      <Topbar title="Clients" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {clients.length === 0 ? (
          <EmptyState body="No clients assigned yet." />
        ) : (
          <DataTable<ClientRow>
            columns={[
              {
                header: "Name",
                render: (r) => (
                  <Link href={`/dashboard/trainer/clients/${r.id}`} className="underline">
                    {r.name}
                  </Link>
                ),
              },
              { header: "Program", render: (r) => r.program },
              { header: "Adherence", render: (r) => `${r.adherencePct}%` },
            ]}
            rows={clients}
          />
        )}
      </div>
    </>
  );
}
