import { describe, it, expect } from "vitest";
import { safeRedirect } from "./safe-redirect";

// A ?next= parameter that is echoed into router.push() without checking is an
// open redirect: an attacker sends a member a link to our real, trusted login
// page, they sign in, and land on a page the attacker chose. These tests pin
// the cases that make that possible.

describe("safeRedirect", () => {
  it("keeps an ordinary in-app path", () => {
    expect(safeRedirect("/dashboard/member/bookings")).toBe("/dashboard/member/bookings");
  });

  it("falls back when nothing was asked for", () => {
    expect(safeRedirect(null)).toBe("/dashboard");
    expect(safeRedirect(undefined)).toBe("/dashboard");
    expect(safeRedirect("")).toBe("/dashboard");
  });

  it("refuses an absolute url to another origin", () => {
    expect(safeRedirect("https://evil.example.com/steal")).toBe("/dashboard");
    expect(safeRedirect("http://evil.example.com")).toBe("/dashboard");
  });

  it("refuses a protocol-relative url, which browsers treat as off-site", () => {
    expect(safeRedirect("//evil.example.com/steal")).toBe("/dashboard");
    // Backslashes because some browsers normalise \\ to // before navigating.
    expect(safeRedirect("/\\evil.example.com")).toBe("/dashboard");
    expect(safeRedirect("\\\\evil.example.com")).toBe("/dashboard");
  });

  it("refuses a javascript: payload", () => {
    expect(safeRedirect("javascript:alert(1)")).toBe("/dashboard");
  });

  it("refuses anything that is not rooted at /", () => {
    expect(safeRedirect("dashboard")).toBe("/dashboard");
    expect(safeRedirect("../../etc/passwd")).toBe("/dashboard");
  });

  it("ignores leading whitespace and control characters used to slip past a naive check", () => {
    expect(safeRedirect("  https://evil.example.com")).toBe("/dashboard");
    expect(safeRedirect("\n//evil.example.com")).toBe("/dashboard");
    expect(safeRedirect("\tjavascript:alert(1)")).toBe("/dashboard");
  });

  it("preserves a query string and hash on an allowed path", () => {
    expect(safeRedirect("/dashboard/member/bookings?tab=upcoming#top")).toBe(
      "/dashboard/member/bookings?tab=upcoming#top",
    );
  });
});
