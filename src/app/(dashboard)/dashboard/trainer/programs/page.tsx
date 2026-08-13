import { requireSession } from "@/lib/rbac";
import { getTrainerPrograms } from "@/features/workouts/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function TrainerProgramsPage() {
  const session = await requireSession();
  const programs = await getTrainerPrograms(session.user.id);

  return (
    <>
      <Topbar title="Programs" />
      {programs.length === 0 ? (
        // EmptyState spans the full width rather than sitting in one grid cell.
        <div className="p-4 md:p-7 max-w-[1200px]">
          <EmptyState body="No programs created yet." />
        </div>
      ) : (
        <div className="p-4 md:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1200px]">
          {programs.map((p) => (
            <div key={p.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-xl">
                {p.name}
              </div>
              <div className="text-[var(--dim)] text-xs mt-1">{p.weeks} weeks</div>
              <div className="text-[var(--red)] text-sm font-semibold mt-3">
                {p.assignedCount} assigned
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
