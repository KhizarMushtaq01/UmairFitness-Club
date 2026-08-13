import { requireSession } from "@/lib/rbac";
import { getMemberWorkoutPlan } from "@/features/workouts/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

type ExerciseRow = { id: string; name: string; sets: string; load: string; tempo: string };

export default async function MemberWorkoutsPage() {
  const session = await requireSession();
  const plan = await getMemberWorkoutPlan(session.user.id);

  return (
    <>
      <Topbar title="Workout plan" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {!plan ? (
          <EmptyState body="No program assigned yet. Your coach will assign one after your first assessment." />
        ) : (
          <>
            <div
              style={{ fontFamily: "var(--font-heading)" }}
              className="text-[30px] tracking-[.06em]"
            >
              {plan.programName}
            </div>
            {plan.days.map((d) => (
              <div key={d.day} className="bg-[var(--card)] border border-[var(--line)]">
                <div className="p-4 border-b border-[var(--line)] flex justify-between">
                  <span style={{ fontFamily: "var(--font-heading)" }}>
                    {d.day} — {d.focus}
                  </span>
                </div>
                <DataTable<ExerciseRow>
                  columns={[
                    { header: "Exercise", render: (e) => e.name },
                    { header: "Sets", render: (e) => e.sets },
                    { header: "Load", render: (e) => e.load },
                    { header: "Tempo", render: (e) => e.tempo },
                  ]}
                  rows={d.exercises.map((e, i) => ({ id: `${d.day}-${i}`, ...e }))}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
