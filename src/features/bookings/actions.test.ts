import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Shared across the db and notify mock factories (both are hoisted above
// imports, so vi.hoisted is the only way to hand them a common array) so
// tests can prove notify runs strictly after the transaction commits rather
// than merely that notify was called at all.
const order = vi.hoisted(() => [] as string[]);

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
      // Records "transaction" only once the callback has resolved, so a
      // notify call made from inside the callback would be recorded first.
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => {
        const result = await fn(tx);
        order.push("transaction");
        return result;
      }),
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
vi.mock("@/features/notifications/notify", () => ({
  notify: vi.fn(async () => {
    order.push("notify");
  }),
}));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { notify } from "@/features/notifications/notify";
import { cancelBooking, bookClass } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const tx = (db as unknown as { __tx: {
  class: { findUnique: Mock };
  booking: { findUnique: Mock; findFirst: Mock; count: Mock; create: Mock; update: Mock };
} }).__tx;
const mockedNotify = notify as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  order.length = 0;
});

describe("cancelBooking", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    tx.booking.findFirst.mockResolvedValue(null);
  });

  it("throws if the booking belongs to a different user", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "someone-else", status: "CONFIRMED" });

    await expect(cancelBooking({ bookingId: "b1" })).rejects.toThrow("Forbidden");
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("throws if there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(cancelBooking({ bookingId: "b1" })).rejects.toThrow("Unauthorized");
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("cancels the booking when it belongs to the caller", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });

    const result = await cancelBooking({ bookingId: "b1" });

    expect(result).toEqual({ ok: true });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "CANCELLED" },
    });
  });

  it("notifies the member who cancelled", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });
    tx.booking.findFirst.mockResolvedValue(null);

    await cancelBooking({ bookingId: "b1" });

    // Spec §2: cancelled is one of the four notify-worthy booking events.
    // Before this fix, only the promoted member (if any) was ever notified —
    // the member who cancelled was told nothing.
    expect(mockedNotify).toHaveBeenCalledWith(
      "u1",
      expect.stringContaining("cancel"),
      expect.any(String)
    );
  });

  it("promotes the oldest waitlisted member into the freed seat", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });
    tx.booking.findFirst.mockResolvedValue({ id: "b2", userId: "u2", classId: "c1", status: "WAITLIST" });

    await cancelBooking({ bookingId: "b1" });

    expect(tx.booking.findFirst).toHaveBeenCalledWith({
      where: { classId: "c1", status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
    });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: "b2" },
      data: { status: "CONFIRMED" },
    });
    expect(mockedNotify).toHaveBeenCalledWith("u2", expect.stringContaining("seat"), expect.any(String));
    // Both the cancelling member and the promoted member are notified, and
    // both notifications happen strictly after the transaction commits.
    // Same reasoning as bookClass's ordering test: a THAT-was-called
    // assertion can't tell "notify after commit" from "notify from inside
    // the transaction callback" — only the recorded order can.
    expect(order).toEqual(["transaction", "notify", "notify"]);
  });

  it("notifies the cancelling member even when there is nobody to promote", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b3", userId: "u1", classId: "c1", status: "WAITLIST" });

    await cancelBooking({ bookingId: "b3" });

    // No seat was freed, so the waitlist is never consulted and nobody is
    // promoted — but the cancelling member is still told.
    expect(tx.booking.findFirst).not.toHaveBeenCalled();
    expect(mockedNotify).toHaveBeenCalledTimes(1);
    expect(mockedNotify).toHaveBeenCalledWith("u1", expect.any(String), expect.any(String));
  });

  it("promotes nobody when the waitlist is empty", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });
    tx.booking.findFirst.mockResolvedValue(null);

    await cancelBooking({ bookingId: "b1" });

    expect(tx.booking.update).toHaveBeenCalledTimes(1); // the cancel itself only
    expect(mockedNotify).toHaveBeenCalledTimes(1); // the cancelling member only
  });

  it("still resolves ok when notify fails after a promotion, since the transaction already committed", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });
    tx.booking.findFirst.mockResolvedValue({ id: "b2", userId: "u2", classId: "c1", status: "WAITLIST" });
    mockedNotify.mockRejectedValueOnce(new Error("notify boom"));

    const result = await cancelBooking({ bookingId: "b1" });

    expect(result).toEqual({ ok: true });
  });

  it("still notifies the promoted member when notifying the cancelling member fails", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });
    tx.booking.findFirst.mockResolvedValue({ id: "b2", userId: "u2", classId: "c1", status: "WAITLIST" });
    // Only the first notify() call (cancelling member) rejects — the second
    // (promoted member) must still fire. One failing notify must not
    // suppress the other.
    mockedNotify.mockRejectedValueOnce(new Error("notify boom"));

    const result = await cancelBooking({ bookingId: "b1" });

    expect(result).toEqual({ ok: true });
    expect(mockedNotify).toHaveBeenCalledTimes(2);
    expect(mockedNotify).toHaveBeenNthCalledWith(2, "u2", expect.stringContaining("seat"), expect.any(String));
  });
});

