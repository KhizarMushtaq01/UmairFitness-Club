import { getAdminAnalytics } from "@/features/analytics/queries";
import { StatCard } from "@/components/shared/StatCard";
import { Topbar } from "@/components/shared/Topbar";

export default async function AdminAnalyticsPage() {
  const { stats, planMix } = await getAdminAnalytics();

  return (
    <>
      <Topbar title="Analytics" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
        <div className="bg-[var(--card)] border border-[var(--line)] p-5">
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)] mb-3">
            Plan mix
          </div>
          {planMix.map((p) => (
            <div
              key={p.plan}
              className="flex justify-between py-2 border-b border-[var(--line)] last:border-0 text-sm"
            >
              <span>{p.plan}</span>
              <span className="font-semibold">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
