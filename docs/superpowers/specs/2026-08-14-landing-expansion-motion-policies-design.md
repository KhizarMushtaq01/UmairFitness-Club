# Umair Fitness Club — Landing Expansion, Motion, and Policy Pages (Phase 3)

**Goal:** Grow the landing page from three sections to twelve, give the
marketing site a depth-and-scroll motion language, expand the footer with
social and policy links, and add the four policy pages those links point at.

**Status going in:** Phase 2 is merged and pushed. Six marketing pages exist
on a `(marketing)` route group, backed by `src/features/marketing/queries.ts`
(`getPublicClasses`, `getPublicTrainers`, `getPublicPlans`). 29 tests pass.

---

## Problem

**1. The landing page is thin.** Ninety lines, three sections — hero, next
sessions, membership. A visitor who lands there learns almost nothing about
what the gym does, who coaches, or what training there looks like.

**2. Nothing moves.** `gsap@3.15` and `framer-motion@13` have been in
`package.json` since the Phase 1 scaffold and are imported by exactly zero
files. Phase 1 deferred "GSAP hero/marquee motion" as marketing-only work
that never came.

**3. Real content is sitting unused.** The `GalleryImage` table is rendered
nowhere on the public site, and `Post` is only reachable from the admin
console. Both already hold seeded rows.

**4. The footer is a stub** — three links, no social presence, and no policy
pages for it to link to.

## Approach

**CSS 3D transforms plus GSAP ScrollTrigger. No new dependencies.**

GSAP is already installed and ships ScrollTrigger in the same package
(verified at `node_modules/gsap/ScrollTrigger.js`). Depth comes from
`perspective` / `rotateX` / `rotateY` / `translateZ`, which every target
browser composites on the GPU.

Rejected: real WebGL via three.js. It would add ~600KB, tax low-end phone
GPUs, need a 3D asset, and fight a flat brutalist design built on hairline
grids and angular clip-paths. The brief for this phase is explicitly "all
devices"; WebGL is the option most at odds with that.

`framer-motion` stays unused. Two animation systems for one site is a
maintenance cost with no payoff — if it is still unused after this phase, it
should be uninstalled, but that is not this phase's job.

### Server/client split

The landing page is an async server component that reads the database. GSAP
and pointer tilt need the client. So data fetching stays on the server and
presentational **client** wrappers animate what they are handed:

- `<Reveal>` — client; registers a ScrollTrigger that transitions its
  children in on entry.
- `<TiltCard>` — client; applies `rotateX`/`rotateY` from pointer position.

Sections remain server components that render data into those wrappers. No
section becomes a client component just to animate.

## Motion system

Three rules bind every animation added in this phase.

**Reduced motion is honoured, not optional.** Every animated component checks
`window.matchMedia("(prefers-reduced-motion: reduce)")` and, when it matches,
renders the final state immediately with no transition. A user who has asked
their OS for less motion gets a static page that is still complete — never a
page stuck at opacity 0 because the reveal never ran.

**Tilt is pointer-only.** `@media (hover: hover) and (pointer: fine)`. Tilt
driven by pointer position is meaningless on touch, and attaching the
handlers there costs battery for nothing.

**Nothing animates layout.** Transforms and opacity only. Animating width,
height, or top/left forces reflow on every frame.

## Landing page — three sections to twelve

| # | Section | Source |
|---|---|--------|
| 1 | Hero — layered depth, headline reveal on `translateZ` | static |
| 2 | Stats bar — members, classes, coaches | DB |
| 3 | Disciplines — Boxing / Muay Thai / Strength, tilt cards | static |
| 4 | Next sessions | DB *(exists)* |
| 5 | How it works — three steps | static |
| 6 | Coaches | DB |
| 7 | Gallery strip | DB |
| 8 | Membership | DB *(exists)* |
| 9 | Testimonials | placeholder — see below |
| 10 | Latest posts | DB |
| 11 | FAQ | static |
| 12 | Final CTA | static |

Sections 4 and 8 already exist and are re-ordered, not rewritten.

Each section lives in its own file under
`src/components/marketing/sections/`. Twelve sections inline in one page file
would be unreadable and unreviewable.

### Testimonials are placeholders, and must look like it to us

