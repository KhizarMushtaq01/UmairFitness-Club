import { getAllOrders } from "@/features/shop/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

type OrderRow = Awaited<ReturnType<typeof getAllOrders>>[number];

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();

  return (
    <>
      <Topbar title="Orders" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {orders.length === 0 ? (
          <EmptyState body="No orders yet." />
        ) : (
          <DataTable<OrderRow>
            columns={[
              { header: "Customer", render: (r) => r.customer },
              { header: "Items", render: (r) => r.items },
              {
                header: "Status",
                render: (r) => <StatusBadge label={r.status} color={r.statusColor} />,
              },
            ]}
            rows={orders}
          />
        )}
      </div>
    </>
  );
}
