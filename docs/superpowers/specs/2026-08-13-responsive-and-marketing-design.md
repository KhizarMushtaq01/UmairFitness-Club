# Umair Fitness Club — Rebrand, Responsive Pass + Marketing Site (Phase 2)

**Goal:** Make every existing dashboard route usable on phones and tablets,
then build the public marketing site on top of the now-responsive primitives.

**Status of Phase 1:** complete and merged (`442fdce`). 21 dashboard routes,
auth, RBAC, 21 unit tests. This spec covers what Phase 1 explicitly deferred.

---

## Problem

Two gaps, in the order they must be closed.

**1. Nothing is responsive.** The dashboard code contains zero `sm:` / `md:` /
`lg:` prefixes. Concretely, on a phone today:

- All three role layouts reserve a fixed 248px sidebar column
  (`grid-cols-[248px_1fr]`), crushing content into the remainder.
- Six stat rows use a hard `grid-cols-4`, squeezing four cards onto a 375px
  screen.
- Two `<table>` elements have no overflow container, so wide rows force the
  whole page to scroll horizontally.
- Page padding is a flat `p-7` (28px) on every route, wasting scarce width.

**2. There is no public site.** `/` currently redirects to `/dashboard`, so a
visitor who is not signed in is dropped straight onto a login form with no
explanation of what the gym is.

**3. The app carries the wrong name.** Phase 1 was built as "Fight Club",
carried over from the design prototype. The product is **Umair Fitness
Club**. Every marketing page puts the brand in front of the public, so the
rename has to land before they are written rather than after.

## Approach

Responsive first, marketing second.

The marketing pages will reuse the same primitives the dashboards use —
`DataTable`, `EmptyState`, page padding, grid rhythm. Building marketing
against non-responsive primitives would mean fixing the same components
twice. Closing the responsive gap first means the new pages are built on a
base that already works at every width.

Rejected alternatives: marketing first (double work, as above); interleaving
both per-page (no clean checkpoint — impossible to say whether the responsive
pass is done).

The rename comes before both, because it is a mechanical change that touches
files the later phases also edit. Doing it last would mean rewriting the
marketing copy a second time.

---

## Phase 0 — Rebrand to Umair Fitness Club

Five files in application code carry the old name:

| File | Change |
|------|--------|
| `src/components/shared/Logo.tsx` | `FC` → `UFC` lettermark, `FIGHT CLUB` → `UMAIR FITNESS CLUB` |
| `prisma/seed.ts` | six `@fightclub.gym` addresses → `@umairfitness.gym`; product and invoice descriptions |
| `src/lib/email.ts` | from-address → `Umair Fitness Club <noreply@umairfitness.gym>` |
| `src/lib/uploads.ts` | Cloudinary folder `fight-club` → `umair-fitness-club` |
| `package.json` | `name` → `umair-fitness-club` |

The lettermark grows from two glyphs to three. The logo box is currently a
32×32 square sized for `FC`; `UFC` needs the box widened or the glyph size
reduced, or the third letter will overflow the clip-path.

Reseeding is required after the seed file changes, and the existing `dev.db`
carries the old addresses. The sign-in credentials in every doc change with
it — `danny@umairfitness.gym`, `ana@umairfitness.gym`,
`marcus@umairfitness.gym`, password unchanged.

The Phase 1 plan and design spec keep the old name. They are a record of what
was built at the time, not live documentation, and rewriting history there
buys nothing.

---

## Phase A — Responsive pass

### Breakpoints

Tailwind defaults, mobile-first. The base (unprefixed) style targets phones;
prefixes add width.

| Token | Min width | Target |
|-------|-----------|--------|
| (base) | 0 | phone, portrait |
| `sm:` | 640px | phone landscape, small tablet |
| `md:` | 768px | tablet — **sidebar appears here** |
| `lg:` | 1024px | laptop — full 4-column stat rows |

`md:` is the pivot: below it the sidebar is a drawer, at and above it the
sidebar is permanent.

### Navigation

The sidebar becomes a drawer below `md:`. Admin has ten nav items, which rules
out a bottom tab bar; the current nav uses numbers (`01`–`10`) rather than
icons, which rules out a collapsed icon rail without inventing an icon set.

New component `src/components/shared/DashboardShell.tsx` (client) owns the
open/closed state and wraps `Sidebar` + `Topbar`:

- `Sidebar` gains `hidden md:flex` for the permanent case, and renders again
  inside the drawer for the mobile case.
- `Topbar` gains a hamburger button, `md:hidden`.
- Drawer closes on: backdrop click, `Escape`, and route change (so tapping a
  nav item does not leave it open over the new page).
- Drawer is `role="dialog"` with `aria-modal="true"`; the hamburger carries
  `aria-expanded` and `aria-controls`.

The three role layouts change from `grid-cols-[248px_1fr]` to a single column
that becomes `md:grid-cols-[248px_1fr]`.

### Layout changes

