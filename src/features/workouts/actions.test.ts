import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({ db: { attendanceLog: { create: vi.fn() } } }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { markAttendance } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedCreate = db.attendanceLog.create as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markAttendance", () => {
  it("rejects members (only trainers/admins may mark attendance)", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    await expect(markAttendance({ memberId: "m1" })).rejects.toThrow("Forbidden");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejects when there is no session", async () => {
    mockedGetSession.mockResolvedValue(null);
    await expect(markAttendance({ memberId: "m1" })).rejects.toThrow("Unauthorized");
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("creates an attendance log for trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "coach1", role: "TRAINER" } });
    mockedCreate.mockResolvedValue({ id: "log1" });
    const result = await markAttendance({ memberId: "m1" });
    expect(result).toEqual({ ok: true });
    expect(mockedCreate).toHaveBeenCalledWith({ data: { userId: "m1" } });
  });

  it("creates an attendance log for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockedCreate.mockResolvedValue({ id: "log2" });
    await expect(markAttendance({ memberId: "m1" })).resolves.toEqual({ ok: true });
  });
});
