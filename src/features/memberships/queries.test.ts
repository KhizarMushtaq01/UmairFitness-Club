import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findFirst: vi.fn(), groupBy: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    plan: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { getMembershipStatus, getMemberDetail, getAllMembers, getPlanBreakdown } from "./queries";

const mockedFindMembership = db.membership.findFirst as unknown as Mock;

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMembershipStatus", () => {
  it("returns null when the user has no membership", async () => {
    mockedFindMembership.mockResolvedValue(null);

    expect(await getMembershipStatus("u1")).toBeNull();
  });

  it("derives displayStatus FROZEN from frozenUntil without changing the stored status", async () => {
    mockedFindMembership.mockResolvedValue({
      plan: "FIGHTER",
      status: "ACTIVE",
      frozenUntil: new Date(Date.now() + 3 * DAY_MS),
      cancelRequestedAt: null,
      renewsAt: null,
      freezes: [],
    });

    const result = await getMembershipStatus("u1");

    // The stored column never becomes "FROZEN" — only displayStatus is derived.
    expect(result?.status).toBe("ACTIVE");
    expect(result?.displayStatus).toBe("FROZEN");
    expect(result?.frozenUntil).toBeInstanceOf(Date);
  });

  it("falls back to the stored status once frozenUntil is in the past", async () => {
    mockedFindMembership.mockResolvedValue({
      plan: "FIGHTER",
      status: "ACTIVE",
      frozenUntil: new Date(Date.now() - 3 * DAY_MS),
      cancelRequestedAt: null,
      renewsAt: null,
      freezes: [],
    });

    const result = await getMembershipStatus("u1");

    expect(result?.displayStatus).toBe("ACTIVE");
    expect(result?.frozenUntil).toBeNull();
  });
});

describe("getMemberDetail", () => {
  const memberRow = {
    id: "u1",
    name: "Marcus Reid",
    email: "marcus@umairfitness.gym",
    role: "MEMBER",
    createdAt: new Date("2026-01-15T10:00:00"),
    memberships: [
      { id: "m1", plan: "FIGHTER", status: "ACTIVE", createdAt: new Date("2026-01-15T10:00:00") },
    ],
    bookings: [
      {
        id: "b1",
        status: "CONFIRMED",
        createdAt: new Date("2026-08-01T10:00:00"),
        class: { title: "Boxing — Advanced", startsAt: new Date("2026-08-20T18:30:00") },
      },
    ],
    invoices: [
      {
        id: "i1",
        desc: "Fighter plan — July",
        amount: 14900,
        status: "PAID",
        issuedAt: new Date("2026-07-01T00:00:00"),
      },
    ],
    attendance: [{ id: "a1", checkedInAt: new Date("2026-08-16T07:00:00") }],
    _count: { bookings: 12, attendance: 30 },
  };

  beforeEach(() => {
    // Load-bearing: getMemberDetail maps over this result, so a bare vi.fn()
    // returning undefined would break every test in this block, not just the
    // planOptions one.
    (db.plan.findMany as unknown as Mock).mockResolvedValue([]);
  });

  it("returns null for a user who does not exist", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(null);

    await expect(getMemberDetail("nope")).resolves.toBeNull();
  });

  it("returns null for a trainer, so the members route cannot view staff", async () => {
    // This route is admin > members > detail. A trainer id must 404 rather
    // than render a member page with empty membership fields.
    (db.user.findUnique as unknown as Mock).mockResolvedValue({
      ...memberRow,
      role: "TRAINER",
    });

    await expect(getMemberDetail("t1")).resolves.toBeNull();
  });

  it("reports the plan and status from the newest membership", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    const detail = await getMemberDetail("u1");

    expect(detail?.plan).toBe("FIGHTER");
    expect(detail?.status).toBe("ACTIVE");
  });

  it("falls back to placeholders for a member with no membership row", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue({ ...memberRow, memberships: [] });

    const detail = await getMemberDetail("u1");

    expect(detail?.plan).toBe("—");
    expect(detail?.status).toBe("NONE");
  });

  it("formats invoice amounts as dollars", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    const detail = await getMemberDetail("u1");

    expect(detail?.invoices[0].amount).toBe("$149.00");
  });

  it("reports totals from _count, not from the truncated lists", async () => {
    // The lists are capped with `take` so a long-tenured member does not pull
    // their whole history into memory. The headline numbers must still be the
    // real ones, so they come from _count — asserting 12 and 30 against lists
    // of length 1 is what pins that.
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    const detail = await getMemberDetail("u1");

    expect(detail?.bookingCount).toBe(12);
    expect(detail?.attendanceCount).toBe(30);
    expect(detail?.bookings).toHaveLength(1);
  });

  it("bounds every history list it loads", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    await getMemberDetail("u1");

    const arg = (db.user.findUnique as unknown as Mock).mock.calls[0][0];
    expect(arg.include.bookings.take).toBe(20);
    expect(arg.include.invoices.take).toBe(20);
    expect(arg.include.attendance.take).toBe(20);
  });

  it("returns the selectable plan keys in sort order", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);
    (db.plan.findMany as unknown as Mock).mockResolvedValue([
      { key: "CONTENDER", name: "Contender", sortOrder: 1 },
      { key: "FIGHTER", name: "Fighter", sortOrder: 2 },
    ]);

    const detail = await getMemberDetail("u1");

    expect(detail?.planOptions).toEqual([
      { key: "CONTENDER", name: "Contender" },
      { key: "FIGHTER", name: "Fighter" },
    ]);
    const arg = (db.plan.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.orderBy).toEqual({ sortOrder: "asc" });
  });
});

