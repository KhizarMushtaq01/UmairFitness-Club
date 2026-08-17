import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({ db: { plan: { update: vi.fn() } } }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { updatePlan } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedUpdate = db.plan.update as unknown as Mock;
const validInput = { key: "FIGHTER", name: "Fighter", priceCents: 15900 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updatePlan", () => {
  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(updatePlan(validInput)).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(updatePlan(validInput)).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects a negative price before touching the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updatePlan({ ...validInput, priceCents: -1 })).rejects.toThrow();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects a fractional price, since cents are the smallest unit", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updatePlan({ ...validInput, priceCents: 8900.5 })).rejects.toThrow();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("updates the plan by key for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updatePlan(validInput)).resolves.toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { key: "FIGHTER" },
      data: { name: "Fighter", priceCents: 15900 },
    });
  });

  it("revalidates both public pages that show prices", async () => {
    // getPublicPlans has two callers: the pricing page and the homepage. A
    // price edit that only revalidated the admin screen would leave the old
    // price on the public site until the next deploy.
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await updatePlan(validInput);

    const paths = (revalidatePath as unknown as Mock).mock.calls.map((c) => c[0]);
    expect(paths).toContain("/pricing");
    expect(paths).toContain("/");
  });
});
