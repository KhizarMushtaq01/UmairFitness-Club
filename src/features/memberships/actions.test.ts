import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({ db: { user: { update: vi.fn() } } }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { updateUserRole } from "./actions";

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
