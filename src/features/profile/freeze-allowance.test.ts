import { describe, it, expect } from "vitest";
import { computeFreezeAllowance, MAX_FREEZE_WEEKS_PER_YEAR } from "./freeze-allowance";

const weeks = (from: Date, n: number) => ({
  from,
  to: new Date(from.getTime() + n * 7 * 24 * 60 * 60 * 1000),
});

describe("computeFreezeAllowance", () => {
  it("reports the full allowance when nothing was frozen", () => {
    expect(computeFreezeAllowance([], 2026)).toEqual({
      usedWeeks: 0,
      remainingWeeks: MAX_FREEZE_WEEKS_PER_YEAR,
    });
  });

  it("sums freezes within the year", () => {
    const freezes = [weeks(new Date(2026, 0, 5), 2), weeks(new Date(2026, 5, 1), 3)];
    expect(computeFreezeAllowance(freezes, 2026)).toEqual({ usedWeeks: 5, remainingWeeks: 3 });
  });

  it("ignores freezes from other calendar years", () => {
    const freezes = [weeks(new Date(2025, 0, 5), 6), weeks(new Date(2026, 0, 5), 1)];
    expect(computeFreezeAllowance(freezes, 2026)).toEqual({ usedWeeks: 1, remainingWeeks: 7 });
  });

  it("never reports negative remaining weeks", () => {
    const freezes = [weeks(new Date(2026, 0, 5), 12)];
    expect(computeFreezeAllowance(freezes, 2026)).toEqual({ usedWeeks: 12, remainingWeeks: 0 });
  });
});
