import { requireSession } from "@/lib/rbac";
import { getMemberOverview } from "@/features/analytics/queries";
import { getAttendanceSummary } from "@/features/workouts/queries";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function MemberOverviewPage() {
  const session = await requireSession();
  const [{ stats, upNext }, attendance] = await Promise.all([
    getMemberOverview(session.user.id),
    getAttendanceSummary(session.user.id),
  ]);

  const streakCard = {
    label: "Check-in streak",
    value: `${attendance.streak}`,
    delta: attendance.streak === 1 ? "day" : "days",
    deltaColor: attendance.streak > 0 ? "var(--red)" : "var(--mut)",
  };

  return (
    <>
      <Topbar title="Overview" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[streakCard, ...stats].map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {upNext.length === 0 ? (
          <EmptyState
            body="Book a class to see it here."
            ctaLabel="Browse classes"
            ctaHref="/dashboard/member/classes"
          />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {upNext.map((n, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg">
                  {n.time}
                </div>
                <div>
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-[var(--dim)] text-xs">{n.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-[var(--card)] border border-[var(--line)]">
          <div className="p-4 border-b border-[var(--line)] text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Recent check-ins
          </div>
          {attendance.recent.length === 0 ? (
            <p className="p-4 text-[var(--mut)] text-sm">
              No check-ins yet. Your coach marks attendance when you train.
            </p>
          ) : (
            attendance.recent.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap gap-x-4 gap-y-1 p-4 border-b border-[var(--line)] last:border-0 text-sm"
              >
                <span className="font-semibold">{r.date}</span>
                <span className="text-[var(--dim)]">{r.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
