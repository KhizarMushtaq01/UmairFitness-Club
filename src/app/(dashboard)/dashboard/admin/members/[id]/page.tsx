import { notFound } from "next/navigation";
import { getMemberDetail } from "@/features/memberships/queries";
import { Topbar } from "@/components/shared/Topbar";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { MembershipForm } from "./MembershipForm";

type Detail = NonNullable<Awaited<ReturnType<typeof getMemberDetail>>>;
type BookingRow = Detail["bookings"][number];
type InvoiceRow = Detail["invoices"][number];
type AttendanceRow = Detail["attendance"][number];

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getMemberDetail(id);
  if (!detail) notFound();

  return (
    <>
      <Topbar title={detail.name} />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Plan" value={detail.plan} />
          <StatCard label="Status" value={detail.status} />
          <StatCard label="Bookings" value={String(detail.bookingCount)} />
          <StatCard label="Check-ins" value={String(detail.attendanceCount)} />
        </div>

        <div className="bg-[var(--card)] border border-[var(--line)] p-5">
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Member
          </div>
          <div className="text-sm mt-2">{detail.email}</div>
          <div className="text-[var(--dim)] text-xs mt-1">Member since {detail.memberSince}</div>
        </div>

        <MembershipForm
          userId={detail.id}
          plan={detail.plan}
          status={detail.status}
          planOptions={detail.planOptions}
        />

        <section className="flex flex-col gap-3">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
            Recent bookings
          </h2>
          {detail.bookings.length === 0 ? (
            <EmptyState body="This member has not booked a class yet." />
          ) : (
            <DataTable<BookingRow>
              columns={[
                { header: "Class", render: (r) => r.title },
                { header: "Date", render: (r) => r.day },
                { header: "Status", render: (r) => <StatusBadge label={r.status} color="var(--mut)" /> },
              ]}
              rows={detail.bookings}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
            Invoices
          </h2>
          {detail.invoices.length === 0 ? (
            <EmptyState body="No invoices have been issued to this member." />
          ) : (
            <DataTable<InvoiceRow>
              columns={[
                { header: "Description", render: (r) => r.desc },
                { header: "Amount", render: (r) => r.amount },
                { header: "Issued", render: (r) => r.issuedAt },
                { header: "Status", render: (r) => <StatusBadge label={r.status} color="var(--mut)" /> },
              ]}
              rows={detail.invoices}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
            Attendance
          </h2>
          {detail.attendance.length === 0 ? (
            <EmptyState body="This member has never checked in." />
          ) : (
            <DataTable<AttendanceRow>
              columns={[{ header: "Checked in", render: (r) => r.date }]}
              rows={detail.attendance}
            />
          )}
        </section>
      </div>
    </>
  );
}