| Pattern | Files | Change |
|---------|-------|--------|
| Fixed sidebar grid | 3 role layouts | `md:grid-cols-[248px_1fr]`, single column below |
| `grid-cols-4` stat rows | 5 pages + `Skeletons.tsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `grid-cols-4` gallery | admin/gallery | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| `grid-cols-3` programs | trainer/programs | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Raw `<table>` | `DataTable.tsx`, admin/settings | wrap in `overflow-x-auto` |
| `p-7` padding | 61 files (pages + loading + error) | `p-4 md:p-7` |
| `max-w-[420px]` forms | 3 files | `w-full max-w-[420px]` |

`DataTable` is the high-leverage fix: one `overflow-x-auto` wrapper there
repairs every consumer (member payments, workouts, trainer clients and
schedule, admin members, trainers, plans, shop, orders). The admin settings
permission matrix has its own inline table and needs the same wrapper
separately.

`Skeletons.tsx` must match the grid it stands in for; leaving `StatRowSkeleton`
at `grid-cols-4` would make the page visibly jump when data arrives.

### Touch targets

Interactive elements reach at least 44px of height on mobile, per the
handoff's accessibility section. This affects the nav links, the row-level
Cancel / Publish buttons, and the role `<select>`.

---

## Phase B — Marketing site

### Routes

```
src/app/(marketing)/
  layout.tsx      SiteHeader + SiteFooter — public, no session guard
  page.tsx        home
  about/page.tsx
  classes/page.tsx
  trainers/page.tsx
  pricing/page.tsx
  contact/page.tsx
```

`/` moves from its current redirect to the real home page. Signed-out visitors
get the marketing site; the header's "Sign in" link is the entry to
`/dashboard`, which continues to resolve the session and route by role.

The `(marketing)` group sits outside `(dashboard)`, so it inherits no session
guard. This is deliberate — these pages are public.

### Data

Marketing pages read live data, so anything an admin changes appears on the
public site without a second edit. New file
`src/features/marketing/queries.ts`:

- `getPublicClasses()` — discipline, title, room, start time, duration, coach
  name, and remaining capacity
- `getPublicTrainers()` — name and class/programme counts
- `getPublicPlans()` — plan name, price, member count

**Field selection is a security boundary here, not a convenience.** The
existing `getAllTrainers()` returns `email`, and `getAllMembers()` returns
email plus membership status; both are correct for admin-only pages and wrong
for a public one. The marketing queries are written separately and select only
public-safe columns. Reusing an admin query on a public page would publish
staff email addresses.

Hero copy, the about narrative, and contact details are static content in the
page files — there is no CMS in this phase and inventing a table for prose
would be speculative.

### Contact form

`src/features/marketing/schemas.ts` and `actions.ts`. The action validates
with Zod (name, email, message) and calls the existing `sendEmail()` adapter,
which logs to the console when `RESEND_API_KEY` is unset and sends for real
when it is set. No new table: persisting submissions would need a Prisma
migration and an admin inbox page, which is a larger change than this phase
warrants.

Unlike the dashboard actions, this one has no `assertRole` — it is
intentionally public. It parses input before doing anything else.

### Components

- `SiteHeader` — client component; needs `usePathname` for the active link and
  local state for its own mobile menu
- `SiteFooter` — server component

Both live in `src/components/marketing/`. They reuse the existing design
tokens; no new colours or fonts.

---

## Testing

**Unit (Vitest, TDD — test first, watch it fail, then implement):**

- `sendContactMessage` — rejects a malformed email, rejects an empty message,
  calls `sendEmail` with the right shape on the happy path, and does not call
  it on any validation failure
- `getPublicTrainers` / `getPublicClasses` — assert the returned objects
  contain no `email` key. This is a regression guard against someone later
  swapping in the admin query.

**Manual verification against a running server:**

- Every existing route still returns 200 for its own role after the layout
  changes, and the cross-role redirect matrix is unchanged
- Each of the six marketing pages renders its seeded data while signed out
- Responsive classes are present in the served markup at the points the table
  above specifies

Static markup checks cannot prove a layout *looks* right at 375px. Visual
confirmation at phone, tablet, and desktop widths is a manual step for the
human reviewer.

## Out of scope

Deliberately excluded, to keep this phase reviewable:

- `blog/` and `blog/[slug]` — needs a content-source decision
- SEO metadata, JSON-LD, sitemap, robots
- GSAP hero and marquee motion
- Live Stripe payments
- Persisting contact submissions

## Success criteria

- No occurrence of "Fight Club" or `fightclub` remains in `src/`, `prisma/`,
  or `package.json`; the seeded accounts sign in at their new addresses
- No horizontal page scroll at 375px on any of the 21 dashboard routes
- All ten admin nav items reachable on a phone
- Six marketing pages live, reading real data, signed out
- `tsc`, `lint`, `build`, and the full test suite all clean
- Guard behaviour under `/dashboard/*` is unchanged: wrong-role users are
  still redirected to their own dashboard, and signed-out users to `/login`.
  `/` is the one intentional change — it stops redirecting and serves the
  home page instead.
