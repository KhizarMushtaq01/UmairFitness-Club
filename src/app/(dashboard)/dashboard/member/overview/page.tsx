import { requireSession } from "@/lib/rbac";
import { getMemberOverview } from "@/features/analytics/queries";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function MemberOverviewPage() {
  const session = await requireSession();
  const { stats, upNext } = await getMemberOverview(session.user.id);

  return (
    <>
      <Topbar title="Overview" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        {upNext.length === 0 ? (
          <EmptyState
            body="Book a class to see it here."
            ctaLabel="Browse classes"
            ctaHref="/dashboard/member/bookings"
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
      </div>
    </>
  );
}
