import { describe, it, expect } from "vitest";
import { DISCIPLINE_IMAGES, GALLERY_SEED_IMAGES, SITE_IMAGES, unsplash } from "./images";

// Every image on this site is hotlinked from Unsplash's CDN. A typo in a
// photo id renders a broken image rather than failing a build, so these
// assertions guard the shape of the registry — the part a typo shows up in.
// They cannot prove a given id still exists upstream; only a network check
// does that, and it belongs in the release checklist, not a unit test.

const ALL = [
  ...Object.values(SITE_IMAGES),
  ...Object.values(DISCIPLINE_IMAGES),
  ...GALLERY_SEED_IMAGES,
];

describe("image registry", () => {
  it("serves every image from the Unsplash CDN over https", () => {
    for (const img of ALL) {
      expect(img.url.startsWith("https://images.unsplash.com/photo-")).toBe(true);
    }
  });

  it("gives every image non-empty alt text", () => {
    for (const img of ALL) {
      expect(img.alt.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers exactly the three disciplines the landing page renders", () => {
    expect(Object.keys(DISCIPLINE_IMAGES).sort()).toEqual(["BOXING", "MUAY THAI", "STRENGTH"]);
  });

  it("gives each discipline a distinct photo", () => {
    const urls = Object.values(DISCIPLINE_IMAGES).map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not repeat a photo within the gallery", () => {
    const urls = GALLERY_SEED_IMAGES.map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  describe("unsplash()", () => {
    it("requests a bounded width so a 4000px original never reaches a phone", () => {
      expect(unsplash("photo-123", 800)).toContain("w=800");
    });

    it("keeps the photo id it was given", () => {
      expect(unsplash("photo-123", 800)).toContain("photo-123");
    });

    it("asks the CDN to crop rather than letterbox", () => {
      expect(unsplash("photo-123", 800)).toContain("fit=crop");
    });
  });
});
