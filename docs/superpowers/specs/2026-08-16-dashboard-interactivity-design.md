# Fight Club — Phase 4: Dashboard Interactivity — Design Spec

Date: 2026-08-16
Status: Approved by user, ready for implementation planning

## Context

Phase 1 built every dashboard route listed in `handoff/CLAUDE-CODE-HANDOFF.md`
and wired each one to a real Prisma query. Phases 2–3 rebranded and expanded
the public marketing pages. The result is that all **tabs** exist, but most of
them are read-only: a page reads from the database and renders a table.

An audit of the member and admin dashboards found the gap is not missing tabs,
it is missing *behaviour* inside them:

- **No class booking flow at all.** RBAC grants MEMBER "book classes" and the
  overview's empty state offers a "Browse classes" CTA, but that CTA lands on
  the bookings list, which only shows bookings the member already has. There is
  no route to browse bookable classes, no `bookClass` action, and no waitlist —
  despite handoff §6 describing all three.
- **`Notification` model is unused.** Schema, no UI, no actions, no bell.
- **`AttendanceLog` is write-only.** The trainer's `MarkAttendanceButton` writes
  rows; no member-facing view ever reads them.
- **`Membership.frozenUntil` is unused.** Handoff §6 describes freeze and
  cancel; neither is implemented.
- **`lib/uploads.ts` is dead code.** The Cloudinary adapter is written and
  never called; the admin gallery is read-only.
- **Admin pages have almost no write actions.** Members, orders, plans, and
  gallery are entirely read-only. Shop can add but not edit or delete. Content
  can publish but not create, unpublish, or delete.
- **Plan prices are a hardcoded const, duplicated** in
  `features/marketing/queries.ts` and `features/memberships/queries.ts`.

The user asked for the member phase first, then the admin phase, with the full
feature set below in scope.

## Scope

**Member phase**

1. Class booking: browse → book → waitlist, with auto-promote on cancel
2. In-app notifications + email, with a Topbar bell
3. Attendance history and check-in streak on the member overview
4. Membership freeze and cancel on the member profile

**Admin phase**

5. Members: detail route, plan/status editing, search
6. Orders: status advance. Shop: product edit and delete
7. Content: create, unpublish, delete. Gallery: upload and delete
8. Plans: a real `Plan` model, editable prices, const removed

**Out of scope** (call these out rather than silently skipping them):

- Post **body** content and a `/blog/[slug]` route. `Post` has no body field
  and no blog route exists. Creating posts stays title + tag, matching what
  `LatestPosts` renders on the homepage today. A real blog is separate work.
- Live Stripe / Cloudinary / Resend calls. All three keep running through the
  existing stub adapters, as in every prior phase.
- Trainer dashboard changes. Not requested.

### Known gap: nothing executes a cancellation once it becomes effective

`cancelMembership` records `cancelRequestedAt` and computes `cancelEffectiveAt`
(30 days out, or `renewsAt` if later), but nothing ever flips the membership's
`status` to `CANCELLED` when that date passes — there is no cron job and no
lazy status check on read. `getMembershipStatus` keeps returning the same
`cancelEffectiveAt` it always did, so `MembershipControls` renders
"Cancellation requested — active until {date}" indefinitely, including long
after that date has come and gone, with the freeze control still hidden and
no further action ever taken.

This is real infrastructure — a scheduled job, or a lazy "is `cancelEffectiveAt`
in the past?" check made at read time (e.g. inside `getMembershipStatus`, or
wherever access is gated) — that this phase never scoped. It needs to land in
a follow-up before cancellation can be considered complete end-to-end.

## Build Order

One migration batch first, then feature-vertical (each feature complete
through schema → query → action → UI → test before the next begins).

The migration batch is small enough to land once and get out of the way, which
avoids a schema change interrupting the member phase midway. Everything that
follows is vertical, so each step is independently reviewable and shippable —
unlike a layer-horizontal order, where nothing works until every layer exists.

### Migration batch

