import { db } from "@/lib/db";

export async function getMemberInvoices(userId: string) {
  const invoices = await db.invoice.findMany({ where: { userId }, orderBy: { issuedAt: "desc" } });
  return invoices.map((inv) => ({
    id: inv.id,
    desc: inv.desc,
    date: inv.issuedAt.toLocaleDateString(),
    amount: `$${(inv.amount / 100).toFixed(2)}`,
    status: inv.status,
    statusColor: inv.status === "REFUNDED" ? "var(--red)" : "var(--mut)",
  }));
}
