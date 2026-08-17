import { db } from "@/lib/db";

export async function getAllProducts() {
  const products = await db.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: `$${(p.price / 100).toFixed(2)}`,
    stock: p.stock,
    category: p.category,
    stockColor: p.stock < 10 ? "var(--red)" : "var(--mut)",
    // Raw values alongside the formatted ones: the table shows `price`, the
    // edit form needs the integer it was derived from.
    priceCents: p.price,
    stockCount: p.stock,
  }));
}

export async function getAllOrders() {
  const orders = await db.order.findMany({
    include: { user: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => ({
    id: o.id,
    customer: o.user.name,
    items: o.items.map((i) => `${i.product.name} ×${i.qty}`).join(", "),
    status: o.status,
    statusColor:
      o.status === "DELIVERED"
        ? "var(--dim)"
        : o.status === "SHIPPED"
          ? "var(--mut)"
          : "var(--red)",
    // The UI's "can this advance?" must agree with the action's own rule, so
    // both read the same terminal state rather than each listing statuses.
    canAdvance: o.status !== "DELIVERED",
  }));
}
