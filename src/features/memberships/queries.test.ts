import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    membership: { findFirst: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { getMembershipStatus } from "./queries";

const mockedFindMembership = db.membership.findFirst as unknown as Mock;

const DAY_MS = 24 * 60 * 60 * 1000;

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
