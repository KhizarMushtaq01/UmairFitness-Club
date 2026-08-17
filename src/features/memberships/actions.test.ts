import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
    plan: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { updateUserRole, updateMembership } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedUpdate = db.user.update as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateUserRole", () => {
  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });
    await expect(updateUserRole({ userId: "u2", role: "ADMIN" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects members trying to promote themselves", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    await expect(updateUserRole({ userId: "u1", role: "ADMIN" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects a role value outside the allowed set", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    await expect(
      updateUserRole({ userId: "u2", role: "SUPERUSER" as never })
    ).rejects.toThrow();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("updates the role for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    mockedUpdate.mockResolvedValue({ id: "u2", role: "TRAINER" });
    const result = await updateUserRole({ userId: "u2", role: "TRAINER" });
    expect(result).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { role: "TRAINER" },
    });
  });
});

describe("updateMembership", () => {
  const validInput = { userId: "u2", plan: "FIGHTER", status: "ACTIVE" } as const;

  beforeEach(() => {
    (db.plan.findUnique as unknown as Mock).mockResolvedValue({ id: "pl1", key: "FIGHTER" });
    (db.membership.findFirst as unknown as Mock).mockResolvedValue({
      id: "m1",
      userId: "u2",
      plan: "CONTENDER",
      status: "TRIAL",
    });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(updateMembership(validInput)).rejects.toThrow("Forbidden");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(updateMembership(validInput)).rejects.toThrow("Forbidden");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects a status outside the allowed set before touching the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(
      updateMembership({ ...validInput, status: "PLATINUM" as never })
    ).rejects.toThrow();
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects a plan key that no Plan row matches", async () => {
    // A server action is a public endpoint. The select only ever offers real
    // plans, but a direct call with a made-up key would orphan the membership
    // from the price list, and every plan-joined query would show "—".
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.plan.findUnique as unknown as Mock).mockResolvedValue(null);

    await expect(updateMembership({ ...validInput, plan: "GHOST" })).rejects.toThrow("Not found");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects a member who has no membership row", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.membership.findFirst as unknown as Mock).mockResolvedValue(null);

    await expect(updateMembership(validInput)).rejects.toThrow("Not found");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("edits the newest membership when a member has more than one", async () => {
    // getAllMembers displays the newest membership; editing an older row
    // would change nothing the admin can see. The orderBy is the assertion
    // that bites — dropping it would still return a row and still pass a
    // test that only checked the update call.
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await updateMembership(validInput);

    expect(db.membership.findFirst).toHaveBeenCalledWith({
      where: { userId: "u2" },
      orderBy: { createdAt: "desc" },
    });
    expect(db.membership.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { plan: "FIGHTER", status: "ACTIVE" },
    });
  });

  it("returns ok for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updateMembership(validInput)).resolves.toEqual({ ok: true });
  });
});
