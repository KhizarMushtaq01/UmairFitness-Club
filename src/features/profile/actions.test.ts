import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
    membership: { findFirst: vi.fn(), update: vi.fn() },
    membershipFreeze: { create: vi.fn() },
  },
}));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("@/lib/payments", () => ({ cancelSubscription: vi.fn() }));
vi.mock("@/features/notifications/notify", () => ({ notify: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { cancelSubscription } from "@/lib/payments";
import { notify } from "@/features/notifications/notify";
import { freezeMembership, cancelMembership } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedFindMembership = db.membership.findFirst as unknown as Mock;
const mockedUpdateMembership = db.membership.update as unknown as Mock;
const mockedCreateFreeze = db.membershipFreeze.create as unknown as Mock;
const mockedCancelSub = cancelSubscription as unknown as Mock;
const mockedNotify = notify as unknown as Mock;

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
  // clearAllMocks resets call history but not a mock's implementation, so a
  // mockRejectedValue set by one test would otherwise leak into every test
  // that runs after it. Re-pin the happy-path defaults each time.
  mockedNotify.mockResolvedValue(undefined);
  mockedCancelSub.mockResolvedValue({ id: "stub-cancel" });
});

describe("freezeMembership", () => {
  it("throws when the member has no membership", async () => {
    mockedFindMembership.mockResolvedValue(null);

    await expect(freezeMembership({ weeks: 2 })).rejects.toThrow("Not found");
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
  });

  it("freezes when the request fits the remaining allowance", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", freezes: [] });

    const result = await freezeMembership({ weeks: 3 });

    expect(result.ok).toBe(true);
    // Row scoping: the lookup must be filtered to the caller's own userId,
    // not merely "the first membership in the table" — otherwise a member
    // could freeze someone else's membership.
    expect(mockedFindMembership).toHaveBeenCalledWith({
      where: { userId: "u1" },
      include: { freezes: true },
    });
    expect(mockedCreateFreeze).toHaveBeenCalledTimes(1);
    expect(mockedUpdateMembership).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { frozenUntil: expect.any(Date) },
    });
  });

  it("rejects a freeze that exceeds the 8-week annual cap", async () => {
    const thisYear = new Date().getFullYear();
    const from = new Date(thisYear, 0, 5);
    mockedFindMembership.mockResolvedValue({
      id: "m1",
      userId: "u1",
      freezes: [{ from, to: new Date(from.getTime() + 7 * 7 * DAY_MS) }], // 7 weeks used
    });

    await expect(freezeMembership({ weeks: 3 })).rejects.toThrow("Freeze allowance");
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
  });

  it("throws when there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(freezeMembership({ weeks: 1 })).rejects.toThrow("Unauthorized");
  });

  it("rejects input below the schema minimum before touching the database", async () => {
    // 0 weeks fails Zod's min(1) on its own, independent of the remaining
    // allowance — this is the schema-parse layer, not the business-rule cap.
    await expect(freezeMembership({ weeks: 0 })).rejects.toThrow();
    expect(mockedFindMembership).not.toHaveBeenCalled();
  });

  it("still resolves when notify rejects after the freeze has committed", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", freezes: [] });
    mockedNotify.mockRejectedValue(new Error("email service down"));

    const result = await freezeMembership({ weeks: 2 });

    expect(result.ok).toBe(true);
    expect(mockedCreateFreeze).toHaveBeenCalledTimes(1);
    expect(mockedUpdateMembership).toHaveBeenCalledTimes(1);
  });

  it("extends an existing future freeze instead of truncating it", async () => {
    // Already frozen through day 29 from today; only 1 week used so far this
    // year, well within the cap.
    const existingFrozenUntil = new Date(Date.now() + 29 * DAY_MS);
    mockedFindMembership.mockResolvedValue({
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
    mockedFindMembership.mockResolvedValue({
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

  it("still resolves when notify rejects after the cancellation has committed", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });
    mockedNotify.mockRejectedValue(new Error("email service down"));

    const result = await cancelMembership();

    expect(result.ok).toBe(true);
    expect(mockedUpdateMembership).toHaveBeenCalledTimes(1);
    expect(mockedCancelSub).toHaveBeenCalledTimes(1);
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