describe("bookClass", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    tx.class.findUnique.mockResolvedValue({
      id: "c1",
      title: "Boxing 101",
      capacity: 2,
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
    });
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
    // Pins the count to CONFIRMED-only rows — dropping that filter would let
    // cancelled or already-waitlisted rows consume seats too.
    expect(tx.booking.count).toHaveBeenCalledWith({
      where: { classId: "c1", status: "CONFIRMED" },
    });
    expect(tx.booking.create).toHaveBeenCalledWith({
      data: { userId: "u1", classId: "c1", status: "WAITLIST" },
    });
  });

  it("confirms under a capacity other than the fixture default", async () => {
    // capacity 5, three confirmed already: 3 < 5 must confirm. A hardcoded
    // `< 2` comparison would wrongly waitlist this (3 is not < 2).
    tx.class.findUnique.mockResolvedValue({
      id: "c1",
      title: "Boxing 101",
      capacity: 5,
      startsAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    tx.booking.count.mockResolvedValue(3);

    const result = await bookClass({ classId: "c1" });

    expect(result).toEqual({ ok: true, status: "CONFIRMED" });
  });

  it("rejects a second active booking for the same class", async () => {
    tx.booking.findFirst.mockResolvedValue({ id: "b1", status: "CONFIRMED" });

    await expect(bookClass({ classId: "c1" })).rejects.toThrow("Conflict");
    // Pins the conflict check to CONFIRMED/WAITLIST rows specifically —
    // widening it (e.g. to any status) would block rebooking after a cancel.
    expect(tx.booking.findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", classId: "c1", status: { in: ["CONFIRMED", "WAITLIST"] } },
    });
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("allows a member whose only booking for the class was cancelled to book it again", async () => {
    // The real findFirst query scopes to status in [CONFIRMED, WAITLIST], so
    // a member with only a CANCELLED row for this class gets null back here.
    tx.booking.findFirst.mockResolvedValue(null);
    tx.booking.count.mockResolvedValue(0);

    const result = await bookClass({ classId: "c1" });

    expect(result).toEqual({ ok: true, status: "CONFIRMED" });
    expect(tx.booking.findFirst).toHaveBeenCalledWith({
      where: { userId: "u1", classId: "c1", status: { in: ["CONFIRMED", "WAITLIST"] } },
    });
    expect(tx.booking.create).toHaveBeenCalled();
  });

  it("rejects an unknown class", async () => {
    tx.class.findUnique.mockResolvedValue(null);

    await expect(bookClass({ classId: "nope" })).rejects.toThrow("Not found");
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("rejects booking a class that has already started", async () => {
    // getBookableClasses filters to startsAt >= now, but bookClass is a
    // separately callable server action — it must enforce this itself
    // rather than trust that callers only ever pass classIds the query
    // surfaced.
    tx.class.findUnique.mockResolvedValue({
      id: "c1",
      title: "Boxing 101",
      capacity: 2,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    await expect(bookClass({ classId: "c1" })).rejects.toThrow("Conflict");
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
    // Because $transaction runs its callback inline, a THAT-was-called
    // assertion alone can't tell "notify called after commit" from "notify
    // called from inside the transaction callback" — only the recorded
    // order can. The db mock pushes "transaction" once the callback
    // resolves; the notify mock pushes "notify" when it runs.
    expect(order).toEqual(["transaction", "notify"]);
  });

  it("still resolves the booking when notify fails, since the booking already committed", async () => {
    tx.booking.count.mockResolvedValue(1);
    mockedNotify.mockRejectedValueOnce(new Error("notify boom"));

    const result = await bookClass({ classId: "c1" });

    expect(result).toEqual({ ok: true, status: "CONFIRMED" });
  });
});
