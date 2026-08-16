import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    notification: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedFindUnique = db.notification.findUnique as unknown as Mock;
const mockedUpdate = db.notification.update as unknown as Mock;
const mockedUpdateMany = db.notification.updateMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markNotificationRead", () => {
  it("throws when the notification belongs to another user", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    mockedFindUnique.mockResolvedValue({ id: "n1", userId: "someone-else" });

    await expect(markNotificationRead({ notificationId: "n1" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("throws when there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(markNotificationRead({ notificationId: "n1" })).rejects.toThrow("Unauthorized");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("marks the caller's own notification read", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    mockedFindUnique.mockResolvedValue({ id: "n1", userId: "u1" });

    const result = await markNotificationRead({ notificationId: "n1" });
    expect(result).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("markAllNotificationsRead", () => {
  it("only clears the caller's unread notifications", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await markAllNotificationsRead();
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { userId: "u1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
