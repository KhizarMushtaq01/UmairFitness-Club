import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    class: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { getBookableClasses } from "./queries";

const mockedFindManyClasses = db.class.findMany as unknown as Mock;

const baseClass = {
  id: "c1",
  title: "Boxing 101",
  discipline: "Boxing",
  room: "Ring A",
  capacity: 3,
  startsAt: new Date(Date.now() + 60 * 60 * 1000),
  coach: { name: "Coach Amy" },
};

describe("getBookableClasses", () => {
  it("counts only CONFIRMED bookings toward seatsLeft", async () => {
    // Regression for dropping `.filter((b) => b.status === "CONFIRMED")`
    // from the confirmed count: cancelled and waitlisted rows must not
    // consume seats. capacity 3, one CONFIRMED, one CANCELLED, one
    // WAITLIST — only the CONFIRMED row should count, leaving 2 seats.
    mockedFindManyClasses.mockResolvedValue([
      {
        ...baseClass,
        bookings: [
          { userId: "other-1", status: "CONFIRMED" },
          { userId: "other-2", status: "CANCELLED" },
          { userId: "other-3", status: "WAITLIST" },
        ],
      },
    ]);

    const [result] = await getBookableClasses("me");

    expect(result.seatsLeft).toBe(2);
  });

  it("reports myStatus null when the caller has no booking on the class, even if others do", async () => {
    // Regression for dropping `b.userId === userId` from the `mine`
    // predicate: myStatus must reflect the CALLING member's own booking,
    // not whichever booking on the class happens to match a status filter
    // first. Without the userId check, a member who never booked this class
    // would see another member's CONFIRMED row and get "Booked" (button
    // disabled) on a class they never booked — the more serious of the two
    // bugs, since it silently blocks a legitimate booking action.
    mockedFindManyClasses.mockResolvedValue([
      {
        ...baseClass,
        bookings: [{ userId: "someone-else", status: "CONFIRMED" }],
      },
    ]);

    const [result] = await getBookableClasses("me");

    expect(result.myStatus).toBeNull();
  });

  it("reports the caller's own status when they do have a booking", async () => {
    mockedFindManyClasses.mockResolvedValue([
      {
        ...baseClass,
        bookings: [
          { userId: "someone-else", status: "CONFIRMED" },
          { userId: "me", status: "WAITLIST" },
        ],
      },
    ]);

    const [result] = await getBookableClasses("me");

    expect(result.myStatus).toBe("WAITLIST");
  });

  it("ignores the caller's own cancelled booking for myStatus", async () => {
    mockedFindManyClasses.mockResolvedValue([
      {
        ...baseClass,
        bookings: [{ userId: "me", status: "CANCELLED" }],
      },
    ]);

    const [result] = await getBookableClasses("me");

    expect(result.myStatus).toBeNull();
  });

  it("clamps seatsLeft to zero rather than going negative when overbooked", async () => {
    mockedFindManyClasses.mockResolvedValue([
      {
        ...baseClass,
        capacity: 1,
        bookings: [
          { userId: "a", status: "CONFIRMED" },
          { userId: "b", status: "CONFIRMED" },
        ],
      },
    ]);

    const [result] = await getBookableClasses("me");

    expect(result.seatsLeft).toBe(0);
  });
});
