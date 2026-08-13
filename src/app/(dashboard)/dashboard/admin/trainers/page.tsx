import { getAllTrainers } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

type TrainerRow = Awaited<ReturnType<typeof getAllTrainers>>[number];

export default async function AdminTrainersPage() {
  const trainers = await getAllTrainers();

  return (
    <>
      <Topbar title="Trainers" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {trainers.length === 0 ? (
          <EmptyState body="No trainers yet." />
        ) : (
          <DataTable<TrainerRow>
            columns={[
              { header: "Name", render: (r) => r.name },
              { header: "Email", render: (r) => r.email },
              { header: "Classes", render: (r) => String(r.classCount) },
              { header: "Programs", render: (r) => String(r.programCount) },
            ]}
            rows={trainers}
          />
        )}
      </div>
    </>
  );
}
