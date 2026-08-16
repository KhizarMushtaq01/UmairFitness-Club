import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => {
  const tx = {
    class: { findUnique: vi.fn() },
    booking: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return {
    db: {
      booking: { findUnique: vi.fn(), update: vi.fn() },
      // Hand the callback the same tx object every time so assertions can
      // reach it, and run it inline — there is no real transaction here.
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
vi.mock("@/lib/rbac", async () => {
  // assertRole is pure, so use the real one; only getSession needs stubbing.
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/notifications/notify", () => ({ notify: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { notify } from "@/features/notifications/notify";
import { cancelBooking, bookClass } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedFindUnique = db.booking.findUnique as unknown as Mock;
const mockedUpdate = db.booking.update as unknown as Mock;
const tx = (db as unknown as { __tx: {
  class: { findUnique: Mock };
  booking: { findUnique: Mock; findFirst: Mock; count: Mock; create: Mock; update: Mock };
} }).__tx;
const mockedNotify = notify as unknown as Mock;

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

describe("bookClass", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    tx.class.findUnique.mockResolvedValue({ id: "c1", title: "Boxing 101", capacity: 2 });
    tx.booking.findFirst.mockResolvedValue(null);
    tx.booking.create.mockResolvedValue({ id: "b9" });
  });

  it("confirms the booking while the class is under capacity", async () => {
    tx.booking.count.mockResolvedValue(1); // capacity 2, one seat left

    const result = await bookClass({ classId: "c1" });

    expect(result).toEqual({ ok: true, status: "CONFIRMED" });
    expect(tx.booking.create).toHaveBeenCalledWith({
      data: { userId: "u1", classId: "c1", status: "CONFIRMED" },
    });
  });

  it("waitlists the booking once the class is full", async () => {
    tx.booking.count.mockResolvedValue(2); // capacity 2, no seats left

    const result = await bookClass({ classId: "c1" });

    expect(result).toEqual({ ok: true, status: "WAITLIST" });
    expect(tx.booking.create).toHaveBeenCalledWith({
      data: { userId: "u1", classId: "c1", status: "WAITLIST" },
    });
  });

  it("rejects a second active booking for the same class", async () => {
    tx.booking.findFirst.mockResolvedValue({ id: "b1", status: "CONFIRMED" });

    await expect(bookClass({ classId: "c1" })).rejects.toThrow("Conflict");
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown class", async () => {
    tx.class.findUnique.mockResolvedValue(null);

    await expect(bookClass({ classId: "nope" })).rejects.toThrow("Not found");
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("throws when there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(bookClass({ classId: "c1" })).rejects.toThrow("Unauthorized");
  });

  it("notifies the member after the transaction commits", async () => {
    tx.booking.count.mockResolvedValue(0);

    await bookClass({ classId: "c1" });

    expect(mockedNotify).toHaveBeenCalledWith("u1", expect.stringContaining("Booked"), expect.any(String));
  });
});
