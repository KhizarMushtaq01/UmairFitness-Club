import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => {
  const tx = { order: { findUnique: vi.fn(), update: vi.fn() } };
  return {
    db: {
      product: { create: vi.fn() },
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
import { addProduct, advanceOrderStatus } from "./actions";

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