describe("getAllMembers", () => {
  beforeEach(() => {
    (db.user.findMany as unknown as Mock).mockResolvedValue([]);
  });

  it("filters by role only when no query is given", async () => {
    await getAllMembers();

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ role: "MEMBER" });
  });

  it("matches the query against both name and email", async () => {
    await getAllMembers("marcus");

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({
      role: "MEMBER",
      OR: [{ name: { contains: "marcus" } }, { email: { contains: "marcus" } }],
    });
  });

  it("keeps the role filter when searching, so a trainer never matches", async () => {
    // Dropping `role` from the search branch would let an admin surface staff
    // rows on the members screen. Asserting the whole where-object is what
    // pins that, not just the OR.
    await getAllMembers("ana");

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where.role).toBe("MEMBER");
  });

  it("treats a blank or whitespace-only query as no query", async () => {
    await getAllMembers("   ");

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ role: "MEMBER" });
  });
});

describe("getPlanBreakdown", () => {
  it("lists every plan, including tiers nobody has bought", async () => {
    // groupBy over memberships could only ever return plans someone holds, so
    // an empty tier was invisible on the admin plans screen — and invisible
    // is uneditable once Task 17 puts the editor in that table.
    (db.plan.findMany as unknown as Mock).mockResolvedValue([
      { id: "pl1", key: "CONTENDER", name: "Contender", priceCents: 8900, sortOrder: 1 },
      { id: "pl2", key: "FIGHTER", name: "Fighter", priceCents: 14900, sortOrder: 2 },
    ]);
    (db.membership.groupBy as unknown as Mock).mockResolvedValue([
      { plan: "FIGHTER", _count: { plan: 3 } },
    ]);

    const rows = await getPlanBreakdown();

    expect(rows).toEqual([
      {
        id: "pl1",
        key: "CONTENDER",
        name: "Contender",
        priceCents: 8900,
        price: "$89 / mo",
        memberCount: 0,
      },
      {
        id: "pl2",
        key: "FIGHTER",
        name: "Fighter",
        priceCents: 14900,
        price: "$149 / mo",
        memberCount: 3,
      },
    ]);
  });
});
