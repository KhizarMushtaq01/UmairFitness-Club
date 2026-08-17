import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => {
  const tx = { order: { findUnique: vi.fn(), update: vi.fn() } };
  return {
    db: {
      product: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      orderItem: { findFirst: vi.fn() },
      // Runs the callback inline — there is no real transaction here. The same
      // tx object every time, so assertions can reach it.
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
vi.mock("@/features/notifications/notify", () => ({ notify: vi.fn() }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { notify } from "@/features/notifications/notify";
import { addProduct, advanceOrderStatus, updateProduct, deleteProduct } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedCreate = db.product.create as unknown as Mock;
const tx = (db as unknown as { __tx: { order: { findUnique: Mock; update: Mock } } }).__tx;
const mockedNotify = notify as unknown as Mock;
const validInput = { name: "Gloves", price: 12000, stock: 10, category: "Gear" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addProduct", () => {
  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });
    await expect(addProduct(validInput)).rejects.toThrow("Forbidden");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    await expect(addProduct(validInput)).rejects.toThrow("Forbidden");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid input before touching the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    await expect(addProduct({ ...validInput, price: -5 })).rejects.toThrow();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("creates a product for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    mockedCreate.mockResolvedValue({ id: "p1" });
    const result = await addProduct(validInput);
    expect(result).toEqual({ ok: true });
    expect(mockedCreate).toHaveBeenCalledWith({ data: validInput });
  });
});

describe("advanceOrderStatus", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(advanceOrderStatus({ orderId: "o1" })).rejects.toThrow("Forbidden");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(advanceOrderStatus({ orderId: "o1" })).rejects.toThrow("Forbidden");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("moves PACKING to SHIPPED", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "PACKING" });

    await expect(advanceOrderStatus({ orderId: "o1" })).resolves.toEqual({
      ok: true,
      status: "SHIPPED",
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { status: "SHIPPED" },
    });
  });

  it("moves SHIPPED to DELIVERED", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "SHIPPED" });

    await expect(advanceOrderStatus({ orderId: "o1" })).resolves.toEqual({
      ok: true,
      status: "DELIVERED",
    });
  });

  it("refuses to advance a DELIVERED order, because it is terminal", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "DELIVERED" });

    await expect(advanceOrderStatus({ orderId: "o1" })).rejects.toThrow("Conflict");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown order", async () => {
    tx.order.findUnique.mockResolvedValue(null);

    await expect(advanceOrderStatus({ orderId: "nope" })).rejects.toThrow("Not found");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("notifies the customer, not the admin who clicked", async () => {
    // The session user is u1 and the order belongs to c1. Passing the session
    // id here would email the wrong person, and a test that only checked
    // "notify was called" would not catch it.
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "PACKING" });

    await advanceOrderStatus({ orderId: "o1" });

    expect(mockedNotify).toHaveBeenCalledTimes(1);
    expect(mockedNotify).toHaveBeenCalledWith(
      "c1",
      expect.any(String),
      expect.stringContaining("shipped")
    );
  });

  it("reads and writes the status inside one transaction", async () => {
    // Read-then-write on status is check-then-act: two admins clicking at
    // once could take a PACKING order to DELIVERED in one round trip.
    // Deleting db.$transaction would leave every other test in this block
    // green, so this is the assertion that pins it.
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "PACKING" });

    await advanceOrderStatus({ orderId: "o1" });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("updateProduct", () => {
  const validInput = {
    productId: "p1",
    name: "Gloves",
    price: 12000,
    stock: 10,
    category: "Gear",
  };

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(updateProduct(validInput)).rejects.toThrow("Forbidden");
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("rejects a negative price before touching the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updateProduct({ ...validInput, price: -1 })).rejects.toThrow();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("allows zero stock, which is how a sold-out product is recorded", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updateProduct({ ...validInput, stock: 0 })).resolves.toEqual({ ok: true });
  });

  it("writes the edited fields but never the id", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await updateProduct(validInput);

    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { name: "Gloves", price: 12000, stock: 10, category: "Gear" },
    });
  });
});

describe("deleteProduct", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.orderItem.findFirst as unknown as Mock).mockResolvedValue(null);
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(deleteProduct({ productId: "p1" })).rejects.toThrow("Forbidden");
    expect(db.product.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete a product that appears in an order", async () => {
    // OrderItem.product has no cascade, so this delete would fail at the
    // database anyway — but with a foreign-key error nobody can act on.
    (db.orderItem.findFirst as unknown as Mock).mockResolvedValue({ id: "oi1", productId: "p1" });

    await expect(deleteProduct({ productId: "p1" })).rejects.toThrow("Conflict");
    expect(db.product.delete).not.toHaveBeenCalled();
  });

  it("checks order history before deleting, not after", async () => {
    // Deleting first and catching the failure would leave the row gone on any
    // database that does cascade. Asserting the lookup happened with the
    // right productId is what pins the order of operations.
    await deleteProduct({ productId: "p1" });

    expect(db.orderItem.findFirst).toHaveBeenCalledWith({ where: { productId: "p1" } });
    expect(db.product.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("deletes a product with no order history", async () => {
    await expect(deleteProduct({ productId: "p1" })).resolves.toEqual({ ok: true });
  });
});
