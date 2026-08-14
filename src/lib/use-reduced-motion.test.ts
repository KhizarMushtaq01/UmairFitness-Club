import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion } from "./use-reduced-motion";

// Vitest runs environment: "node" here, so there is no window to begin with.
// Track whether the test itself created the global so afterEach can remove
// it entirely rather than leaving a half-built window object behind — a
// state a real browser never produces, and the code under test branches on
// `typeof window === "undefined"`.
const windowExistedBeforeTests = typeof globalThis.window !== "undefined";

afterEach(() => {
  if (!windowExistedBeforeTests) {
    delete (globalThis as { window?: unknown }).window;
  }
});

function stubMatchMedia(matches: boolean) {
  globalThis.window = globalThis.window ?? ({} as Window & typeof globalThis);
  globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

describe("prefersReducedMotion", () => {
  it("is true when the user asked for reduced motion", () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("is false when the user did not", () => {
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("queries the reduce preference, not some other media string", () => {
    stubMatchMedia(false);
    prefersReducedMotion();
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
