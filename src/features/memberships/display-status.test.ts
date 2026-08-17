import { describe, it, expect } from "vitest";
import { deriveDisplayStatus, displayStatusColor } from "./display-status";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-17T12:00:00");

describe("deriveDisplayStatus", () => {
  it("returns the stored status when the membership was never frozen", () => {
    expect(deriveDisplayStatus("ACTIVE", null, NOW)).toBe("ACTIVE");
  });

  it("returns FROZEN while frozenUntil is still in the future", () => {
    expect(deriveDisplayStatus("ACTIVE", new Date(NOW.getTime() + 3 * DAY_MS), NOW)).toBe("FROZEN");
  });

  it("falls back to the stored status once frozenUntil has passed", () => {
    expect(deriveDisplayStatus("ACTIVE", new Date(NOW.getTime() - 1 * DAY_MS), NOW)).toBe("ACTIVE");
  });

  it("treats the exact expiry instant as no longer frozen", () => {
    // The comparison is strictly greater-than, matching getMembershipStatus.
    expect(deriveDisplayStatus("ACTIVE", new Date(NOW.getTime()), NOW)).toBe("ACTIVE");
  });

  it("never masks AT_RISK when the member is not frozen", () => {
    // Freezing hides the stored status, so an unfrozen AT_RISK member must
    // still surface as AT_RISK rather than being flattened to ACTIVE.
    expect(deriveDisplayStatus("AT_RISK", null, NOW)).toBe("AT_RISK");
  });

  it("prefers FROZEN over a stored AT_RISK, because the freeze is the live fact", () => {
    expect(deriveDisplayStatus("AT_RISK", new Date(NOW.getTime() + DAY_MS), NOW)).toBe("FROZEN");
  });

  it("passes a placeholder status through untouched", () => {
    expect(deriveDisplayStatus("NONE", null, NOW)).toBe("NONE");
  });
});

describe("displayStatusColor", () => {
  it("flags AT_RISK in red", () => {
    expect(displayStatusColor("AT_RISK")).toBe("var(--red)");
  });

  it("dims FROZEN, so a paused membership reads as inactive rather than alarming", () => {
    expect(displayStatusColor("FROZEN")).toBe("var(--dim)");
  });

  it("leaves every other status muted", () => {
    expect(displayStatusColor("ACTIVE")).toBe("var(--mut)");
    expect(displayStatusColor("TRIAL")).toBe("var(--mut)");
    expect(displayStatusColor("NONE")).toBe("var(--mut)");
  });
});
