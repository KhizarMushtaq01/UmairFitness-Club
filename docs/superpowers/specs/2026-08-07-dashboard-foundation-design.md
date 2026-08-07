# Fight Club — Phase 1: Foundation + Dashboards — Design Spec

Date: 2026-08-07
Status: Approved by user, ready for implementation planning

## Context

The repo currently contains only a static design prototype (`Fight Club.dc.html`,
`support.js`, `image-slot.js`) plus a developer handoff doc
(`handoff/CLAUDE-CODE-HANDOFF.md`) describing an intended Next.js application.
No real application code exists yet. The user asked to (1) fix any errors in
the project and (2) build out the tabs/features still missing from the
member, trainer, and admin dashboards, without introducing errors.

Given the actual gap between "prototype" and "described app," the user chose
to build the real Next.js application described in the handoff doc, starting
with a first phase: **Foundation + Dashboards**. Marketing pages, and live
third-party integrations, are explicitly deferred to later phases.

The existing prototype file remains untouched in place as a visual reference;
it is not part of the Next.js app.

## Phase 1 Scope

In scope:
- Next.js 15 (App Router) project scaffold: TypeScript, Tailwind v4, shadcn/ui
- Prisma schema + SQLite dev database + seed script
- Better Auth: email/password login + signup, session, role-based access
- `(dashboard)` route group: layout shell (sidebar + topbar) with RBAC guard
- All member, trainer, and admin dashboard routes/tabs (listed below), each
  wired to real Prisma queries against seeded data — no more mock arrays
  living in a client component
- Page-State Contract on every dashboard route: loading/error/empty states
- Design tokens (colors, type, zero-radius, motion basics) ported from the
  prototype into `styles/globals.css` Tailwind v4 `@theme`

Out of scope (later phases):
- `(marketing)` public pages (home/about/classes/trainers/pricing/blog/contact)
- Live Stripe checkout/webhooks, live UploadThing/Cloudinary uploads, live
  Resend email sending — these are stubbed behind adapter interfaces (see
  "Third-Party Stubs" below) so Phase 1 runs with zero external accounts
- SEO metadata, JSON-LD, sitemap/robots (marketing-page concerns)

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion ·
Prisma (SQLite in dev) · Better Auth · Zod · React Hook Form · TanStack Query.

GSAP, Stripe SDK, UploadThing, Cloudinary, Resend are added as dependencies
but only exercised behind stub adapters in Phase 1 (see below).

## Folder Structure

Matches handoff §3:

```
src/
  app/
    (auth)/
      login/ signup/
    (dashboard)/
      layout.tsx            # sidebar shell + RBAC guard
      member/                overview/ workouts/ nutrition/ bookings/ payments/ profile/
      trainer/                overview/ clients/ clients/[id]/ schedule/ programs/
      admin/                  analytics/ members/ trainers/ plans/ shop/ orders/ content/ gallery/ settings/ roles/
    api/
      auth/[...all]/         # Better Auth handler
  features/
    bookings/ memberships/ workouts/ nutrition/ payments/ shop/ content/ analytics/ notifications/
      components/  actions.ts  queries.ts  schemas.ts  types.ts
  components/
    ui/                      # shadcn primitives (radius 0, project tokens)
    shared/                  # Logo, StatCard, DataTable, EmptyState, ErrorState, Skeletons, StatusBadge
  lib/
    auth.ts db.ts payments.ts uploads.ts email.ts utils.ts
  styles/globals.css
prisma/
  schema.prisma
  seed.ts
```

## Data Model (Prisma, SQLite)

Per handoff §4, adapted to SQLite. Prisma's `enum` type is only supported on
Postgres/MySQL/CockroachDB connectors — **not** SQLite — so every "enum" field
below is a `String` column, with the allowed values enforced by a Zod literal
union in the matching `features/*/schemas.ts` at the point of writing, and by
a shared `as const` tuple (e.g. `MEMBERSHIP_PLANS`) used for display/filter
UI. This keeps the exact same field names/values as the handoff sketch, and
migrating to real Postgres `enum` types later is a schema-only change (no
application code touches the enum mechanism directly).

```
User(id, email, name, role: MEMBER|TRAINER|ADMIN, createdAt)
Membership(id, userId, plan: CONTENDER|FIGHTER|CHAMPION, status, renewsAt, frozenUntil)
Class(id, discipline, title, coachId -> User, room, capacity, startsAt, durationMin)
Booking(id, userId, classId, status: CONFIRMED|WAITLIST|CANCELLED|ATTENDED)
WorkoutProgram(id, coachId -> User, name, weeks)
WorkoutDay(id, programId, dayIndex, focus)
Exercise(id, workoutDayId, name, sets, load, tempo)
ProgramAssignment(id, programId, memberId -> User, startedAt, adherencePct)
NutritionPlan(id, memberId -> User, coachId -> User, kcal, protein, carbs, fat)
Meal(id, nutritionPlanId, time, name, detail, kcal)
Invoice(id, userId, amount, status, issuedAt)
Product(id, name, price, stock, category)
Order(id, userId, status)
OrderItem(id, orderId, productId, qty)
Post(id, title, tag, status: DRAFT|PUBLISHED, views, authorId -> User)
GalleryImage(id, url, caption)
Notification(id, userId, title, body, readAt)
AttendanceLog(id, userId, checkedInAt)
```

