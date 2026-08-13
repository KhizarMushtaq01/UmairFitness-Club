import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({ db: { product: { create: vi.fn() } } }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { addProduct } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedCreate = db.product.create as unknown as Mock;
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