There is no review data. Writing quotes and attributing them to members would
be fabricating customer reviews on a public page, so this section is built
from a constant named `PLACEHOLDER_TESTIMONIALS` carrying a comment saying
plainly that it must be replaced before launch.

Two hard rules: attributions are generic (a first name and a discipline, no
photos, no surnames), and **no quote is attributed to a seeded person** —
Marcus Reid, Ana Silva, and Danny Okafor never appear as reviewers. Putting
words in the mouth of a name that exists in the database is the version of
this that does real damage.

## New queries

Added to `src/features/marketing/queries.ts`, following the same
public-safe-fields discipline as Phase 2:

- `getSiteStats(): Promise<{ memberCount: number; classCount: number; coachCount: number }>`
- `getPublicGallery(): Promise<{ id: string; url: string; caption: string }[]>`
- `getPublicPosts(): Promise<{ id: string; title: string; tag: string; date: string }[]>`

**`getPublicPosts` must filter `status: "PUBLISHED"`.** The admin
`getAllPosts()` returns drafts, correctly — it feeds the console where an
admin publishes them. A public query that forgot the filter would put an
unpublished draft on the homepage. This gets its own regression test, the
same way the no-email guards work.

`getPublicPosts` also does not return `views` or `authorId`. Neither belongs
on a public card.

### On `getSiteStats` returning a member count

Phase 2 deliberately stripped `memberCount` from `getPublicPlans()` on the
grounds that per-plan member counts are business metrics. This is not a
reversal of that. A *per-plan* breakdown tells a competitor which tiers sell
and which do not; a *single total* is the number gyms put on their own
hoardings. The first is a leak, the second is marketing.

Worth knowing before this ships: against the current seed data the bar reads
one member, two classes, one coach. That is the query working correctly, not
a bug — but it reads poorly, and the section is only worth showing publicly
once the gym has real numbers behind it.

## Footer and policy pages

The footer grows from three links to four regions: brand blurb, a site-nav
column, a **policy** column, and a social row above the copyright line.

New routes: `/privacy`, `/terms`, `/refunds`, `/cookies` — inside
`(marketing)`, so they inherit the header and footer and no session guard.

### Policy content is a reviewed template, not legal advice

Each page gets real structure and plain-English draft clauses fitted to a gym
that stores member data, takes payments, and runs classes. Each also carries
a visible banner stating the text is a template pending legal review.

This is deliberate. Generating text that reads as settled legal copy for a
real business to rely on would be worse than generating nothing — the banner
is what makes the draft honest, and removing it is the owner's decision to
make with a lawyer, not ours.

### Social links

A single `SOCIAL_LINKS` constant — Instagram, Facebook, YouTube, WhatsApp —
with `#` placeholder hrefs. Real handles are not known and guessing URLs
would ship dead links. The constant is the one place to edit.

## Responsive

Every new section is mobile-first on the established ladder: `grid-cols-1`,
`sm:grid-cols-2`, `lg:grid-cols-3` or `4`. Touch targets stay ≥44px. The
gallery strip scrolls horizontally inside its own container on narrow
screens rather than shrinking images to thumbnails.

## Testing

**Unit (Vitest, TDD):**
- `getPublicPosts` returns only `PUBLISHED` rows, and its output contains no
  `views` or `authorId` key — a real regression guard against someone later
  swapping in `getAllPosts()`
- `getPublicGallery` and `getSiteStats` return their documented shapes
- Reduced-motion behaviour of `<Reveal>`: when the media query matches, the
  final state renders without a transition

**Manual (human):** the motion itself. Whether a reveal reads well, whether
tilt feels right, and whether twelve sections scroll at a good rhythm cannot
be asserted in a test. Also required at 375 / 768 / 1280px.

## Out of scope

`/blog` listing and `blog/[slug]`; SEO metadata, JSON-LD, sitemap; live
Stripe; removing the unused `framer-motion` dependency.

## Success criteria

- The landing page renders twelve sections, and the six that read the
  database show real seeded rows
- No `DRAFT` post and no `views`/`authorId` field appears in the served HTML
  of any public page
- With `prefers-reduced-motion: reduce` set, every section is fully visible
  and legible with no animation
- Footer links reach all four policy pages, and each carries its review
  banner
- No horizontal page scroll at 375px on any marketing route
- `tsc`, `lint`, `build`, and the full suite pass; no new runtime dependency
  appears in `package.json`
