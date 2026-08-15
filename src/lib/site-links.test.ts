import { describe, it, expect } from "vitest";
import {
  BOOKINGS_SIGN_IN_HREF,
  NAV_LINKS,
  POLICY_LINKS,
  SOCIAL_LINKS,
  configuredSocialLinks,
} from "./site-links";

// A link that renders but goes nowhere is worse than no link: it invites a
// click and answers by jumping to the top of the page. These tests make the
// unconfigured state explicit (href: null) so a placeholder cannot reach the
// footer as an anchor, and so a real url starts working the moment it is set.

describe("site links", () => {
  it("never uses '#' as a stand-in for an unknown destination", () => {
    for (const link of [...SOCIAL_LINKS, ...NAV_LINKS, ...POLICY_LINKS]) {
      expect(link.href).not.toBe("#");
    }
  });

  it("marks an unconfigured social destination as null, not an empty string", () => {
    for (const s of SOCIAL_LINKS) {
      if (s.href === null) continue;
      expect(s.href.trim().length).toBeGreaterThan(0);
    }
  });

  it("requires any configured social link to be an absolute https url", () => {
    for (const s of SOCIAL_LINKS) {
      if (s.href === null) continue;
      expect(s.href.startsWith("https://")).toBe(true);
    }
  });

  it("gives every social entry a label so the footer can name it", () => {
    for (const s of SOCIAL_LINKS) {
      expect(s.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("routes every nav and policy link to an in-app path", () => {
    for (const link of [...NAV_LINKS, ...POLICY_LINKS]) {
      expect(link.href.startsWith("/")).toBe(true);
      expect(link.href.startsWith("//")).toBe(false);
    }
  });

  it("sends the booking link through sign-in with an encoded next path", () => {
    expect(BOOKINGS_SIGN_IN_HREF.startsWith("/login?next=")).toBe(true);
    expect(BOOKINGS_SIGN_IN_HREF).toContain("%2Fdashboard%2Fmember%2Fbookings");
  });

  describe("configuredSocialLinks()", () => {
    it("returns only entries that have a real destination", () => {
      for (const s of configuredSocialLinks()) {
        expect(s.href).not.toBeNull();
        expect(s.href.startsWith("https://")).toBe(true);
      }
    });

    it("drops every unconfigured entry", () => {
      const configured = configuredSocialLinks().length;
      const withHref = SOCIAL_LINKS.filter((s) => s.href !== null).length;
      expect(configured).toBe(withHref);
    });
  });
});