```prisma
model Plan {
  id         String @id @default(cuid())
  key        String @unique   // CONTENDER | FIGHTER | CHAMPION
  name       String
  priceCents Int
  sortOrder  Int
}

model MembershipFreeze {
  id           String   @id @default(cuid())
  membershipId String
  from         DateTime
  to           DateTime
  createdAt    DateTime @default(now())
  membership   Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
}

// Membership gains:
//   cancelRequestedAt DateTime?
//   freezes           MembershipFreeze[]
```

`Membership.plan` stays a plain string key rather than becoming a foreign key
to `Plan`. `Plan.key` matches it. Making it an FK would require rewriting the
seed and every membership query for no behavioural gain.

The seed populates `Plan` from the two existing `PLAN_PRICES` consts so nothing
breaks at the moment of the switch; both consts are then deleted.

## 1. Booking Subsystem

**Route:** `dashboard/member/classes` — upcoming classes, seat counts, a book
button per class.

**Query:** `getBookableClasses(userId)` returns each upcoming class with its
confirmed-booking count and the caller's own booking status for that class, so
the button can render one of three states: Book / Join waitlist / Booked.

**Action:** `bookClass({ classId })`, inside `db.$transaction`:

1. Load the class and count its `CONFIRMED` bookings
2. Under capacity → insert `CONFIRMED`; at or over → insert `WAITLIST`
3. Reject a duplicate booking by the same user for the same class — where
   "duplicate" means an existing `CONFIRMED` or `WAITLIST` booking. A member
   who cancelled may book that class again.

The transaction is not optional. Counting and inserting must be atomic, or two
members clicking the last seat simultaneously both read "1 seat free" and both
get confirmed.

**Auto-promote:** `cancelBooking` (already exists, keeps its ownership guard)
gains a promotion step in the same transaction. If the cancelled booking was
`CONFIRMED`, the oldest `WAITLIST` booking for that class becomes `CONFIRMED`
and its owner is notified. If the cancelled booking was `WAITLIST`, nothing is
promoted — no seat was freed.

**Tests:** capacity boundary (last seat confirms, next one waitlists); cancel
promotes the oldest waitlister; cancelling a waitlist booking promotes nobody;
duplicate booking rejected; the existing "cannot cancel someone else's booking"
guard still holds.

## 2. Notifications

**Funnel:** `notify(userId, title, body)` in `features/notifications/notify.ts`
writes the `Notification` row, then calls `sendEmail()`. An email failure must
not roll back the row. The in-app notification is the source of truth; email is
best-effort delivery. Otherwise a Resend outage would swallow a member's
waitlist promotion entirely.

**Callers:** booking confirmed, waitlisted, promoted, cancelled; and in the
admin phase, order status changes.

**Queries / actions:** `getNotifications(userId)` (recent list + unread count);
`markNotificationRead(id)` and `markAllRead()`, both scoped to the caller's own
`userId` in the same style as `cancelBooking`'s ownership check.

**UI wiring.** `Topbar` is called as `<Topbar title="..." />` in 22 pages.
Passing notifications as a prop would mean editing all 22. Instead: the role
layout (a server component) fetches notifications and passes them to
`DashboardShell`, which puts them into its existing context provider, and
`Topbar` reads them via `useNotifications()`. Three files change; no page files
are touched.

The bell shows an unread dot and opens a dropdown panel. Mark-read is a server
action followed by `router.refresh()` — App Router does not re-render a layout
on client navigation, so without the refresh the unread count goes stale.

**Refactor included:** `updateProfile` currently lives in
`features/notifications/actions.ts`, which has nothing to do with
notifications. Since this phase adds real notification actions to that file,
`updateProfile` moves to `features/profile/actions.ts` (one import update in
`ProfileForm.tsx`). The freeze/cancel actions from section 4 then land in the
same correctly-named place.

**Tests:** `notify` still writes the row when `sendEmail` throws; mark-read on
another user's notification is forbidden.

## 3. Attendance History and Streak

