// src/lib/images.ts
//
// Every photograph on the public site, in one place.
//
// These are hotlinked from Unsplash's CDN, which means the live site depends
// on a third party staying up and keeping these ids. Each id below was
// fetched and looked at before it was written down — a 200 alone does not
// tell you whether the photo shows a gym or a ping-pong table.
//
// Photos are free to use under the Unsplash License
// (https://unsplash.com/license): no permission needed, no attribution
// required, but they may not be sold unaltered or used to build a competing
// stock service. Neither applies here.
//
// To swap a photo: change the id, then open the page and look at it. To stop
// depending on Unsplash entirely, download these into public/ and replace
// unsplash() with a plain path — every consumer reads through this file.

/** Build a CDN url that crops to the aspect the layout asked for. */
export function unsplash(id: string, width: number, height?: number): string {
  const h = height ? `&h=${height}` : "";
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}${h}&q=70`;
}

export type SiteImage = { url: string; alt: string };

/**
 * Alt text describes what is in the frame, because these are decorative
 * photographs with no caption — a screen reader user gets nothing else.
 */
export const SITE_IMAGES = {
  hero: {
    url: unsplash("photo-1591117207239-788bf8de6c3b", 1600, 1000),
    alt: "A boxer landing a straight punch in the ring, in black and white",
  },
  finalCta: {
    url: unsplash("photo-1526506118085-60ce8714f8c5", 1600, 1000),
    alt: "An athlete pulling up on a bar in a dim gym, in black and white",
  },
  about: {
    url: unsplash("photo-1534258936925-c58bed479fcb", 1200, 800),
    alt: "Battle ropes laid across the floor of a training gym",
  },
  classes: {
    url: unsplash("photo-1584464491033-06628f3a6b7b", 1400, 700),
    alt: "A fighter in gloves working the heavy bag",
  },
} as const satisfies Record<string, SiteImage>;

/**
 * Keyed by the discipline names the landing page and the database use. The
 * keys are asserted against that list in images.test.ts, so renaming a
 * discipline without adding its photo fails a test instead of rendering a
 * card with a hole in it.
 */
export const DISCIPLINE_IMAGES = {
  BOXING: {
    url: unsplash("photo-1583473848882-f9a5bc7fd2ee", 800, 600),
    alt: "A boxing glove resting on the floor beside the ring ropes",
  },
  "MUAY THAI": {
    url: unsplash("photo-1622599511051-16f55a1234d0", 800, 600),
    alt: "A fighter in Thai shorts holding guard under neon light",
  },
  STRENGTH: {
    url: unsplash("photo-1574680096145-d05b474e2155", 800, 600),
    alt: "A lifter under a loaded barbell mid squat, in black and white",
  },
} as const satisfies Record<string, SiteImage>;

/**
 * Seeded into GalleryImage by prisma/seed.ts. The gallery is admin-editable,
 * so these are only the starting rows — an admin replacing them is expected,
 * not a problem.
 */
export const GALLERY_SEED_IMAGES: readonly SiteImage[] = [
  {
    url: unsplash("photo-1534438327276-14e5300c3a48", 900, 600),
    alt: "A rack of dumbbells running the length of the gym floor",
  },
  {
    url: unsplash("photo-1595078475328-1ab05d0a6a0e", 900, 600),
    alt: "A lifter chalking their hands beside a loaded barbell",
  },
  {
    url: unsplash("photo-1601422407692-ec4eeec1d9b3", 900, 600),
    alt: "An athlete pressing a kettlebell overhead in a get-up",
  },
  {
    url: unsplash("photo-1517836357463-d25dfeac3438", 900, 600),
    alt: "Hands set on a barbell at the start of a deadlift",
  },
] as const;
