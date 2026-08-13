import { requireSession } from "@/lib/rbac";
import { getTrainerOverview } from "@/features/analytics/queries";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function TrainerOverviewPage() {
  const session = await requireSession();
  const { stats, sessionsToday } = await getTrainerOverview(session.user.id);

  return (
    <>
      <Topbar title="Overview" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        {sessionsToday.length === 0 ? (
          <EmptyState body="No classes scheduled." />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {sessionsToday.map((s, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg w-16">
                  {s.time}
                </div>
                <div>
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-[var(--dim)] text-xs">
                    {s.room} · {s.attendees}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