**Query:** `getAttendanceSummary(userId)` in `features/workouts/queries.ts`.
Attendance is conceptually its own domain, but `markAttendance` already lives in
`workouts/actions.ts`; a new folder for a single query would break the existing
pairing of query beside action for no gain.

**Pure function:** `computeStreak(dates: Date[]): number`, separate from the DB
so the real logic is testable without one. Rules:

- Multiple check-ins on one calendar day count once
- The streak counts backwards from today; if today has no check-in it starts
  from yesterday, so a member's 30-day streak does not read as broken at 9am
- Dates compare as date-only in the server's timezone. **This is an explicit
  assumption** and will need revisiting for a gym spanning timezones.

**UI:** a "Check-in streak" `StatCard` plus a recent check-in list on the
member overview.

**Tests:** gaps break the streak; same-day duplicates count once; empty history
returns 0; today-missing-but-yesterday-present keeps the streak alive.

## 4. Freeze and Cancel

**Freeze.** Handoff §6 caps freezing at 8 weeks per year, but `frozenUntil`
alone cannot say how many weeks a member has already used — they could freeze
repeatedly and bypass the cap. Hence `MembershipFreeze`, one row per freeze.

`computeFreezeAllowance(freezes, year)` is a pure function returning weeks used
and remaining, where `year` is the calendar year a freeze's `from` date falls
in. `freezeMembership({ weeks })` validates against the remaining
allowance, rejects when exhausted, sets `Membership.frozenUntil`, and writes a
`MembershipFreeze` row.

`FROZEN` is **not** added to the stored status values. It is derived in queries
from `frozenUntil > now`. Storing it would mean updating status colour maps,
seed data, and every status comparison to express something the schema already
knows.

**Cancel.** `cancelMembership()` sets `cancelRequestedAt = now`. The effective
date is 30 days out, or `renewsAt`, whichever is later. Status does not flip to
`CANCELLED` immediately — the member has paid through the period and keeps
access until it ends. A new `cancelSubscription` stub joins
`createInvoiceCheckout` in `lib/payments.ts`, in the same shape (logs and
returns a fake result when `STRIPE_SECRET_KEY` is unset).

**Tests:** freeze rejected once 8 weeks are used in the calendar year; freeze
within allowance sets `frozenUntil` and logs a row; cancel sets an effective
date at least 30 days out; cancel does not immediately revoke access.

## 5. Admin — Members

**Route:** `dashboard/admin/members/[id]`, following the shape of the existing
`trainer/clients/[id]`. Shows membership, bookings, invoices, attendance.

**Query:** `getMemberDetail(id)`.

**Action:** `updateMembership({ userId, plan, status })` in
`features/memberships/actions.ts`, beside `updateUserRole`, with the same
`assertRole(session, ["ADMIN"])` guard.

**Search:** a plain GET form driving a `?q=` search param, filtering name and
email server-side. No client state: the URL stays shareable and it works
without JavaScript. SQLite's `LIKE` is already case-insensitive for ASCII, so
Prisma's `mode: "insensitive"` — which SQLite does not support anyway — is not
needed.

## 6. Admin — Orders and Shop

**Orders:** `advanceOrderStatus({ orderId })` moves PACKING → SHIPPED →
DELIVERED. Forward only; `DELIVERED` is terminal and further advances are
rejected. Each advance calls `notify()` for the customer.

**Shop:** `updateProduct` (name, price, stock, category — restocking is just a
stock edit) and `deleteProduct`.

`OrderItem.product` has no cascade, so deleting a product that appears in an
order fails at the database level. `deleteProduct` therefore checks for order
items first and refuses with a clear reason; otherwise it hard-deletes. An
`archived` flag would be the fuller answer but costs a schema field plus a
filter in every product query — not yet justified.

**Tests:** advancing a DELIVERED order is rejected; each advance notifies the
customer; deleting a product with order history is refused; deleting an unused
product succeeds; all actions forbidden for non-admins.

## 7. Admin — Content and Gallery

**Content:** `createPost({ title, tag })` (status `DRAFT`, author = caller),
`unpublishPost` (PUBLISHED → DRAFT), `deletePost`. As noted in Scope, posts
carry no body because the model has no such field and no blog route exists.

