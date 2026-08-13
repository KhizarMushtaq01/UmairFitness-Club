import { requireSession } from "@/lib/rbac";
import { getMemberInvoices } from "@/features/payments/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

type InvoiceRow = Awaited<ReturnType<typeof getMemberInvoices>>[number];

export default async function MemberPaymentsPage() {
  const session = await requireSession();
  const invoices = await getMemberInvoices(session.user.id);

  return (
    <>
      <Topbar title="Payments & invoices" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {invoices.length === 0 ? (
          <EmptyState body="No invoices yet." />
        ) : (
          <DataTable<InvoiceRow>
            columns={[
              { header: "Invoice", render: (r) => r.desc },
              { header: "Date", render: (r) => r.date },
              { header: "Amount", render: (r) => r.amount },
              {
                header: "Status",
                render: (r) => <StatusBadge label={r.status} color={r.statusColor} />,
              },
            ]}
            rows={invoices}
          />
        )}
      </div>
    </>
  );
}
