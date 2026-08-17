"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import {
  addProductSchema,
  type AddProductInput,
  advanceOrderStatusSchema,
  type AdvanceOrderStatusInput,
  updateProductSchema,
  type UpdateProductInput,
  deleteProductSchema,
  type DeleteProductInput,
} from "./schemas";
import { notify } from "@/features/notifications/notify";
import { revalidatePath } from "next/cache";

export async function addProduct(rawInput: AddProductInput) {
  const input = addProductSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.product.create({ data: input });
  revalidatePath("/dashboard/admin/shop");
  return { ok: true as const };
}

// Forward only, and DELIVERED is terminal — an order with no entry here
// cannot advance. Expressed as a map rather than an if-chain so adding a
// stage is one line and the terminal case stays "no entry".
const NEXT_ORDER_STATUS: Record<string, string | undefined> = {
  PACKING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export async function advanceOrderStatus(rawInput: AdvanceOrderStatusInput) {
  const input = advanceOrderStatusSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // Reading the current status and writing the next one happen in one
  // transaction: two admins advancing the same order at once must not skip a
  // stage. Same SQLite caveat as bookClass — Prisma's interactive
  // transactions are deferred here, so the loser more likely gets
  // SQLITE_BUSY than a stale read.
  const advanced = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new Error("Not found: no such order");

    const next = NEXT_ORDER_STATUS[order.status];
    if (!next) throw new Error(`Conflict: a ${order.status} order cannot be advanced`);

    await tx.order.update({ where: { id: order.id }, data: { status: next } });
    return { customerId: order.userId, next };
  });

  // The customer, not the admin who clicked. notify never rejects, so the
  // committed status change cannot be undone by a delivery failure.
  await notify(
    advanced.customerId,
    "Order update",
    `Your order has been marked ${advanced.next.toLowerCase()}.`
  );

  revalidatePath("/dashboard/admin/orders");
  return { ok: true as const, status: advanced.next as "SHIPPED" | "DELIVERED" };
}

export async function updateProduct(rawInput: UpdateProductInput) {
  const input = updateProductSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  const { productId, ...fields } = input;
  await db.product.update({ where: { id: productId }, data: fields });

  revalidatePath("/dashboard/admin/shop");
  return { ok: true as const };
}

export async function deleteProduct(rawInput: DeleteProductInput) {
  const input = deleteProductSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // OrderItem.product has no onDelete cascade, so a product with order
  // history cannot be removed. Checking first turns an opaque foreign-key
  // error into a reason the admin can act on.
  const used = await db.orderItem.findFirst({ where: { productId: input.productId } });
  if (used) throw new Error("Conflict: this product appears in an order and cannot be deleted");

  await db.product.delete({ where: { id: input.productId } });

  revalidatePath("/dashboard/admin/shop");
  return { ok: true as const };
}
