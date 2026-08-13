import { requireSession } from "@/lib/rbac";
import { getTrainerSchedule } from "@/features/bookings/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

type ScheduleRow = Awaited<ReturnType<typeof getTrainerSchedule>>[number];

export default async function TrainerSchedulePage() {
  const session = await requireSession();
  const rows = await getTrainerSchedule(session.user.id);

  return (
    <>
      <Topbar title="Schedule" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {rows.length === 0 ? (
          <EmptyState body="No classes scheduled." />
        ) : (
          <DataTable<ScheduleRow>
            columns={[
              { header: "Day", render: (r) => r.day },
              { header: "Time", render: (r) => r.time },
              { header: "Class", render: (r) => r.title },
              { header: "Room", render: (r) => r.room },
              { header: "Booked", render: (r) => `${r.booked} / ${r.capacity}` },
            ]}
            rows={rows}
          />
        )}
      </div>
    </>
  );
}