Better Auth owns its own `Session`/`Account`/`Verification` tables via its
Prisma adapter; `User.role` is a custom field added to Better Auth's user
schema.

## RBAC (handoff §5)

Single `role` enum on `User`. Enforced in three layers:
1. **Route-group guard** — `(dashboard)/layout.tsx` reads the session server-side;
   if the signed-in user's role doesn't match the `/dashboard/{role}/...`
   segment they're hitting, redirect to their own dashboard root.
2. **Server-action guard** — every mutating action starts with
   `assertRole(session, [...allowedRoles])`, throwing before any DB write.
3. **Row-level scoping** — member/trainer queries always filter
   `where: { userId: session.user.id }` (or `coachId` for trainer-owned
   resources); only admin queries are unscoped.

## Dashboard Routes / Tabs

**Member** — overview, workouts, nutrition, bookings, payments, profile
**Trainer** — overview, clients (list), clients/[id] (detail), schedule, programs
**Admin** — analytics, members, trainers, plans, shop, orders, content, gallery, settings, roles

Each route is a server component that fetches via a `queries.ts` function in
the matching `features/*` folder, passes data to presentational components
under `features/*/components/`. Mutations (cancel booking, mark attendance,
approve order, publish post, toggle role permission, etc.) are server actions
in the matching `actions.ts`, called from client components via
`useFormState`/`useTransition` + TanStack Query invalidation.

## Page-State Contract (handoff §7)

Every dashboard route gets:
- `loading.tsx` — shimmer skeleton matching the route's final layout
  (stat-card row + chart block + table block, per what's on that page)
- `error.tsx` — red 1px bordered box, `role="alert"`, "Retry" button that
  calls `reset()`
- Empty result sets render the shared `<EmptyState>` component (dashed
  border, Bebas headline "Nothing here yet", contextual CTA) instead of an
  empty table

## Design Tokens

Ported verbatim from `Fight Club.dc.html` into Tailwind v4 `@theme` in
`styles/globals.css`: the dark/light CSS variable pairs (`--bg`, `--panel`,
`--card`, `--line`, `--line2`, `--txt`, `--mut`, `--dim`, `--red`), Anton /
Bebas Neue / Inter font stack, zero border-radius on all shadcn primitives,
1px hairline grid borders, red-as-scalpel accent usage.

## Third-Party Stubs

`lib/payments.ts`, `lib/uploads.ts`, `lib/email.ts` each export a small
interface (e.g. `createCheckoutSession()`, `uploadImage()`, `sendEmail()`).
Implementation picks real SDK vs. an in-memory mock based on whether the
relevant env var is set (`STRIPE_SECRET_KEY`, `UPLOADTHING_TOKEN`,
`CLOUDINARY_URL`, `RESEND_API_KEY`). Mocks log to console and return
realistic fake IDs/URLs so UI flows (e.g. "Invoice paid", "Image uploaded")
work end-to-end in dev without live accounts. Swapping to live services later
is an env-var change, not a rewrite.

## Auth

Email + password only for Phase 1 (no OAuth) — matches the handoff's
login/signup/forgot-password/reset-password routes and keeps setup
self-contained (no external OAuth app registration needed to run the
project). Better Auth session cookie drives the RBAC guard.

## Error-Free Definition of Done

"Bina kisi error ke" is enforced mechanically, not just by eyeballing:
- `tsc --noEmit` passes with zero errors
- `next build` completes with zero errors/warnings-as-errors
- `next lint` passes
- Every dashboard route renders its ready/loading/empty/error states without
  throwing (spot-checked manually per route after seed data is loaded)

## Testing Strategy

Given this is UI/CRUD-heavy scaffolding work rather than algorithmic logic,
testing is scoped to what actually catches regressions cheaply:
- Zod schemas in each `features/*/schemas.ts` validate all server action
  inputs — malformed input fails fast with a typed error, not a DB exception
- `assertRole()` and row-scoping helpers get unit tests (the RBAC boundary is
  the highest-value thing to test in this codebase)
- No E2E test harness in Phase 1 (would be disproportionate setup cost for a
  first phase); manual verification via `npm run dev` walkthrough of all
  three dashboards is the acceptance check instead

## Open Items Deferred to Later Phases

- Marketing site pages
- Live Stripe checkout + webhook handler
- Live UploadThing/Cloudinary asset upload UI polish
- Live Resend transactional emails
- SEO/JSON-LD/sitemap
- GSAP hero/marquee motion (marketing-only)
