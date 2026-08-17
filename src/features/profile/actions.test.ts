import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Shared across the db and notify mock factories (both are hoisted above
// imports, so vi.hoisted is the only way to hand them a common array) so
// tests can prove notify runs strictly after the freeze transaction commits
// rather than merely that notify was called at all. Mirrors the pattern in
// bookings/actions.test.ts.
const order = vi.hoisted(() => [] as string[]);

vi.mock("@/lib/db", () => {
  const tx = {
    membership: { findFirst: vi.fn(), update: vi.fn() },
    membershipFreeze: { create: vi.fn() },
  };
  return {
    db: {
      user: { update: vi.fn() },
      membership: { findFirst: vi.fn(), update: vi.fn() },
      membershipFreeze: { create: vi.fn() },
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
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("@/lib/payments", () => ({ cancelSubscription: vi.fn() }));
vi.mock("@/features/notifications/notify", () => ({
  notify: vi.fn(async () => {
    order.push("notify");
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { cancelSubscription } from "@/lib/payments";
import { notify } from "@/features/notifications/notify";
import { freezeMembership, cancelMembership } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
// cancelMembership still talks to db.membership.* directly (not
// transactional — see FIX 1's scope, which is freezeMembership only).
const mockedFindMembership = db.membership.findFirst as unknown as Mock;
const mockedUpdateMembership = db.membership.update as unknown as Mock;
// freezeMembership now does its read and both writes through db.$transaction,
// so its assertions go through the tx object the mock hands the callback.
const tx = (db as unknown as { __tx: { membership: { findFirst: Mock; update: Mock }; membershipFreeze: { create: Mock } } }).__tx;
const mockedFreezeFindMembership = tx.membership.findFirst;
const mockedFreezeUpdateMembership = tx.membership.update;
const mockedCreateFreeze = tx.membershipFreeze.create;
const mockedDbTransaction = db.$transaction as unknown as Mock;
const mockedCancelSub = cancelSubscription as unknown as Mock;
const mockedNotify = notify as unknown as Mock;

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  order.length = 0;
  mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
  // clearAllMocks resets call history but not a mock's implementation, so a
  // mockRejectedValue set by one test would otherwise leak into every test
  // that runs after it. Re-pin the happy-path default each time — as an
  // implementation (not mockResolvedValue) so it keeps pushing onto `order`,
  // the same reasoning as the notify mock factory in bookings/actions.test.ts.
  mockedNotify.mockImplementation(async () => {
    order.push("notify");
  });
  mockedCancelSub.mockResolvedValue({ id: "stub-cancel" });
});

describe("freezeMembership", () => {
  it("throws when the member has no membership", async () => {
    mockedFreezeFindMembership.mockResolvedValue(null);

    await expect(freezeMembership({ weeks: 2 })).rejects.toThrow("Not found");
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
  });

  it("freezes when the request fits the remaining allowance", async () => {
    mockedFreezeFindMembership.mockResolvedValue({ id: "m1", userId: "u1", freezes: [] });

    const result = await freezeMembership({ weeks: 3 });

    expect(result.ok).toBe(true);
    // Row scoping: the lookup must be filtered to the caller's own userId,
    // not merely "the first membership in the table" — otherwise a member
    // could freeze someone else's membership.
    expect(mockedFreezeFindMembership).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { freezes: true },
    });
    expect(mockedCreateFreeze).toHaveBeenCalledTimes(1);
    expect(mockedFreezeUpdateMembership).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { frozenUntil: expect.any(Date) },
    });
  });

  it("performs the allowance read and both writes inside the transaction, and notifies only after it commits", async () => {
    // FIX 1: freezeMembership must be transactional. This is the test that
    // bites if the code reverts to calling db.membership.findFirst /
    // db.membershipFreeze.create / db.membership.update directly instead of
    // through db.$transaction — db.$transaction (and therefore tx.*) would
    // never be invoked, and mockedDbTransaction would see zero calls.
    mockedFreezeFindMembership.mockResolvedValue({ id: "m1", userId: "u1", freezes: [] });

    await freezeMembership({ weeks: 2 });

    expect(mockedDbTransaction).toHaveBeenCalledTimes(1);
    // Same reasoning as bookClass's ordering test in bookings/actions.test.ts:
    // a "was called" assertion on notify can't distinguish "after the
    // transaction committed" from "from inside the transaction callback" —
    // only the recorded order can. The db mock pushes "transaction" once the
    // callback resolves; the notify mock pushes "notify" when it runs.
    expect(order).toEqual(["transaction", "notify"]);
  });

  it("rejects a freeze that exceeds the 8-week annual cap", async () => {
    const thisYear = new Date().getFullYear();
    const from = new Date(thisYear, 0, 5);
    mockedFreezeFindMembership.mockResolvedValue({
      id: "m1",
      userId: "u1",
      freezes: [{ from, to: new Date(from.getTime() + 7 * 7 * DAY_MS) }], // 7 weeks used
    });

    await expect(freezeMembership({ weeks: 3 })).rejects.toThrow("Freeze allowance");
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
  });

  it("charges the allowance check to the year `from` falls in, not the current calendar year", async () => {
    // Regression for the from/check year mismatch: an existing frozenUntil
    // that has already rolled into next January makes `from` (and therefore
    // the year the new freeze row gets charged to, via computeFreezeAllowance
    // filtering on from.getFullYear()) next year, even though `new
    // Date().getFullYear()` is still this year. The check must use the same
    // year the write charges, or a member could be blocked by (or dodge) an
    // allowance that belongs to the wrong year.
    const now = new Date();
    const nextJan3 = new Date(now.getFullYear() + 1, 0, 3);
    mockedFreezeFindMembership.mockResolvedValue({
      id: "m1",
      userId: "u1",
      frozenUntil: nextJan3,
      // 7 weeks already used, but charged to NEXT year (from.getFullYear()
      // for this existing freeze is also next year) — this year's bucket is
      // untouched. Checking against `new Date().getFullYear()` (this year)
      // would see 0 used and wrongly allow it; checking against next year
      // (matching what the write will charge) correctly blocks it.
      freezes: [{ from: nextJan3, to: new Date(nextJan3.getTime() + 7 * 7 * DAY_MS) }],
    });

    await expect(freezeMembership({ weeks: 3 })).rejects.toThrow("Freeze allowance");
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
  });

  it("rejects when the membership has a pending cancellation", async () => {
    // FIX 4b: the UI hides the freeze control once cancelEffectiveAt is set,
    // but that is not enforcement — a direct call to the action must be
    // rejected server-side too.
    mockedFreezeFindMembership.mockResolvedValue({
      id: "m1",
      userId: "u1",
      freezes: [],
      cancelRequestedAt: new Date(),
    });

    await expect(freezeMembership({ weeks: 1 })).rejects.toThrow(/cancel/i);
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
    expect(mockedFreezeUpdateMembership).not.toHaveBeenCalled();
  });

  it("throws when there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(freezeMembership({ weeks: 1 })).rejects.toThrow("Unauthorized");
  });

  it("rejects input below the schema minimum before touching the database", async () => {
    // 0 weeks fails Zod's min(1) on its own, independent of the remaining
    // allowance — this is the schema-parse layer, not the business-rule cap.
    await expect(freezeMembership({ weeks: 0 })).rejects.toThrow();
    expect(mockedFreezeFindMembership).not.toHaveBeenCalled();
  });

  it("extends an existing future freeze instead of truncating it", async () => {
    // Already frozen through day 29 from today; only 1 week used so far this
    // year, well within the cap.
    const existingFrozenUntil = new Date(Date.now() + 29 * DAY_MS);
    mockedFreezeFindMembership.mockResolvedValue({
      id: "m1",
      userId: "u1",
      frozenUntil: existingFrozenUntil,
      freezes: [{ from: new Date(), to: existingFrozenUntil }],
    });

    const result = await freezeMembership({ weeks: 2 });

    // "2 more weeks" must add on top of the existing frozenUntil, not
    // overwrite it with an earlier date computed from today. This must fail
    // if `from` reverts to `new Date()`.
    expect(result.frozenUntil.getTime()).toBeGreaterThan(existingFrozenUntil.getTime());
    const freezeArg = mockedCreateFreeze.mock.calls[0][0].data;
    expect(freezeArg.from.getTime()).toBe(existingFrozenUntil.getTime());
  });

  it("starts a new freeze from today when the previous frozenUntil is in the past", async () => {
    const staleFrozenUntil = new Date(Date.now() - 5 * DAY_MS);
    mockedFreezeFindMembership.mockResolvedValue({
      id: "m1",
      userId: "u1",
      frozenUntil: staleFrozenUntil,
      freezes: [],
    });

    const before = Date.now();
    const result = await freezeMembership({ weeks: 1 });
    const after = Date.now();

    const freezeArg = mockedCreateFreeze.mock.calls[0][0].data;
    expect(freezeArg.from.getTime()).toBeGreaterThanOrEqual(before);
    expect(freezeArg.from.getTime()).toBeLessThanOrEqual(after);
    expect(result.frozenUntil.getTime()).toBeGreaterThan(staleFrozenUntil.getTime());
  });
});

describe("cancelMembership", () => {
  it("sets an effective date at least 30 days out", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });

    const result = await cancelMembership();

    const daysOut = (result.effectiveAt.getTime() - Date.now()) / DAY_MS;
    expect(daysOut).toBeGreaterThanOrEqual(29.9);
  });

  it("uses renewsAt when it falls beyond the 30-day notice", async () => {
    const renewsAt = new Date(Date.now() + 90 * DAY_MS);
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt, freezes: [] });

    const result = await cancelMembership();

    expect(result.effectiveAt.getTime()).toBe(renewsAt.getTime());
  });

  it("does not revoke access immediately", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });

    await cancelMembership();

    // Row scoping, same reasoning as the freeze test above: a member may
    // only cancel their OWN membership.
    expect(mockedFindMembership).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { freezes: true },
    });

    const data = mockedUpdateMembership.mock.calls[0][0].data;
    expect(data.cancelRequestedAt).toBeInstanceOf(Date);
    expect(data.status).toBeUndefined();
  });

  it("tells the payment provider to cancel", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });

    await cancelMembership();

    expect(mockedCancelSub).toHaveBeenCalledWith({ membershipId: "m1" });
  });

  it("does not record a cancellation when the payment provider fails", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });
    mockedCancelSub.mockRejectedValue(new Error("stripe unreachable"));

    // Unlike notify, a failed cancelSubscription must propagate — the DB
    // must not claim a cancellation that billing never honoured.
    await expect(cancelMembership()).rejects.toThrow("stripe unreachable");
    expect(mockedUpdateMembership).not.toHaveBeenCalled();
  });
});