**Gallery:** an upload form posts a file to a server action that calls
`uploadImage()` from `lib/uploads.ts` — the first real caller of that adapter —
and writes a `GalleryImage` row. Plus `deleteGalleryImage`.

**Tests:** created posts default to DRAFT and never appear in `getPublicPosts`;
unpublish removes a post from public queries; upload writes the returned URL.

## 8. Admin — Plans

`getPublicPlans` and `getPlanBreakdown` both read `Plan` from the database
instead of the const. `getPublicPlans` is already declared `async` and its two
callers already `await` it, so the switch is signature-compatible.

`updatePlan({ key, name, priceCents })` for admins; the admin plans page gains
inline editing. Both `PLAN_PRICES` consts are deleted.

**Tests:** the public plan list reflects an admin price edit; `getPublicPlans`
returns every tier regardless of enrolment (the existing test's guarantee must
survive the migration); non-admins cannot edit plans.

## Cross-Cutting Requirements

- **Page-State Contract** (handoff §7) applies to the new `member/classes` and
  `admin/members/[id]` routes: `loading.tsx`, `error.tsx`, and an `EmptyState`.
- **Every new server action** validates input with a Zod schema in the feature's
  `schemas.ts`, calls `assertRole`, and scopes rows to the caller where the
  resource is user-owned — the three-layer pattern from handoff §5.
- **Design tokens only.** New UI uses the existing `var(--card)`,
  `var(--line)`, `var(--dim)` tokens, Bebas headings, and zero border-radius,
  matching the surrounding dashboard pages.
- **Tests run under `npm test`** (vitest). Pure functions (`computeStreak`,
  `computeFreezeAllowance`) are tested directly; actions are tested with the
  existing mocked-`db` pattern from `features/*/actions.test.ts`.

## Responsive Requirements

Every surface in this phase works on phones, tablets, and desktop. Phase 2
already established the conventions; new UI follows them rather than inventing
its own, and no new code reintroduces a fixed-width layout.

**Inherited conventions, applied to all new work:**

- Page padding `p-4 md:p-7`
- Card and stat grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`
- Forms `w-full max-w-[420px]` — full width on a phone, capped on desktop
- Tabular data goes through `DataTable`, which already wraps itself in
  `overflow-x-auto`; any new raw `<table>` gets the same wrapper
- Interactive elements are at least 44px tall on mobile (handoff §8)
- New `loading.tsx` skeletons match the responsive grid they stand in for, so
  the layout does not jump when data arrives

**Per-surface decisions:**

| Surface | Behaviour |
|---|---|
| `member/classes` list | Card grid, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Book button full-width on mobile, ≥44px. Seat count and time must not wrap into each other at 320px. |
| Notification panel | The one genuinely new responsive problem — see below |
| `admin/members/[id]` | Stat row `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; the bookings/invoices/attendance tables use `DataTable` |
| Members search form | Input plus submit stack vertically below `sm`, inline above |
| Edit forms (product, post, plan, freeze/cancel) | Same `w-full max-w-[420px]` pattern as `AddProductForm` |
| Gallery upload | File input full-width on mobile; the grid keeps its existing `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| Row-level action buttons (advance order, unpublish, delete) | ≥44px targets; on phones the row stacks so buttons never crowd the label |

**Notification panel.** A narrow absolutely-positioned popover anchored to the
bell overflows the viewport on a phone. So the panel is width-constrained and
right-anchored from `sm` up, but below `sm` it becomes a full-width sheet
pinned under the Topbar, with `max-h` and internal scrolling so a long list
never pushes the page. This mirrors how `DashboardShell` already treats the
sidebar: a drawer on phones, permanent from `md` up.

**Verification.** Responsiveness is checked by reading the rendered pages at
320px, 768px, and 1280px — no page may scroll horizontally at 320px, and no
interactive target may fall below 44px there. Unit tests do not cover layout;
this check is manual and belongs in each implementation step's verification.
