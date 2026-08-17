import { describe, it, expect } from "vitest";
import { formatPlanPrice } from "./format";

describe("formatPlanPrice", () => {
  // These three are the exact strings the PLAN_PRICES consts produced. The
  // public pricing page must not change wording just because the numbers
  // moved into the database.
  it("renders a whole-dollar price without cents", () => {
    expect(formatPlanPrice(8900)).toBe("$89 / mo");
  });

  it("renders the other two seeded tiers unchanged", () => {
    expect(formatPlanPrice(14900)).toBe("$149 / mo");
    expect(formatPlanPrice(24900)).toBe("$249 / mo");
  });

  it("keeps cents when an admin sets a price that has them", () => {
    expect(formatPlanPrice(14950)).toBe("$149.50 / mo");
  });

  it("renders a free tier as $0", () => {
    expect(formatPlanPrice(0)).toBe("$0 / mo");
  });
});
