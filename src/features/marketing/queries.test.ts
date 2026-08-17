import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    class: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
    post: { findMany: vi.fn() },
    galleryImage: { findMany: vi.fn() },
    plan: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import {
  getPublicClasses,
  getPublicTrainers,
  getPublicPlans,
  getPublicPosts,
  getPublicGallery,
  getSiteStats,
} from "./queries";

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
  it("returns every tier from the Plan table, regardless of who is enrolled", async () => {
    // The guarantee that matters, carried over from the const era: a public
    // price list shows every tier. It now holds because the catalogue is read
    // from Plan rather than grouped from Membership — the seed has exactly
    // one membership (FIGHTER), so an enrolment-derived list would show one.
    (db.plan.findMany as unknown as Mock).mockResolvedValue([
      { key: "CONTENDER", priceCents: 8900, sortOrder: 1 },
      { key: "FIGHTER", priceCents: 14900, sortOrder: 2 },
      { key: "CHAMPION", priceCents: 24900, sortOrder: 3 },
    ]);

    const plans = await getPublicPlans();

    expect(plans).toEqual([
      { plan: "CONTENDER", price: "$89 / mo" },
      { plan: "FIGHTER", price: "$149 / mo" },
      { plan: "CHAMPION", price: "$249 / mo" },
    ]);
  });

  it("asks for the tiers in their configured display order", async () => {
    (db.plan.findMany as unknown as Mock).mockResolvedValue([]);

    await getPublicPlans();

    const arg = (db.plan.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.orderBy).toEqual({ sortOrder: "asc" });
  });

  it("reflects a price an admin has edited", async () => {
    (db.plan.findMany as unknown as Mock).mockResolvedValue([
      { key: "CONTENDER", priceCents: 9900, sortOrder: 1 },
    ]);

    await expect(getPublicPlans()).resolves.toEqual([{ plan: "CONTENDER", price: "$99 / mo" }]);
  });
});

describe("getPublicPosts", () => {
  it("asks the database for published posts only", async () => {
    (db.post.findMany as unknown as Mock).mockResolvedValue([]);

    await getPublicPosts();

    const arg = (db.post.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ status: "PUBLISHED" });
  });

  it("never returns views or authorId", async () => {
    (db.post.findMany as unknown as Mock).mockResolvedValue([
      {
        id: "p1",
        title: "Inside an 8-week fight camp",
        tag: "Fight camp",
        status: "PUBLISHED",
        views: 4200,
        authorId: "u1",
        createdAt: new Date("2026-07-01T10:00:00"),
      },
    ]);

    const posts = await getPublicPosts();

    expect(Object.keys(posts[0]).sort()).toEqual(["date", "id", "tag", "title"]);
    expect(JSON.stringify(posts)).not.toContain("4200");
    expect(JSON.stringify(posts)).not.toContain("authorId");
  });
});

describe("getPublicGallery", () => {
  it("returns id, url and caption", async () => {
    (db.galleryImage.findMany as unknown as Mock).mockResolvedValue([
      { id: "g1", url: "/uploads/floor.png", caption: "Floor session" },
    ]);

    await expect(getPublicGallery()).resolves.toEqual([
      { id: "g1", url: "/uploads/floor.png", caption: "Floor session" },
    ]);
  });
});

describe("getSiteStats", () => {
  it("counts members and coaches by role, and all classes", async () => {
    // Keyed on the role filter rather than call order — an implementation that
    // counted the wrong role would still pass an order-based mock.
    (db.user.count as unknown as Mock).mockImplementation(
      ({ where }: { where: { role: string } }) =>
        Promise.resolve(where.role === "MEMBER" ? 12 : where.role === "TRAINER" ? 3 : 0)
    );
    (db.class.count as unknown as Mock).mockResolvedValue(7);

    await expect(getSiteStats()).resolves.toEqual({
      memberCount: 12,
      classCount: 7,
      coachCount: 3,
    });
  });
});
