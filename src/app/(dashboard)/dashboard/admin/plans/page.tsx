import { getPlanBreakdown } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { PlanRowEditor } from "./PlanRowEditor";

type PlanRow = Awaited<ReturnType<typeof getPlanBreakdown>>[number];

export default async function AdminPlansPage() {
  const plans = await getPlanBreakdown();

  return (
    <>
      <Topbar title="Membership plans" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {plans.length === 0 ? (
          <EmptyState body="No plans have been configured yet." />
        ) : (
          <DataTable<PlanRow>
            columns={[
              { header: "Plan", render: (r) => r.name },
              { header: "Key", render: (r) => r.key },
              { header: "Price", render: (r) => r.price },
              { header: "Members", render: (r) => String(r.memberCount) },
              {
                header: "",
                render: (r) => (
                  <PlanRowEditor planKey={r.key} name={r.name} priceCents={r.priceCents} />
                ),
              },
            ]}
            rows={plans}
          />
        )}
      </div>
    </>
  );
}
