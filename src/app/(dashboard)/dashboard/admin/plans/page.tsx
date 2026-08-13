import { getPlanBreakdown } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

type PlanRow = { id: string; plan: string; price: string; memberCount: number };

export default async function AdminPlansPage() {
  const plans = await getPlanBreakdown();

  return (
    <>
      <Topbar title="Membership plans" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {plans.length === 0 ? (
          <EmptyState body="No active plans yet." />
        ) : (
          <DataTable<PlanRow>
            columns={[
              { header: "Plan", render: (r) => r.plan },
              { header: "Price", render: (r) => r.price },
              { header: "Members", render: (r) => String(r.memberCount) },
            ]}
            rows={plans.map((p) => ({ id: p.plan, ...p }))}
          />
        )}
      </div>
    </>
  );
}
