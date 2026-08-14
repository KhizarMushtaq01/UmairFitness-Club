import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    class: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { getPublicClasses, getPublicTrainers, getPublicPlans } from "./queries";

const mockedClasses = db.class.findMany as unknown as Mock;
const mockedUsers = db.user.findMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublicTrainers", () => {
  it("never exposes an email address", async () => {
    mockedUsers.mockResolvedValue([
      {
        id: "t1",
        name: "Ana Silva",
        email: "ana@umairfitness.gym",
        _count: { coachClasses: 2, coachPrograms: 1 },
      },
    ]);

    const trainers = await getPublicTrainers();

    expect(trainers).toEqual([{ id: "t1", name: "Ana Silva", classCount: 2, programCount: 1 }]);
    expect(JSON.stringify(trainers)).not.toContain("@");
  });
});

describe("getPublicClasses", () => {
  it("exposes the coach's name but not their email, and computes spots left", async () => {
    mockedClasses.mockResolvedValue([
      {
        id: "c1",
        discipline: "Boxing",
        title: "Boxing — Advanced",
        room: "Ring 1",
        capacity: 16,
        durationMin: 60,
        startsAt: new Date("2026-08-08T18:30:00"),
        coach: { name: "Ana Silva", email: "ana@umairfitness.gym" },
        bookings: [{ status: "CONFIRMED" }, { status: "CANCELLED" }],
      },
    ]);

    const classes = await getPublicClasses();

    expect(classes[0].coachName).toBe("Ana Silva");
    expect(classes[0].spotsLeft).toBe(15);
    expect(JSON.stringify(classes)).not.toContain("@");
  });
});

describe("getPublicPlans", () => {
  it("returns all three tiers with their prices, regardless of who is enrolled", async () => {
    // The seed data has exactly one membership (FIGHTER). If getPublicPlans
    // were still derived from enrollment, only one tier would come back —
    // this asserts the full catalogue is independent of that.
    const plans = await getPublicPlans();

    expect(plans).toEqual([
      { plan: "CONTENDER", price: "$89 / mo" },
      { plan: "FIGHTER", price: "$149 / mo" },
      { plan: "CHAMPION", price: "$249 / mo" },
    ]);
  });

  it("does not touch the database", async () => {
    await getPublicPlans();

    expect(mockedClasses).not.toHaveBeenCalled();
    expect(mockedUsers).not.toHaveBeenCalled();
  });
});
