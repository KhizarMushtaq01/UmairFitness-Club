import { describe, it, expect } from "vitest";
import { computeStreak } from "./streak";

// A fixed "today" keeps these tests from breaking at midnight.
const TODAY = new Date(2026, 7, 16); // 16 Aug 2026
const day = (offset: number) => new Date(2026, 7, 16 - offset);

describe("computeStreak", () => {
  it("returns 0 for no check-ins", () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak([day(0), day(1), day(2)], TODAY)).toBe(3);
  });

  it("counts multiple check-ins on one day only once", () => {
    const twiceToday = [new Date(2026, 7, 16, 7), new Date(2026, 7, 16, 19)];
    expect(computeStreak([...twiceToday, day(1)], TODAY)).toBe(2);
  });

  it("stays alive when today has no check-in yet", () => {
    expect(computeStreak([day(1), day(2)], TODAY)).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(computeStreak([day(0), day(1), day(3), day(4)], TODAY)).toBe(2);
  });

  it("returns 0 when the most recent check-in is older than yesterday", () => {
    expect(computeStreak([day(5), day(6)], TODAY)).toBe(0);
  });
});
