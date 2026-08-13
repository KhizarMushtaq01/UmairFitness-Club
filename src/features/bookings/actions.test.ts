import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { booking: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/rbac", async () => {
  // assertRole is pure, so use the real one; only getSession needs stubbing.
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { cancelBooking } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedFindUnique = db.booking.findUnique as unknown as Mock;
const mockedUpdate = db.booking.update as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cancelBooking", () => {
  it("throws if the booking belongs to a different user", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    mockedFindUnique.mockResolvedValue({ id: "b1", userId: "someone-else" });

    await expect(cancelBooking({ bookingId: "b1" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("throws if there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(cancelBooking({ bookingId: "b1" })).rejects.toThrow("Unauthorized");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("cancels the booking when it belongs to the caller", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    mockedFindUnique.mockResolvedValue({ id: "b1", userId: "u1" });
    mockedUpdate.mockResolvedValue({ id: "b1", status: "CANCELLED" });

    const result = await cancelBooking({ bookingId: "b1" });
    expect(result).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "CANCELLED" },
    });
  });
});
