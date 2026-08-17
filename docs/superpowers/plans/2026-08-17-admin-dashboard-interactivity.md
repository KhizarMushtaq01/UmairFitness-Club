# Admin Dashboard Interactivity (Phase 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin dashboard the write actions it has never had — member editing and search, order status advance, product edit/delete, post create/unpublish/delete, gallery upload/delete, and database-backed editable plan prices.

**Architecture:** One migration first (`Plan`), then feature-vertical: each area goes schema → query → action → UI → test before the next begins. Every write is a server action following the established three-layer pattern (Zod schema in the feature's `schemas.ts` → `assertRole` → scoped DB write → `revalidatePath`). No new client state libraries: search is a plain GET form driving a URL param, and every mutation is a `useTransition` button or a `react-hook-form` form matching `AddProductForm`.

**Tech Stack:** Next.js 15.5 (App Router, server actions), React 19, Prisma 7 on SQLite, Zod 4, react-hook-form + `@hookform/resolvers`, Vitest 4 (`environment: "node"`, mocked `@/lib/db`), Tailwind 4 with CSS custom-property design tokens.

**Spec:** `docs/superpowers/specs/2026-08-16-dashboard-interactivity-design.md` — sections **5 (Members)**, **6 (Orders and Shop)**, **7 (Content and Gallery)**, **8 (Plans)**, plus **Cross-Cutting Requirements** and **Responsive Requirements**. That spec covers both phases; the member half shipped as Phase 4. This plan implements the admin half and nothing else.

**Prior phase:** Phase 4 ledger at `docs/superpowers/ledgers/2026-08-16-member-dashboard-interactivity-ledger.md`. Read its final "Deferred by the final review" paragraph before starting — several items land here.

---

## Global Constraints

Copied from the spec. Every task's requirements implicitly include this section.

- **Three-layer pattern (handoff §5).** Every new server action validates input with a Zod schema in the feature's `schemas.ts`, calls `assertRole`, and scopes rows to the caller where the resource is user-owned.
- **Page-State Contract (handoff §7).** New routes ship `loading.tsx`, `error.tsx`, and an `EmptyState`. Applies to `admin/members/[id]`.
- **Design tokens only.** `var(--card)`, `var(--line)`, `var(--line2)`, `var(--dim)`, `var(--mut)`, `var(--red)`, `var(--txt)`. Bebas headings via `style={{ fontFamily: "var(--font-heading)" }}`. Zero border-radius.
- **Page padding** `p-4 md:p-7`. Content wrapper `max-w-[1200px]`.
- **Forms** `w-full max-w-[420px]` — full width on a phone, capped on desktop.
- **Card and stat grids** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`.
- **Tabular data** goes through `DataTable`, which already wraps itself in `overflow-x-auto`. Any new raw `<table>` gets the same wrapper.
- **Interactive elements at least 44px tall on mobile (handoff §8).** Use `min-h-[44px] inline-flex items-center justify-center` — the pattern in `PublishButton.tsx`.
- **Row-level action buttons** (advance order, unpublish, delete) get ≥44px targets; on phones the row stacks so buttons never crowd the label.
- **New `loading.tsx` skeletons match the responsive grid they stand in for**, so the layout does not jump when data arrives.
- **Tests run under `npm test`** (vitest). Pure functions are tested directly; actions use the mocked-`db` pattern from `src/features/*/actions.test.ts`.
- **Responsive verification** is manual: read the rendered page at 320px, 768px, and 1280px. No page may scroll horizontally at 320px and no interactive target may fall below 44px there.

**Baseline at plan time:** 20 test files, 127 tests, 0 failures. `npx tsc --noEmit` clean, `npm run lint` clean. Every task's verification step includes keeping that true.

**Command notes for this repo:**
- `npm test` runs the whole suite. A single file: `npx vitest run path/to/file.test.ts --reporter=verbose`.
- `--reporter=basic` does **not** exist in Vitest 4 here and errors out. Use `verbose` or `dot`.
- Lint is bare `eslint` (`npm run lint`). Do **not** use `next lint` — it is deprecated in 15.5 and prints a migration notice.
- `vitest.config.mts` excludes `**/.claude/**` so worktrees are not collected twice.
- Paths containing `(dashboard)` must be quoted in shell commands.

---

## Plan-Level Rulings

Decisions made while writing this plan where the spec was silent, or where following it literally would ship something broken. Each names what it costs if the call is wrong.

**Ruling 1 — Guard inside `notify()` and delete the five call-site try/catches (Task 2).** The Phase 4 ledger lists this as deferred with "right fix is guarding inside notify itself". Phase 5 adds another caller (`advanceOrderStatus`), so leaving it means copy #6 of an eight-line block. Doing it now is a net deletion. **Cost if wrong:** callers lose the defence-in-depth of their own try/catch, so a future non-best-effort statement added inside `notify` before the guard could propagate. Mitigated by `notify`'s own tests pinning that it never throws. **This is the only task that edits Phase 4 code.** It is droppable — see the note at the end of Task 2 for exactly what changes if you skip it.

**Ruling 2 — The `uploadImage` stub writes into `public/uploads/` and returns a relative path (Task 14).** The current stub returns `https://stub-cdn.local/<name>`. `next/image` refuses any host not in `next.config.ts` `remotePatterns`, and the gallery page renders through `next/image`, so with the stub as-is **every uploaded image would be broken on the page it was just uploaded to** — in the default configuration everyone runs, since `CLOUDINARY_URL` is unset. A relative `/uploads/<name>` needs no `remotePatterns` entry and actually renders. **Cost if wrong:** writing to `public/` at runtime does not work on a serverless host. This is the stub path only — with `CLOUDINARY_URL` set, uploads go to Cloudinary exactly as before, and that is the deployed path. Recorded here so nobody mistakes the stub for production behaviour.

**Ruling 3 — `formatPlanPrice` preserves the existing marketing copy exactly.** Moving prices into `Plan.priceCents` means the display string is now derived. Whole-dollar amounts render `$89 / mo` (unchanged from today's const); non-whole amounts an admin types render `$149.50 / mo`. Formatting every price at 2dp would have been simpler but silently rewrites the live pricing page to `$89.00 / mo`. **Cost if wrong:** one extra branch in a five-line function.

**Ruling 4 — The marketing test `"does not touch the database"` is deleted, not adapted (Task 16).** It asserts `getPublicPlans` reads no DB, which is precisely what Task 16 changes. The guarantee worth keeping is the *other* one — every tier appears regardless of enrolment — and that is preserved by reading the `Plan` table rather than grouping memberships. Named here so its removal reads as intentional rather than as coverage quietly dropping.

**Ruling 5 — `updateMembership` validates the plan key against the `Plan` table, not a hardcoded Zod enum.** An enum would reintroduce the very const Task 16 deletes, and would need editing every time an admin adds a tier. **Cost if wrong:** one extra DB read per membership edit.

**Ruling 6 — `getMemberDetail` returns `null` for a user who is not a `MEMBER`.** The route is "admin members detail", not a generic user viewer; a trainer's id should 404 rather than render a member page with empty tables. Matches how `getAllMembers` already filters.

**Ruling 7 — `advanceOrderStatus` reads and writes inside one `db.$transaction`.** Read-then-write on `status` is check-then-act; two admins clicking at once could advance PACKING → DELIVERED in one round trip. Same reasoning, and same SQLite caveat, as `bookClass`. **Cost if wrong:** a transaction wrapper around two statements that would usually be fine without it.

**Ruling 8 — the cancellation scheduler stays out of scope.** The spec's own "Known gap" section (§ after Scope) says nothing flips a membership to `CANCELLED` when `cancelEffectiveAt` passes, and that it needs a follow-up. This plan does not build it. `updateMembership` (Task 6) gives an admin a manual way to set `CANCELLED`, which is a mitigation, not the fix. **Cost if wrong:** the gap stays open one more phase, still visible and still written down.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `src/features/memberships/schemas.ts` | Zod schema for `updateMembership`. Memberships has no `schemas.ts` today. |
| `src/features/plans/format.ts` | `formatPlanPrice(cents)` — the one place a plan price becomes display text. |
| `src/features/plans/format.test.ts` | Tests for the above. |
| `src/features/plans/schemas.ts` | Zod schema for `updatePlan`. |
| `src/features/plans/actions.ts` | `updatePlan`. |
| `src/features/plans/actions.test.ts` | Tests for the above. |
| `src/app/(dashboard)/dashboard/admin/members/[id]/page.tsx` | Member detail route. |
| `src/app/(dashboard)/dashboard/admin/members/[id]/loading.tsx` | Page-State Contract. |
| `src/app/(dashboard)/dashboard/admin/members/[id]/error.tsx` | Page-State Contract. |
| `src/app/(dashboard)/dashboard/admin/members/[id]/MembershipForm.tsx` | Client form for `updateMembership`. |
| `src/app/(dashboard)/dashboard/admin/members/MemberSearchForm.tsx` | GET form driving `?q=`. |
| `src/app/(dashboard)/dashboard/admin/orders/AdvanceOrderButton.tsx` | Row action. |
| `src/app/(dashboard)/dashboard/admin/shop/ProductRowActions.tsx` | Edit + delete for one product. |
| `src/app/(dashboard)/dashboard/admin/content/CreatePostForm.tsx` | Create post. |
| `src/app/(dashboard)/dashboard/admin/content/PostRowActions.tsx` | Unpublish + delete. |
| `src/app/(dashboard)/dashboard/admin/gallery/GalleryUploadForm.tsx` | File upload. |
| `src/app/(dashboard)/dashboard/admin/gallery/DeleteImageButton.tsx` | Row action. |
| `src/app/(dashboard)/dashboard/admin/plans/PlanRowEditor.tsx` | Inline plan editing. |
| `src/features/memberships/queries.test.ts` (extended) | Already exists — gains `getMemberDetail` tests. |

**Modified**

| Path | Change |
|---|---|
| `prisma/schema.prisma` | Add `Plan`. |
| `prisma/seed.ts` | Seed the three plans. |
| `src/lib/uploads.ts` | Stub writes into `public/uploads/` (Ruling 2). |
| `src/features/notifications/notify.ts` | Guard the whole body (Ruling 1). |
| `src/features/notifications/notify.test.ts` | Pin that `notify` never throws. |
| `src/features/bookings/actions.ts` | Drop 3 call-site try/catches. |
| `src/features/bookings/actions.test.ts` | Drop the now-vacuous swallow tests. |
| `src/features/profile/actions.ts` | Drop 2 call-site try/catches. |
| `src/features/profile/actions.test.ts` | Same. |
| `src/features/memberships/queries.ts` | `getAllMembers(q?)`, `getMemberDetail(id)`, `getPlanBreakdown` reads `Plan`. |
| `src/features/memberships/actions.ts` | Add `updateMembership`. |
| `src/features/memberships/actions.test.ts` | Tests for the above. |
| `src/features/shop/schemas.ts` | Add 3 schemas. |
| `src/features/shop/actions.ts` | Add `advanceOrderStatus`, `updateProduct`, `deleteProduct`. |
| `src/features/shop/actions.test.ts` | Tests for the above. |
| `src/features/shop/queries.ts` | `getAllOrders` exposes raw status; `getAllProducts` exposes raw price/stock for editing. |
| `src/features/content/schemas.ts` | Add 4 schemas. |
| `src/features/content/actions.ts` | Add `createPost`, `unpublishPost`, `deletePost`, `uploadGalleryImage`, `deleteGalleryImage`. |
| `src/features/content/actions.test.ts` | Tests for the above. |
| `src/features/marketing/queries.ts` | `getPublicPlans` reads `Plan`; delete `PLAN_PRICES`. |
| `src/features/marketing/queries.test.ts` | Rewrite the two `getPublicPlans` tests (Ruling 4). |
| `src/app/(dashboard)/dashboard/admin/members/page.tsx` | Search form, linked rows. |
| `src/app/(dashboard)/dashboard/admin/orders/page.tsx` | Advance button column. |
| `src/app/(dashboard)/dashboard/admin/shop/page.tsx` | Row actions column. |
| `src/app/(dashboard)/dashboard/admin/content/page.tsx` | Create form, row actions. |
| `src/app/(dashboard)/dashboard/admin/gallery/page.tsx` | Upload form, delete buttons. |
| `src/app/(dashboard)/dashboard/admin/plans/page.tsx` | Inline editing. |

---

## Task 1: Migration — the `Plan` model

**Files:**
- Modify: `prisma/schema.prisma` (append after `MembershipFreeze`)
- Modify: `prisma/seed.ts:98` (insert before the `galleryImage.createMany` block)

**Interfaces:**
- Consumes: nothing
- Produces: Prisma model `Plan { id: string; key: string; name: string; priceCents: number; sortOrder: number }`, accessible as `db.plan`. Tasks 6 and 16 depend on it. `key` is `@unique` and matches `Membership.plan`.

**Why no foreign key:** the spec is explicit — `Membership.plan` stays a plain string key rather than becoming an FK to `Plan`. `Plan.key` matches it. Making it an FK would require rewriting the seed and every membership query for no behavioural gain.

- [ ] **Step 1: Add the model to the schema**

Append to `prisma/schema.prisma`:

```prisma
// Plan prices used to live as a formatted-string const duplicated in
// features/marketing/queries.ts and features/memberships/queries.ts. They are
// rows now so an admin can edit them. `key` matches Membership.plan by value;
// deliberately not a foreign key — see the phase 5 plan, Task 1.
model Plan {
  id         String @id @default(cuid())
  key        String @unique // CONTENDER | FIGHTER | CHAMPION
  name       String
  priceCents Int
  sortOrder  Int
}
```

- [ ] **Step 2: Push the schema and regenerate the client**

Run: `npx prisma db push`

Expected: "Your database is now in sync with your Prisma schema." followed by the client generation line. If it reports data loss, stop — this migration is additive and must not.

- [ ] **Step 3: Seed the three plans**

In `prisma/seed.ts`, insert immediately **before** the `await db.galleryImage.createMany({` block:

```ts
  // Prices carried over verbatim from the two PLAN_PRICES consts these rows
  // replace ($89 / $149 / $249 a month), so nothing on the public pricing page
  // changes at the moment of the switch. Phase 5 Task 16 deletes both consts.
  await db.plan.createMany({
    data: [
      { key: "CONTENDER", name: "Contender", priceCents: 8900, sortOrder: 1 },
      { key: "FIGHTER", name: "Fighter", priceCents: 14900, sortOrder: 2 },
      { key: "CHAMPION", name: "Champion", priceCents: 24900, sortOrder: 3 },
    ],
  });
```

- [ ] **Step 4: Prove the seed still runs end to end**

The seed calls `db.user.create` with fixed emails and does no cleanup, so it only runs against an empty database.

Run: `npx prisma db push --force-reset && npx prisma db seed`

Expected: `Seed complete: { admin: 'danny@umairfitness.gym', trainer: 'ana@umairfitness.gym', member: 'marcus@umairfitness.gym' }`

**`--force-reset` wipes the database.** If you are working in a git worktree, `dev.db` there is a copy and the user's main database is untouched — confirm you are in the worktree before running it.

- [ ] **Step 5: Confirm the generated client exposes the model**

Run: `npx prisma validate`

Expected: "The schema at prisma/schema.prisma is valid."

Then confirm `db.plan` is real, not just declared:

Run: `node -e "const{PrismaClient}=require('@prisma/client');console.log(typeof new PrismaClient().plan.findMany)"`

Expected: `function`

- [ ] **Step 6: Run the suite and commit**

Run: `npm test`

Expected: 20 files, 127 tests, 0 failures. No test reads `Plan` yet; this only proves the migration broke nothing.

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat: add the Plan model and seed the three tiers"
```

---

## Task 2: Move the notify guard inside `notify()`

**Files:**
- Modify: `src/features/notifications/notify.ts:25-35`
- Modify: `src/features/notifications/notify.test.ts`
- Modify: `src/features/bookings/actions.ts:44-59`, `:109-119`
- Modify: `src/features/bookings/actions.test.ts`
- Modify: `src/features/profile/actions.ts:83`, `:130` (and their surrounding try/catch)
- Modify: `src/features/profile/actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `notify(userId: string, title: string, body: string): Promise<void>` that **never rejects**. Task 8 relies on this — `advanceOrderStatus` calls `notify` with no try/catch of its own.

See **Ruling 1**. This is the only task that edits Phase 4 code.

- [ ] **Step 1: Write the failing test**

Add to `src/features/notifications/notify.test.ts`. Check the existing mock factory at the top of that file first — if `db.notification.create` is already mocked, reuse it rather than redeclaring.

```ts
it("never rejects when the in-app notification row cannot be written", async () => {
  // The whole point of the funnel: callers treat notify as fire-and-forget,
  // so a database failure here must not turn an already-committed booking or
  // order advance into an error the user sees.
  (db.notification.create as unknown as Mock).mockRejectedValue(new Error("db down"));

  await expect(notify("u1", "Title", "Body")).resolves.toBeUndefined();
});

it("does not attempt an email when the notification row failed", async () => {
  (db.notification.create as unknown as Mock).mockRejectedValue(new Error("db down"));

  await notify("u1", "Title", "Body");

  expect(db.user.findUnique as unknown as Mock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/notifications/notify.test.ts --reporter=verbose`

Expected: FAIL — `promise rejected "Error: db down" instead of resolving`. That is the missing guard, not a typo.

- [ ] **Step 3: Guard the whole body**

Replace the body of `notify` in `src/features/notifications/notify.ts`:

```ts
/**
 * The single funnel for member-facing notifications.
 *
 * Best-effort in full: this never rejects. Callers are actions that have
 * already committed their real work (a booking, an order advance), and none
 * of them should turn a delivery failure into a failure the user sees. The
 * guard lives here rather than at each call site because there are now six of
 * them and every future one inherits it for free.
 */
export async function notify(userId: string, title: string, body: string): Promise<void> {
  try {
    await db.notification.create({ data: { userId, title, body } });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await sendEmail({ to: user.email, subject: title, html: `<p>${escapeHtml(body)}</p>` });
  } catch (err) {
    console.error("[notify] delivery failed", err);
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/features/notifications/notify.test.ts --reporter=verbose`

Expected: PASS, all tests in the file.

- [ ] **Step 5: Delete the three try/catches in `bookings/actions.ts`**

In `cancelBooking`, replace lines 36-59 with:

```ts
  // Outside the transaction on purpose: notify sends email, and holding a
  // database transaction open across a network call is how deadlocks start.
  // notify never rejects (see its doc comment), so no guard is needed here —
  // the cancellation and any promotion have already committed.
  await notify(cancelled.booking.userId, "Booking cancelled", "Your booking has been cancelled.");
  if (cancelled.promoted) {
    await notify(
      cancelled.promoted.userId,
      "A seat opened up",
      "You were on the waitlist and your place is now confirmed."
    );
  }
```

In `bookClass`, replace lines 102-119 with:

```ts
  // Outside the transaction on purpose: notify sends email, and holding a
  // database transaction open across a network call is how deadlocks start.
  // notify never rejects, so the committed booking cannot be undone by a
  // delivery failure.
  await notify(
    userId,
    booked.status === "CONFIRMED" ? "Booked in" : "Added to the waitlist",
    booked.status === "CONFIRMED"
      ? `Your seat for ${booked.title} is confirmed.`
      : `${booked.title} is full. We'll confirm you automatically if a seat frees up.`
  );
```

- [ ] **Step 6: Delete the two try/catches in `profile/actions.ts`**

Open `src/features/profile/actions.ts` and unwrap the `notify` calls at roughly lines 83 and 130 the same way, keeping each surrounding comment's *reason* but dropping the now-false claim that the call site guards it.

**Do not touch the `cancelSubscription` call.** The comment near line 112 says it is deliberately unguarded for a different reason (a failed Stripe cancellation must not be swallowed). That reasoning is unrelated to this task and still correct.

- [ ] **Step 7: Delete the now-vacuous caller tests**

These assert that an action resolves when `notify` rejects. `notify` can no longer reject, and the tests only still pass because they mock it — they now pin mock behaviour rather than production behaviour.

In `src/features/bookings/actions.test.ts`, delete:
- `"still resolves ok when notifying the promoted member fails, since the transaction already committed"`
- `"still notifies the promoted member when notifying the cancelling member fails"`
- `"still resolves the booking when notify fails, since the booking already committed"`

In `src/features/profile/actions.test.ts`, delete any test that makes `notify` reject and asserts the action still resolves.

Keep every test that asserts notify was *called* — ordering, recipient, and call count are all still real guarantees.

- [ ] **Step 8: Verify the deletion still bites where it matters**

Temporarily re-break `notify` by removing its `try`/`catch` again, then run `npx vitest run src/features/notifications/notify.test.ts --reporter=verbose`.

Expected: FAIL. Restore the guard and confirm PASS. This proves the guarantee moved rather than evaporated.

- [ ] **Step 9: Full suite, typecheck, lint, commit**

Run: `npm test && npx tsc --noEmit && npm run lint`

Expected: all green. Test count drops by 4-5 (the deleted caller tests) and rises by 2 (the new notify tests).

```bash
git add src/features/notifications src/features/bookings src/features/profile
git commit -m "refactor: guard delivery inside notify instead of at every call site"
```

**If you skip this task:** everything else still works, but Task 8's `advanceOrderStatus` must wrap its own `notify` call in `try { … } catch (err) { console.error("[advanceOrderStatus] notify failed after status commit", err); }`, matching the existing five call sites. Nothing else in this plan changes.

---

## Task 3: `getMemberDetail(id)` query

**Files:**
- Modify: `src/features/memberships/queries.ts`
- Test: `src/features/memberships/queries.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
getMemberDetail(id: string): Promise<{
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  statusColor: string;
  memberSince: string;
  bookingCount: number;
  attendanceCount: number;
  bookings: { id: string; title: string; day: string; status: string }[];
  invoices: { id: string; desc: string; amount: string; status: string; issuedAt: string }[];
  attendance: { id: string; date: string }[];
} | null>
```

Task 4 renders it. Task 7's form reads `plan` and `status` from it.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/memberships/queries.test.ts`. Read the top of that file first — extend the existing `vi.mock("@/lib/db", …)` factory to include `user: { findUnique: vi.fn(), findMany: vi.fn() }` rather than adding a second factory.

```ts
describe("getMemberDetail", () => {
  const memberRow = {
    id: "u1",
    name: "Marcus Reid",
    email: "marcus@umairfitness.gym",
    role: "MEMBER",
    createdAt: new Date("2026-01-15T10:00:00"),
    memberships: [
      { id: "m1", plan: "FIGHTER", status: "ACTIVE", createdAt: new Date("2026-01-15T10:00:00") },
    ],
    bookings: [
      {
        id: "b1",
        status: "CONFIRMED",
        createdAt: new Date("2026-08-01T10:00:00"),
        class: { title: "Boxing — Advanced", startsAt: new Date("2026-08-20T18:30:00") },
      },
    ],
    invoices: [
      {
        id: "i1",
        desc: "Fighter plan — July",
        amount: 14900,
        status: "PAID",
        issuedAt: new Date("2026-07-01T00:00:00"),
      },
    ],
    attendance: [{ id: "a1", checkedInAt: new Date("2026-08-16T07:00:00") }],
    _count: { bookings: 12, attendance: 30 },
  };

  it("returns null for a user who does not exist", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(null);

    await expect(getMemberDetail("nope")).resolves.toBeNull();
  });

  it("returns null for a trainer, so the members route cannot view staff", async () => {
    // This route is admin > members > detail. A trainer id must 404 rather
    // than render a member page with empty membership fields.
    (db.user.findUnique as unknown as Mock).mockResolvedValue({
      ...memberRow,
      role: "TRAINER",
    });

    await expect(getMemberDetail("t1")).resolves.toBeNull();
  });

  it("reports the plan and status from the newest membership", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    const detail = await getMemberDetail("u1");

    expect(detail?.plan).toBe("FIGHTER");
    expect(detail?.status).toBe("ACTIVE");
  });

  it("falls back to placeholders for a member with no membership row", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue({ ...memberRow, memberships: [] });

    const detail = await getMemberDetail("u1");

    expect(detail?.plan).toBe("—");
    expect(detail?.status).toBe("NONE");
  });

  it("formats invoice amounts as dollars", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    const detail = await getMemberDetail("u1");

    expect(detail?.invoices[0].amount).toBe("$149.00");
  });

  it("reports totals from _count, not from the truncated lists", async () => {
    // The lists are capped with `take` so a long-tenured member does not pull
    // their whole history into memory. The headline numbers must still be the
    // real ones, so they come from _count — asserting 12 and 30 against lists
    // of length 1 is what pins that.
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    const detail = await getMemberDetail("u1");

    expect(detail?.bookingCount).toBe(12);
    expect(detail?.attendanceCount).toBe(30);
    expect(detail?.bookings).toHaveLength(1);
  });

  it("bounds every history list it loads", async () => {
    (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);

    await getMemberDetail("u1");

    const arg = (db.user.findUnique as unknown as Mock).mock.calls[0][0];
    expect(arg.include.bookings.take).toBe(20);
    expect(arg.include.invoices.take).toBe(20);
    expect(arg.include.attendance.take).toBe(20);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/memberships/queries.test.ts --reporter=verbose`

Expected: FAIL — `getMemberDetail is not a function` (or an import error naming it). A module/export-missing failure, not an assertion mismatch.

- [ ] **Step 3: Implement it**

Append to `src/features/memberships/queries.ts`:

```ts
/**
 * One member, everything the admin detail route shows.
 *
 * Returns null for anyone who is not a MEMBER: this backs
 * admin/members/[id], not a generic user viewer, so a trainer id must 404.
 *
 * Every history list is capped at 20 rows — the tables show a recent window,
 * while the headline counts come from _count so they stay accurate for a
 * member with years of history.
 */
export async function getMemberDetail(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      memberships: { orderBy: { createdAt: "desc" }, take: 1 },
      bookings: { orderBy: { createdAt: "desc" }, take: 20, include: { class: true } },
      invoices: { orderBy: { issuedAt: "desc" }, take: 20 },
      attendance: { orderBy: { checkedInAt: "desc" }, take: 20 },
      _count: { select: { bookings: true, attendance: true } },
    },
  });
  if (!user || user.role !== "MEMBER") return null;

  const ms = user.memberships[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: ms?.plan ?? "—",
    status: ms?.status ?? "NONE",
    statusColor: ms?.status === "AT_RISK" ? "var(--red)" : "var(--mut)",
    memberSince: user.createdAt.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    bookingCount: user._count.bookings,
    attendanceCount: user._count.attendance,
    bookings: user.bookings.map((b) => ({
      id: b.id,
      title: b.class.title,
      day: b.class.startsAt.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: b.status,
    })),
    invoices: user.invoices.map((i) => ({
      id: i.id,
      desc: i.desc,
      amount: `$${(i.amount / 100).toFixed(2)}`,
      status: i.status,
      issuedAt: i.issuedAt.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    })),
    attendance: user.attendance.map((a) => ({
      id: a.id,
      date: a.checkedInAt.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    })),
  };
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run src/features/memberships/queries.test.ts --reporter=verbose`

Expected: PASS, 7 new tests.

- [ ] **Step 5: Commit**

```bash
npm test && npx tsc --noEmit
git add src/features/memberships/queries.ts src/features/memberships/queries.test.ts
git commit -m "feat: add the admin member detail query"
```

---

## Task 4: The `admin/members/[id]` route

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/members/[id]/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/members/[id]/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/members/[id]/error.tsx`

**Interfaces:**
- Consumes: `getMemberDetail(id)` from Task 3
- Produces: the route `/dashboard/admin/members/<id>`, which Task 5 links rows to and Task 7 adds a form to.

No unit tests — this is a server component with no logic beyond rendering. Verification is compile + a live read at three widths, per the spec.

- [ ] **Step 1: Write the page**

```tsx
import { notFound } from "next/navigation";
import { getMemberDetail } from "@/features/memberships/queries";
import { Topbar } from "@/components/shared/Topbar";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";

type Detail = NonNullable<Awaited<ReturnType<typeof getMemberDetail>>>;
type BookingRow = Detail["bookings"][number];
type InvoiceRow = Detail["invoices"][number];
type AttendanceRow = Detail["attendance"][number];

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getMemberDetail(id);
  if (!detail) notFound();

  return (
    <>
      <Topbar title={detail.name} />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Plan" value={detail.plan} />
          <StatCard label="Status" value={detail.status} deltaColor={detail.statusColor} />
          <StatCard label="Bookings" value={String(detail.bookingCount)} />
          <StatCard label="Check-ins" value={String(detail.attendanceCount)} />
        </div>

        <div className="bg-[var(--card)] border border-[var(--line)] p-5">
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Member
          </div>
          <div className="text-sm mt-2">{detail.email}</div>
          <div className="text-[var(--dim)] text-xs mt-1">Member since {detail.memberSince}</div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
            Recent bookings
          </h2>
          {detail.bookings.length === 0 ? (
            <EmptyState body="This member has not booked a class yet." />
          ) : (
            <DataTable<BookingRow>
              columns={[
                { header: "Class", render: (r) => r.title },
                { header: "Date", render: (r) => r.day },
                { header: "Status", render: (r) => <StatusBadge label={r.status} color="var(--mut)" /> },
              ]}
              rows={detail.bookings}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
            Invoices
          </h2>
          {detail.invoices.length === 0 ? (
            <EmptyState body="No invoices have been issued to this member." />
          ) : (
            <DataTable<InvoiceRow>
              columns={[
                { header: "Description", render: (r) => r.desc },
                { header: "Amount", render: (r) => r.amount },
                { header: "Issued", render: (r) => r.issuedAt },
                { header: "Status", render: (r) => <StatusBadge label={r.status} color="var(--mut)" /> },
              ]}
              rows={detail.invoices}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
            Attendance
          </h2>
          {detail.attendance.length === 0 ? (
            <EmptyState body="This member has never checked in." />
          ) : (
            <DataTable<AttendanceRow>
              columns={[{ header: "Checked in", render: (r) => r.date }]}
              rows={detail.attendance}
            />
          )}
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Write `loading.tsx`**

The skeleton matches the stat grid this page opens with, so the layout does not jump. `TableSkeleton` alone would be the wrong shape — that mismatch was logged as a real spec deviation in the Phase 4 ledger, so do not repeat it here.

```tsx
import { StatRowSkeleton, TableSkeleton } from "@/components/shared/Skeletons";

export default function Loading() {
  return (
    <div className="p-4 md:p-7 flex flex-col gap-6">
      <StatRowSkeleton />
      <TableSkeleton />
    </div>
  );
}
```

- [ ] **Step 3: Write `error.tsx`**

Identical in shape to every sibling route's:

```tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-4 md:p-7">
      <ErrorState onRetry={reset} />
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles and serves**

Run: `npx tsc --noEmit && npm run lint`

Expected: both clean.

Then start a dev server and open the route for the seeded member. `BETTER_AUTH_URL` in `.env` is pinned to port 3200 — if 3200 is occupied and you use another port, login silently hangs unless you override the variable too. The Phase 4 live pass hit exactly this:

```bash
npx next dev -p 3200
```

Log in as `danny@umairfitness.gym` / `password123`, go to `/dashboard/admin/members`, and copy a member id from the seeded data, then open `/dashboard/admin/members/<id>`.

Expected: name in the Topbar, four stat cards, three tables. An unknown id renders the 404 page.

- [ ] **Step 5: Read it at three widths**

At 320 / 768 / 1280px confirm: no horizontal scroll at 320, stat cards stack to one column at 320 and four across at 1280, and each table scrolls inside its own `overflow-x-auto` rather than pushing the page.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/dashboard/admin/members/[id]"
git commit -m "feat: add the admin member detail route"
```

---

## Task 5: Member search and linked rows

**Files:**
- Modify: `src/features/memberships/queries.ts` (`getAllMembers`)
- Modify: `src/features/memberships/queries.test.ts`
- Create: `src/app/(dashboard)/dashboard/admin/members/MemberSearchForm.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/members/page.tsx`

**Interfaces:**
- Consumes: the route from Task 4
- Produces: `getAllMembers(q?: string)` — the existing no-argument call sites keep working unchanged.

**Why a GET form:** the spec is explicit. A plain GET form driving `?q=` keeps the URL shareable and works without JavaScript. SQLite's `LIKE` is already case-insensitive for ASCII, so Prisma's `mode: "insensitive"` — which SQLite does not support anyway — is not used.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/memberships/queries.test.ts`:

```ts
describe("getAllMembers", () => {
  beforeEach(() => {
    (db.user.findMany as unknown as Mock).mockResolvedValue([]);
  });

  it("filters by role only when no query is given", async () => {
    await getAllMembers();

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ role: "MEMBER" });
  });

  it("matches the query against both name and email", async () => {
    await getAllMembers("marcus");

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({
      role: "MEMBER",
      OR: [{ name: { contains: "marcus" } }, { email: { contains: "marcus" } }],
    });
  });

  it("keeps the role filter when searching, so a trainer never matches", async () => {
    // Dropping `role` from the search branch would let an admin surface staff
    // rows on the members screen. Asserting the whole where-object is what
    // pins that, not just the OR.
    await getAllMembers("ana");

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where.role).toBe("MEMBER");
  });

  it("treats a blank or whitespace-only query as no query", async () => {
    await getAllMembers("   ");

    const arg = (db.user.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ role: "MEMBER" });
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/memberships/queries.test.ts --reporter=verbose`

Expected: the two query-filter tests FAIL with the received `where` being `{ role: "MEMBER" }` — the parameter is ignored today. The other two pass already, which is fine: they pin behaviour the change must not break.

- [ ] **Step 3: Add the parameter**

Replace the signature and `where` in `getAllMembers`:

```ts
export async function getAllMembers(q?: string) {
  // SQLite's LIKE is case-insensitive for ASCII already, so Prisma's
  // `mode: "insensitive"` is both unnecessary and unsupported by this
  // provider. A whitespace-only query is treated as no query so an empty
  // submit does not return zero rows.
  const term = q?.trim();
  const members = await db.user.findMany({
    where: term
      ? {
          role: "MEMBER",
          OR: [{ name: { contains: term } }, { email: { contains: term } }],
        }
      : { role: "MEMBER" },
    include: { memberships: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
```

Leave the `return members.map(...)` block below it exactly as it is.

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run src/features/memberships/queries.test.ts --reporter=verbose`

Expected: PASS, all 4 new tests.

- [ ] **Step 5: Write the search form**

A server component — no `"use client"`, no state. Stacks below `sm`, inline above, per the spec's per-surface table.

`src/app/(dashboard)/dashboard/admin/members/MemberSearchForm.tsx`:

```tsx
export function MemberSearchForm({ q }: { q: string }) {
  return (
    <form method="GET" className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-[560px]">
      <input
        name="q"
        defaultValue={q}
        placeholder="Search name or email"
        aria-label="Search members by name or email"
        className="flex-1 border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      <button
        type="submit"
        className="bg-[var(--red)] text-white px-6 py-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
      >
        Search
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Wire the page up**

Replace `src/app/(dashboard)/dashboard/admin/members/page.tsx` entirely:

```tsx
import Link from "next/link";
import { getAllMembers } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MemberSearchForm } from "./MemberSearchForm";

type MemberRow = Awaited<ReturnType<typeof getAllMembers>>[number];

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const members = await getAllMembers(q);

  return (
    <>
      <Topbar title="Members" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <MemberSearchForm q={q ?? ""} />
        {members.length === 0 ? (
          <EmptyState
            body={q ? `No members match "${q}".` : "No members yet."}
          />
        ) : (
          <DataTable<MemberRow>
            columns={[
              {
                header: "Name",
                render: (r) => (
                  <Link
                    href={`/dashboard/admin/members/${r.id}`}
                    className="underline underline-offset-4"
                  >
                    {r.name}
                  </Link>
                ),
              },
              { header: "Email", render: (r) => r.email },
              { header: "Plan", render: (r) => r.plan },
              {
                header: "Status",
                render: (r) => <StatusBadge label={r.status} color={r.statusColor} />,
              },
            ]}
            rows={members}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 7: Verify live**

`npx next dev -p 3200`, log in as the admin, open `/dashboard/admin/members`.

Confirm: searching "marcus" narrows the table and the URL becomes `?q=marcus`; the query survives a page reload; clearing the box and submitting returns everyone; a name click opens the Task 4 detail route; searching a trainer's name ("ana") returns the empty state, not a staff row.

- [ ] **Step 8: Read it at three widths**

At 320px the input and button stack and both are ≥44px tall; at 768px and above they sit inline. No horizontal scroll at 320.

- [ ] **Step 9: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/memberships "src/app/(dashboard)/dashboard/admin/members"
git commit -m "feat: search members by name or email and link rows to detail"
```

---

## Task 6: `updateMembership` action

**Files:**
- Create: `src/features/memberships/schemas.ts`
- Modify: `src/features/memberships/actions.ts`
- Modify: `src/features/memberships/actions.test.ts`

**Interfaces:**
- Consumes: `db.plan` from Task 1
- Produces: `updateMembership({ userId, plan, status }): Promise<{ ok: true }>` and `updateMembershipSchema` / `UpdateMembershipInput`. Task 7's form calls it.

See **Ruling 5** for why `plan` is validated against the `Plan` table rather than a Zod enum.

- [ ] **Step 1: Write the schema**

`src/features/memberships/schemas.ts`:

```ts
import { z } from "zod";

// `plan` is a free string here on purpose: the valid keys live in the Plan
// table, which an admin can add to. The action checks the key exists before
// writing — an enum would have to be edited every time a tier is added, and
// would reintroduce the very const the Plan model replaced.
export const updateMembershipSchema = z.object({
  userId: z.string().min(1),
  plan: z.string().min(1),
  status: z.enum(["ACTIVE", "TRIAL", "AT_RISK", "CANCELLED"]),
});
export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
```

- [ ] **Step 2: Write the failing tests**

Replace the mock factory at the top of `src/features/memberships/actions.test.ts` — it currently only mocks `user.update`:

```ts
vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
    plan: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
```

Then append:

```ts
describe("updateMembership", () => {
  const validInput = { userId: "u2", plan: "FIGHTER", status: "ACTIVE" } as const;

  beforeEach(() => {
    (db.plan.findUnique as unknown as Mock).mockResolvedValue({ id: "pl1", key: "FIGHTER" });
    (db.membership.findFirst as unknown as Mock).mockResolvedValue({
      id: "m1",
      userId: "u2",
      plan: "CONTENDER",
      status: "TRIAL",
    });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(updateMembership(validInput)).rejects.toThrow("Forbidden");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(updateMembership(validInput)).rejects.toThrow("Forbidden");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects a status outside the allowed set before touching the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(
      updateMembership({ ...validInput, status: "PLATINUM" as never })
    ).rejects.toThrow();
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects a plan key that no Plan row matches", async () => {
    // A server action is a public endpoint. The select only ever offers real
    // plans, but a direct call with a made-up key would orphan the membership
    // from the price list, and every plan-joined query would show "—".
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.plan.findUnique as unknown as Mock).mockResolvedValue(null);

    await expect(updateMembership({ ...validInput, plan: "GHOST" })).rejects.toThrow("Not found");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("rejects a member who has no membership row", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.membership.findFirst as unknown as Mock).mockResolvedValue(null);

    await expect(updateMembership(validInput)).rejects.toThrow("Not found");
    expect(db.membership.update).not.toHaveBeenCalled();
  });

  it("edits the newest membership when a member has more than one", async () => {
    // getAllMembers displays the newest membership; editing an older row
    // would change nothing the admin can see. The orderBy is the assertion
    // that bites — dropping it would still return a row and still pass a
    // test that only checked the update call.
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await updateMembership(validInput);

    expect(db.membership.findFirst).toHaveBeenCalledWith({
      where: { userId: "u2" },
      orderBy: { createdAt: "desc" },
    });
    expect(db.membership.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { plan: "FIGHTER", status: "ACTIVE" },
    });
  });

  it("returns ok for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updateMembership(validInput)).resolves.toEqual({ ok: true });
  });
});
```

Add `updateMembership` to the import from `./actions` at the top of the file.

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/features/memberships/actions.test.ts --reporter=verbose`

Expected: FAIL — `updateMembership is not a function`. Import-level, not assertion-level.

- [ ] **Step 4: Implement the action**

Append to `src/features/memberships/actions.ts`, and add the import:

```ts
import { updateMembershipSchema, type UpdateMembershipInput } from "./schemas";
```

```ts
export async function updateMembership(rawInput: UpdateMembershipInput) {
  const input = updateMembershipSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // The key is a plain string in the schema, so its validity is checked here
  // against the source of truth rather than against a hardcoded list.
  const plan = await db.plan.findUnique({ where: { key: input.plan } });
  if (!plan) throw new Error("Not found: no such plan");

  // A user can hold more than one membership row. The newest is the live one
  // — the same rule getAllMembers and getMemberDetail use to decide which one
  // to display, so editing any other row would be invisible to the admin.
  const membership = await db.membership.findFirst({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
  });
  if (!membership) throw new Error("Not found: member has no membership");

  await db.membership.update({
    where: { id: membership.id },
    data: { plan: input.plan, status: input.status },
  });

  revalidatePath("/dashboard/admin/members");
  revalidatePath(`/dashboard/admin/members/${input.userId}`);
  return { ok: true as const };
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npx vitest run src/features/memberships/actions.test.ts --reporter=verbose`

Expected: PASS, 7 new tests plus the 4 existing `updateUserRole` tests.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/memberships
git commit -m "feat: let admins change a member's plan and status"
```

---

## Task 7: Membership edit form on the detail page

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/members/[id]/MembershipForm.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/members/[id]/page.tsx`
- Modify: `src/features/memberships/queries.ts` (`getMemberDetail` also returns the plan options)

**Interfaces:**
- Consumes: `updateMembership` from Task 6, `getMemberDetail` from Task 3
- Produces: nothing later tasks use

The form needs the list of selectable plans. Rather than a second query in the page, `getMemberDetail` returns it — it is already the one query that page makes.

- [ ] **Step 1: Write the failing test for the plan options**

Append to the `getMemberDetail` describe block in `src/features/memberships/queries.test.ts`.

First add `plan: { findMany: vi.fn() }` to the db mock factory, and give it a default in that describe block's `beforeEach` — **this is load-bearing**. Step 3 turns `getMemberDetail` into a `Promise.all` that maps over the result, so a bare `vi.fn()` returning `undefined` would make every Task 3 test fail with "Cannot read properties of undefined (reading 'map')":

```ts
  beforeEach(() => {
    (db.plan.findMany as unknown as Mock).mockResolvedValue([]);
  });
```

Then the new test:

```ts
it("returns the selectable plan keys in sort order", async () => {
  (db.user.findUnique as unknown as Mock).mockResolvedValue(memberRow);
  (db.plan.findMany as unknown as Mock).mockResolvedValue([
    { key: "CONTENDER", name: "Contender", sortOrder: 1 },
    { key: "FIGHTER", name: "Fighter", sortOrder: 2 },
  ]);

  const detail = await getMemberDetail("u1");

  expect(detail?.planOptions).toEqual([
    { key: "CONTENDER", name: "Contender" },
    { key: "FIGHTER", name: "Fighter" },
  ]);
  const arg = (db.plan.findMany as unknown as Mock).mock.calls[0][0];
  expect(arg.orderBy).toEqual({ sortOrder: "asc" });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/memberships/queries.test.ts --reporter=verbose`

Expected: FAIL — `expected undefined to deeply equal [...]`, because `planOptions` is not returned yet.

- [ ] **Step 3: Return the options**

In `getMemberDetail`, replace the single `db.user.findUnique` await with a parallel pair, and add the field to the returned object:

```ts
  const [user, plans] = await Promise.all([
    db.user.findUnique({
      // ...unchanged...
    }),
    db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!user || user.role !== "MEMBER") return null;
```

and inside the returned object, after `attendance`:

```ts
    // The edit form's select options. Returned here rather than fetched
    // separately by the page: this is already the one query that route makes.
    planOptions: plans.map((p) => ({ key: p.key, name: p.name })),
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/features/memberships/queries.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 5: Write the form**

`src/app/(dashboard)/dashboard/admin/members/[id]/MembershipForm.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMembership } from "@/features/memberships/actions";

const STATUSES = ["ACTIVE", "TRIAL", "AT_RISK", "CANCELLED"] as const;

export function MembershipForm({
  userId,
  plan,
  status,
  planOptions,
}: {
  userId: string;
  plan: string;
  status: string;
  planOptions: { key: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nextPlan, setNextPlan] = useState(plan);
  const [nextStatus, setNextStatus] = useState(status);
  const router = useRouter();

  // A member with no membership row has plan "—", which is not a real key.
  // Submitting it would fail the action's plan check, so the form says why
  // instead of offering a control that cannot succeed.
  const hasMembership = planOptions.some((p) => p.key === plan);

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]">
      <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
        Edit membership
      </div>

      {!hasMembership ? (
        <p className="text-[var(--mut)] text-sm">
          This member has no membership to edit.
        </p>
      ) : (
        <>
          <select
            aria-label="Plan"
            value={nextPlan}
            onChange={(e) => setNextPlan(e.target.value)}
            className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
          >
            {planOptions.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Status"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {error && (
            <p role="alert" className="text-[var(--red)] text-sm">
              {error}
            </p>
          )}

          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await updateMembership({
                    userId,
                    plan: nextPlan,
                    status: nextStatus as (typeof STATUSES)[number],
                  });
                  router.refresh();
                } catch {
                  // Next redacts server action error messages in production,
                  // so surfacing err.message would read well in dev and be
                  // useless where it matters. A fixed hint instead.
                  setError("Couldn't save that change. Reload the page and try again.");
                }
              })
            }
            className="bg-[var(--red)] text-white p-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Render it on the detail page**

In `src/app/(dashboard)/dashboard/admin/members/[id]/page.tsx`, add the import:

```tsx
import { MembershipForm } from "./MembershipForm";
```

and place it immediately after the "Member" card block:

```tsx
        <MembershipForm
          userId={detail.id}
          plan={detail.plan}
          status={detail.status}
          planOptions={detail.planOptions}
        />
```

- [ ] **Step 7: Verify live**

`npx next dev -p 3200`, log in as the admin, open a member's detail route.

Confirm: the plan select lists all three seeded tiers with their display names; changing plan or status and saving updates the stat cards after the refresh; the change survives a hard reload; the members list shows the new plan and status.

- [ ] **Step 8: Read it at three widths**

At 320px the form is full-width, both selects and the button are ≥44px tall, and nothing overflows. At 1280px the form is capped at 420px.

- [ ] **Step 9: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/memberships "src/app/(dashboard)/dashboard/admin/members"
git commit -m "feat: edit a member's plan and status from the detail page"
```

---

## Task 8: `advanceOrderStatus` action

**Files:**
- Modify: `src/features/shop/schemas.ts`
- Modify: `src/features/shop/actions.ts`
- Modify: `src/features/shop/actions.test.ts`

**Interfaces:**
- Consumes: `notify` from Task 2 (never rejects)
- Produces: `advanceOrderStatus({ orderId }): Promise<{ ok: true; status: "SHIPPED" | "DELIVERED" }>`. Task 9's button calls it.

See **Ruling 7** for the transaction. If Task 2 was skipped, wrap the `notify` call here in its own try/catch.

- [ ] **Step 1: Add the schema**

Append to `src/features/shop/schemas.ts`:

```ts
export const advanceOrderStatusSchema = z.object({ orderId: z.string().min(1) });
export type AdvanceOrderStatusInput = z.infer<typeof advanceOrderStatusSchema>;
```

- [ ] **Step 2: Write the failing tests**

Replace the db mock factory at the top of `src/features/shop/actions.test.ts`:

```ts
vi.mock("@/lib/db", () => {
  const tx = { order: { findUnique: vi.fn(), update: vi.fn() } };
  return {
    db: {
      product: { create: vi.fn() },
      // Runs the callback inline — there is no real transaction here. The same
      // tx object every time, so assertions can reach it.
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
vi.mock("@/features/notifications/notify", () => ({ notify: vi.fn() }));
```

and add near the other consts:

```ts
const tx = (db as unknown as { __tx: { order: { findUnique: Mock; update: Mock } } }).__tx;
const mockedNotify = notify as unknown as Mock;
```

with `import { notify } from "@/features/notifications/notify";` and `advanceOrderStatus` added to the `./actions` import.

Then append:

```ts
describe("advanceOrderStatus", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(advanceOrderStatus({ orderId: "o1" })).rejects.toThrow("Forbidden");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(advanceOrderStatus({ orderId: "o1" })).rejects.toThrow("Forbidden");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("moves PACKING to SHIPPED", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "PACKING" });

    await expect(advanceOrderStatus({ orderId: "o1" })).resolves.toEqual({
      ok: true,
      status: "SHIPPED",
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { status: "SHIPPED" },
    });
  });

  it("moves SHIPPED to DELIVERED", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "SHIPPED" });

    await expect(advanceOrderStatus({ orderId: "o1" })).resolves.toEqual({
      ok: true,
      status: "DELIVERED",
    });
  });

  it("refuses to advance a DELIVERED order, because it is terminal", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "DELIVERED" });

    await expect(advanceOrderStatus({ orderId: "o1" })).rejects.toThrow("Conflict");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown order", async () => {
    tx.order.findUnique.mockResolvedValue(null);

    await expect(advanceOrderStatus({ orderId: "nope" })).rejects.toThrow("Not found");
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it("notifies the customer, not the admin who clicked", async () => {
    // The session user is u1 and the order belongs to c1. Passing the session
    // id here would email the wrong person, and a test that only checked
    // "notify was called" would not catch it.
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "PACKING" });

    await advanceOrderStatus({ orderId: "o1" });

    expect(mockedNotify).toHaveBeenCalledTimes(1);
    expect(mockedNotify).toHaveBeenCalledWith("c1", expect.any(String), expect.stringContaining("shipped"));
  });

  it("reads and writes the status inside one transaction", async () => {
    // Read-then-write on status is check-then-act: two admins clicking at
    // once could take a PACKING order to DELIVERED in one round trip.
    // Deleting db.$transaction would leave every other test in this block
    // green, so this is the assertion that pins it.
    tx.order.findUnique.mockResolvedValue({ id: "o1", userId: "c1", status: "PACKING" });

    await advanceOrderStatus({ orderId: "o1" });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/features/shop/actions.test.ts --reporter=verbose`

Expected: FAIL — `advanceOrderStatus is not a function`.

- [ ] **Step 4: Implement the action**

Append to `src/features/shop/actions.ts`, adding the imports:

```ts
import { advanceOrderStatusSchema, type AdvanceOrderStatusInput } from "./schemas";
import { notify } from "@/features/notifications/notify";
```

```ts
// Forward only, and DELIVERED is terminal — an order with no entry here
// cannot advance. Expressed as a map rather than an if-chain so adding a
// stage is one line and the terminal case stays "no entry".
const NEXT_ORDER_STATUS: Record<string, string | undefined> = {
  PACKING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export async function advanceOrderStatus(rawInput: AdvanceOrderStatusInput) {
  const input = advanceOrderStatusSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // Reading the current status and writing the next one happen in one
  // transaction: two admins advancing the same order at once must not skip a
  // stage. Same SQLite caveat as bookClass — Prisma's interactive
  // transactions are deferred here, so the loser more likely gets
  // SQLITE_BUSY than a stale read.
  const advanced = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new Error("Not found: no such order");

    const next = NEXT_ORDER_STATUS[order.status];
    if (!next) throw new Error(`Conflict: a ${order.status} order cannot be advanced`);

    await tx.order.update({ where: { id: order.id }, data: { status: next } });
    return { customerId: order.userId, next };
  });

  // The customer, not the admin who clicked. notify never rejects, so the
  // committed status change cannot be undone by a delivery failure.
  await notify(
    advanced.customerId,
    "Order update",
    `Your order has been marked ${advanced.next.toLowerCase()}.`
  );

  revalidatePath("/dashboard/admin/orders");
  return { ok: true as const, status: advanced.next as "SHIPPED" | "DELIVERED" };
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npx vitest run src/features/shop/actions.test.ts --reporter=verbose`

Expected: PASS, 8 new tests plus the 4 existing `addProduct` tests.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/shop
git commit -m "feat: advance an order's status and notify the customer"
```

---

## Task 9: Advance button on the orders page

**Files:**
- Modify: `src/features/shop/queries.ts` (`getAllOrders` exposes whether the order can advance)
- Create: `src/app/(dashboard)/dashboard/admin/orders/AdvanceOrderButton.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/orders/page.tsx`

**Interfaces:**
- Consumes: `advanceOrderStatus` from Task 8
- Produces: nothing later tasks use

- [ ] **Step 1: Expose the advanceable flag from the query**

In `src/features/shop/queries.ts`, add one field to the object `getAllOrders` returns:

```ts
    // The UI's "can this advance?" must agree with the action's own rule, so
    // both read the same terminal state rather than each listing statuses.
    canAdvance: o.status !== "DELIVERED",
```

- [ ] **Step 2: Write the button**

`src/app/(dashboard)/dashboard/admin/orders/AdvanceOrderButton.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceOrderStatus } from "@/features/shop/actions";

export function AdvanceOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await advanceOrderStatus({ orderId });
              router.refresh();
            } catch {
              setError("Couldn't advance that order.");
            }
          })
        }
        className="border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]"
      >
        {isPending ? "Working…" : "Advance"}
      </button>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add the column**

In `src/app/(dashboard)/dashboard/admin/orders/page.tsx`, import the button and append a column after Status:

```tsx
              {
                header: "",
                render: (r) =>
                  r.canAdvance ? (
                    <AdvanceOrderButton orderId={r.id} />
                  ) : (
                    <span className="text-[var(--dim)] text-xs">Complete</span>
                  ),
              },
```

- [ ] **Step 4: Verify live**

`npx next dev -p 3200`, admin, `/dashboard/admin/orders`.

Confirm: a PACKING order advances to SHIPPED and then to DELIVERED; once DELIVERED the cell reads "Complete" and offers no button; the member's notification bell shows the update when logged in as that customer.

- [ ] **Step 5: Read it at three widths**

The orders table is inside `DataTable`, which supplies `overflow-x-auto` and `min-w-[640px]` — at 320px the table scrolls horizontally inside its own container and the page itself does not. Confirm that distinction specifically. The button is ≥44px.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/shop "src/app/(dashboard)/dashboard/admin/orders"
git commit -m "feat: advance an order's status from the orders table"
```

---

## Task 10: `updateProduct` and `deleteProduct`

**Files:**
- Modify: `src/features/shop/schemas.ts`
- Modify: `src/features/shop/actions.ts`
- Modify: `src/features/shop/actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `updateProduct({ productId, name, price, stock, category })`, `deleteProduct({ productId })`. Task 11's UI calls both.

**Why delete checks first:** `OrderItem.product` has no cascade, so deleting a product that appears in an order fails at the database level with an opaque foreign-key error. Checking first turns that into a reason the admin can act on. An `archived` flag would be the fuller answer but costs a schema field plus a filter in every product query — the spec judged it not yet justified.

- [ ] **Step 1: Add the schemas**

Append to `src/features/shop/schemas.ts`:

```ts
// Restocking is just a stock edit — there is no separate restock action.
export const updateProductSchema = addProductSchema.extend({
  productId: z.string().min(1),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const deleteProductSchema = z.object({ productId: z.string().min(1) });
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
```

- [ ] **Step 2: Write the failing tests**

Extend the db mock factory in `src/features/shop/actions.test.ts` — `product` gains `update` and `delete`, and `orderItem` is new:

```ts
      product: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      orderItem: { findFirst: vi.fn() },
```

Then append:

```ts
describe("updateProduct", () => {
  const validInput = {
    productId: "p1",
    name: "Gloves",
    price: 12000,
    stock: 10,
    category: "Gear",
  };

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(updateProduct(validInput)).rejects.toThrow("Forbidden");
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("rejects a negative price before touching the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updateProduct({ ...validInput, price: -1 })).rejects.toThrow();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it("allows zero stock, which is how a sold-out product is recorded", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updateProduct({ ...validInput, stock: 0 })).resolves.toEqual({ ok: true });
  });

  it("writes the edited fields but never the id", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await updateProduct(validInput);

    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { name: "Gloves", price: 12000, stock: 10, category: "Gear" },
    });
  });
});

describe("deleteProduct", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.orderItem.findFirst as unknown as Mock).mockResolvedValue(null);
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(deleteProduct({ productId: "p1" })).rejects.toThrow("Forbidden");
    expect(db.product.delete).not.toHaveBeenCalled();
  });

  it("refuses to delete a product that appears in an order", async () => {
    // OrderItem.product has no cascade, so this delete would fail at the
    // database anyway — but with a foreign-key error nobody can act on.
    (db.orderItem.findFirst as unknown as Mock).mockResolvedValue({ id: "oi1", productId: "p1" });

    await expect(deleteProduct({ productId: "p1" })).rejects.toThrow("Conflict");
    expect(db.product.delete).not.toHaveBeenCalled();
  });

  it("checks order history before deleting, not after", async () => {
    // Deleting first and catching the failure would leave the row gone on any
    // database that does cascade. Asserting the lookup happened with the
    // right productId is what pins the order of operations.
    await deleteProduct({ productId: "p1" });

    expect(db.orderItem.findFirst).toHaveBeenCalledWith({ where: { productId: "p1" } });
    expect(db.product.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("deletes a product with no order history", async () => {
    await expect(deleteProduct({ productId: "p1" })).resolves.toEqual({ ok: true });
  });
});
```

Add `updateProduct` and `deleteProduct` to the `./actions` import.

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/features/shop/actions.test.ts --reporter=verbose`

Expected: FAIL — `updateProduct is not a function`.

- [ ] **Step 4: Implement both**

Append to `src/features/shop/actions.ts`, extending the schema import:

```ts
export async function updateProduct(rawInput: UpdateProductInput) {
  const input = updateProductSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  const { productId, ...fields } = input;
  await db.product.update({ where: { id: productId }, data: fields });

  revalidatePath("/dashboard/admin/shop");
  return { ok: true as const };
}

export async function deleteProduct(rawInput: DeleteProductInput) {
  const input = deleteProductSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // OrderItem.product has no onDelete cascade, so a product with order
  // history cannot be removed. Checking first turns an opaque foreign-key
  // error into a reason the admin can act on.
  const used = await db.orderItem.findFirst({ where: { productId: input.productId } });
  if (used) throw new Error("Conflict: this product appears in an order and cannot be deleted");

  await db.product.delete({ where: { id: input.productId } });

  revalidatePath("/dashboard/admin/shop");
  return { ok: true as const };
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npx vitest run src/features/shop/actions.test.ts --reporter=verbose`

Expected: PASS, 9 new tests.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/shop
git commit -m "feat: edit and delete shop products"
```

---

## Task 11: Product edit and delete UI

**Files:**
- Modify: `src/features/shop/queries.ts` (`getAllProducts` returns raw values for the form)
- Create: `src/app/(dashboard)/dashboard/admin/shop/ProductRowActions.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/shop/page.tsx`

**Interfaces:**
- Consumes: `updateProduct`, `deleteProduct` from Task 10
- Produces: nothing later tasks use

The edit form needs the raw integer price and stock; the table shows the formatted price. `getAllProducts` returns both.

- [ ] **Step 1: Return the raw values**

In `src/features/shop/queries.ts`, add two fields to `getAllProducts`'s mapped object:

```ts
    // Raw values alongside the formatted ones: the table shows `price`, the
    // edit form needs the integer it was derived from.
    priceCents: p.price,
    stockCount: p.stock,
```

- [ ] **Step 2: Write the row actions component**

`src/app/(dashboard)/dashboard/admin/shop/ProductRowActions.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, deleteProduct } from "@/features/shop/actions";

export function ProductRowActions({
  productId,
  name,
  priceCents,
  stockCount,
  category,
}: {
  productId: string;
  name: string;
  priceCents: number;
  stockCount: number;
  category: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name, priceCents, stockCount, category });
  const router = useRouter();

  const field =
    "border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] w-full";
  const button =
    "border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  if (editing) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-[420px]">
        <input
          aria-label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={field}
        />
        <input
          aria-label="Price in cents"
          type="number"
          value={form.priceCents}
          onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
          className={field}
        />
        <input
          aria-label="Stock"
          type="number"
          value={form.stockCount}
          onChange={(e) => setForm({ ...form, stockCount: Number(e.target.value) })}
          className={field}
        />
        <input
          aria-label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className={field}
        />
        {error && (
          <p role="alert" className="text-[var(--red)] text-xs">
            {error}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await updateProduct({
                    productId,
                    name: form.name,
                    price: form.priceCents,
                    stock: form.stockCount,
                    category: form.category,
                  });
                  setEditing(false);
                  router.refresh();
                } catch {
                  setError("Couldn't save. Check the price and stock are whole numbers.");
                }
              })
            }
            className={button}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className={button}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => setEditing(true)} className={button}>
          Edit
        </button>
        {confirming ? (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await deleteProduct({ productId });
                  router.refresh();
                } catch {
                  // The action's own reason is redacted in production, so the
                  // copy names the one case that actually blocks a delete.
                  setError("Couldn't delete. Products with order history can't be removed.");
                  setConfirming(false);
                }
              })
            }
            className={`${button} text-[var(--red)]`}
          >
            {isPending ? "Deleting…" : "Confirm"}
          </button>
        ) : (
          <button onClick={() => setConfirming(true)} className={button}>
            Delete
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add the column**

In `src/app/(dashboard)/dashboard/admin/shop/page.tsx`, import `ProductRowActions` and append a column:

```tsx
              {
                header: "",
                render: (r) => (
                  <ProductRowActions
                    productId={r.id}
                    name={r.name}
                    priceCents={r.priceCents}
                    stockCount={r.stockCount}
                    category={r.category}
                  />
                ),
              },
```

- [ ] **Step 4: Verify live**

`npx next dev -p 3200`, admin, `/dashboard/admin/shop`.

Confirm: Edit reveals four populated fields; saving a new price updates the formatted price in the table; Delete asks for confirmation before acting; deleting a product that appears in a seeded order shows the refusal copy and leaves the row; deleting a freshly added product succeeds.

- [ ] **Step 5: Read it at three widths**

At 320px the edit fields are full-width and the Save/Cancel and Edit/Delete pairs stack vertically so buttons never crowd; every target is ≥44px. No horizontal page scroll.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/shop "src/app/(dashboard)/dashboard/admin/shop"
git commit -m "feat: edit and delete products from the shop table"
```

---

## Task 12: `createPost`, `unpublishPost`, `deletePost`

**Files:**
- Modify: `src/features/content/schemas.ts`
- Modify: `src/features/content/actions.ts`
- Modify: `src/features/content/actions.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `createPost({ title, tag })`, `unpublishPost({ postId })`, `deletePost({ postId })`. Task 13's UI calls all three.

**No body field:** posts carry title and tag only. `Post` has no body column and no `/blog/[slug]` route exists — the spec puts both explicitly out of scope, so creating posts stays title + tag, matching what `LatestPosts` renders on the homepage today.

**On the spec's "never appear in `getPublicPosts`" test:** that guarantee is covered as a chain rather than a single test — the tests below pin that `createPost` writes `status: "DRAFT"` and `unpublishPost` writes it back, and the existing `src/features/marketing/queries.test.ts` test `"asks the database for published posts only"` pins that `getPublicPosts` filters on `PUBLISHED`. Both halves already bite. Duplicating them into one integration-style test would need a live database, which this suite does not have. Noted here so a reviewer reads it as a deliberate decomposition rather than a missing test.

- [ ] **Step 1: Add the schemas**

Append to `src/features/content/schemas.ts`:

```ts
export const createPostSchema = z.object({
  title: z.string().min(2),
  tag: z.string().min(2),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const unpublishPostSchema = z.object({ postId: z.string().min(1) });
export type UnpublishPostInput = z.infer<typeof unpublishPostSchema>;

export const deletePostSchema = z.object({ postId: z.string().min(1) });
export type DeletePostInput = z.infer<typeof deletePostSchema>;
```

- [ ] **Step 2: Write the failing tests**

Replace the db mock factory at the top of `src/features/content/actions.test.ts`:

```ts
vi.mock("@/lib/db", () => ({
  db: {
    post: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));
```

Then append:

```ts
describe("createPost", () => {
  const validInput = { title: "Inside an 8-week fight camp", tag: "Fight camp" };

  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(createPost(validInput)).rejects.toThrow("Forbidden");
    expect(db.post.create).not.toHaveBeenCalled();
  });

  it("rejects a one-character title before touching the database", async () => {
    await expect(createPost({ ...validInput, title: "x" })).rejects.toThrow();
    expect(db.post.create).not.toHaveBeenCalled();
  });

  it("creates the post as a DRAFT, never published straight to the homepage", async () => {
    // getPublicPosts filters on status PUBLISHED, so a default of PUBLISHED
    // here would put an unreviewed post on the public site the moment it was
    // typed. Asserting the exact data object is what pins the default.
    await createPost(validInput);

    expect(db.post.create).toHaveBeenCalledWith({
      data: {
        title: "Inside an 8-week fight camp",
        tag: "Fight camp",
        status: "DRAFT",
        authorId: "admin1",
      },
    });
  });

  it("attributes the post to the caller, not to a fixed id", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin2", role: "ADMIN" } });

    await createPost(validInput);

    expect(db.post.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: "admin2" }) })
    );
  });
});

describe("unpublishPost", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(unpublishPost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(db.post.update).not.toHaveBeenCalled();
  });

  it("moves the post back to DRAFT, which removes it from the public site", async () => {
    await unpublishPost({ postId: "p1" });

    expect(db.post.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "DRAFT" },
    });
  });
});

describe("deletePost", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(deletePost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(db.post.delete).not.toHaveBeenCalled();
  });

  it("deletes the post for admins", async () => {
    await expect(deletePost({ postId: "p1" })).resolves.toEqual({ ok: true });
    expect(db.post.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
```

Add the three new names to the `./actions` import.

- [ ] **Step 3: Run them and watch them fail**

Run: `npx vitest run src/features/content/actions.test.ts --reporter=verbose`

Expected: FAIL — `createPost is not a function`.

- [ ] **Step 4: Implement all three**

Append to `src/features/content/actions.ts`, extending the schema import:

```ts
export async function createPost(rawInput: CreatePostInput) {
  const input = createPostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // DRAFT, always. getPublicPosts filters on PUBLISHED, so publishing is a
  // second, deliberate step — a post is never on the homepage the moment it
  // is typed. Title and tag only: Post has no body column and no blog route
  // exists to render one.
  await db.post.create({
    data: { title: input.title, tag: input.tag, status: "DRAFT", authorId: session.user.id },
  });

  revalidatePath("/dashboard/admin/content");
  return { ok: true as const };
}

export async function unpublishPost(rawInput: UnpublishPostInput) {
  const input = unpublishPostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.post.update({ where: { id: input.postId }, data: { status: "DRAFT" } });

  revalidatePath("/dashboard/admin/content");
  // The homepage's LatestPosts reads getPublicPosts, so an unpublish that did
  // not revalidate here would leave the post visible to the public until the
  // next deploy.
  revalidatePath("/");
  return { ok: true as const };
}

export async function deletePost(rawInput: DeletePostInput) {
  const input = deletePostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.post.delete({ where: { id: input.postId } });

  revalidatePath("/dashboard/admin/content");
  revalidatePath("/");
  return { ok: true as const };
}
```

Also add `revalidatePath("/")` to the existing `publishPost` for the same reason.

- [ ] **Step 5: Run them and watch them pass**

Run: `npx vitest run src/features/content/actions.test.ts --reporter=verbose`

Expected: PASS, 8 new tests.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/features/content
git commit -m "feat: create, unpublish and delete posts"
```

---

## Task 13: Content page UI

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/content/CreatePostForm.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/content/PostRowActions.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/content/page.tsx`

**Interfaces:**
- Consumes: `createPost`, `unpublishPost`, `deletePost` from Task 12; the existing `PublishButton`
- Produces: nothing later tasks use

- [ ] **Step 1: Write the create form**

Follows `AddProductForm` exactly — collapsed to a button until opened, `react-hook-form` with `zodResolver`.

`src/app/(dashboard)/dashboard/admin/content/CreatePostForm.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createPostSchema, type CreatePostInput } from "@/features/content/schemas";
import { createPost } from "@/features/content/actions";

export function CreatePostForm() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePostInput>({ resolver: zodResolver(createPostSchema) });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[var(--red)] text-white px-5 py-3 min-h-[44px] font-bold uppercase tracking-widest text-xs w-fit"
      >
        New post
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) =>
        startTransition(async () => {
          setServerError(null);
          try {
            await createPost(data);
            reset();
            setOpen(false);
            router.refresh();
          } catch {
            setServerError("Couldn't create that post. Check the fields and try again.");
          }
        })
      )}
      className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]"
    >
      <input
        {...register("title")}
        placeholder="Post title"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.title && <p className="text-[var(--red)] text-sm">{errors.title.message}</p>}
      <input
        {...register("tag")}
        placeholder="Tag"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.tag && <p className="text-[var(--red)] text-sm">{errors.tag.message}</p>}
      <p className="text-[var(--dim)] text-xs">
        New posts start as drafts. Publish them when they are ready.
      </p>
      {serverError && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {serverError}
        </p>
      )}
      <button
        disabled={isPending}
        className="bg-[var(--red)] text-white p-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
      >
        {isPending ? "Creating…" : "Create draft"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the row actions**

`src/app/(dashboard)/dashboard/admin/content/PostRowActions.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unpublishPost, deletePost } from "@/features/content/actions";

export function PostRowActions({ postId, status }: { postId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const button =
    "border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <div className="flex flex-col sm:flex-row gap-2">
        {status === "PUBLISHED" && (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await unpublishPost({ postId });
                  router.refresh();
                } catch {
                  setError("Couldn't unpublish.");
                }
              })
            }
            className={button}
          >
            {isPending ? "Working…" : "Unpublish"}
          </button>
        )}
        {confirming ? (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await deletePost({ postId });
                  router.refresh();
                } catch {
                  setError("Couldn't delete.");
                  setConfirming(false);
                }
              })
            }
            className={`${button} text-[var(--red)]`}
          >
            {isPending ? "Deleting…" : "Confirm"}
          </button>
        ) : (
          <button onClick={() => setConfirming(true)} className={button}>
            Delete
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire the page**

In `src/app/(dashboard)/dashboard/admin/content/page.tsx`: import both new components, render `<CreatePostForm />` as the first child of the padded wrapper (above the empty-state check, so it is reachable when there are no posts yet), and change the row so it stacks on phones and carries the actions:

```tsx
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border-b border-[var(--line)] last:border-0"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-[var(--dim)] text-xs">
                    {p.tag} · {p.views} views
                  </div>
                </div>
                <StatusBadge label={p.status} color={p.statusColor} />
                {p.status === "DRAFT" && <PublishButton postId={p.id} />}
                <PostRowActions postId={p.id} status={p.status} />
              </div>
```

- [ ] **Step 4: Verify live**

`npx next dev -p 3200`, admin, `/dashboard/admin/content`.

Confirm: "New post" reveals the form; creating one adds a DRAFT row; the new post does **not** appear on the public homepage (`/`); publishing it makes it appear there; unpublishing removes it again; delete asks for confirmation first.

- [ ] **Step 5: Read it at three widths**

At 320px the row stacks so the title, badge and buttons never crowd; every button is ≥44px; the form is full-width. No horizontal page scroll.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add "src/app/(dashboard)/dashboard/admin/content"
git commit -m "feat: create, unpublish and delete posts from the content page"
```

---

## Task 14: Gallery upload and delete actions

**Files:**
- Modify: `src/lib/uploads.ts`
- Modify: `src/features/content/schemas.ts`
- Modify: `src/features/content/actions.ts`
- Modify: `src/features/content/actions.test.ts`

**Interfaces:**
- Consumes: `uploadImage(file: Buffer, filename: string): Promise<{ url: string }>`
- Produces: `uploadGalleryImage(formData: FormData)`, `deleteGalleryImage({ imageId })`. Task 15's UI calls both.

See **Ruling 2** for why the stub changes. This is the first real caller of the uploads adapter.

- [ ] **Step 1: Fix the stub so uploaded images actually render**

Replace `src/lib/uploads.ts`:

```ts
import { v2 as cloudinary } from "cloudinary";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Real Cloudinary upload when CLOUDINARY_URL is set, otherwise a local write.
 * The SDK reads CLOUDINARY_URL from the environment on its own.
 *
 * The stub used to return a https://stub-cdn.local/... url. next/image refuses
 * any host not listed in next.config.ts remotePatterns, so every uploaded
 * image was broken on the gallery page that had just accepted it — in the
 * default configuration, since CLOUDINARY_URL is normally unset. Writing into
 * public/uploads and returning a relative path needs no remotePatterns entry
 * and actually renders.
 *
 * Writing to public/ at runtime does not work on a serverless host. That is
 * fine: this branch is the local stub, and a deployment sets CLOUDINARY_URL.
 */
export async function uploadImage(file: Buffer, filename: string) {
  if (!process.env.CLOUDINARY_URL) {
    // path.basename drops any directory part the client put in the filename,
    // so "../../.env" cannot escape public/uploads, and the character filter
    // removes everything else that could confuse a path. The uuid prefix
    // keeps two uploads of "photo.jpg" from overwriting each other.
    const safeName = `${randomUUID()}-${path.basename(filename).replace(/[^\w.\-]/g, "_")}`;
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_UPLOAD_DIR, safeName), file);
    console.log("[stub:uploads] uploadImage ->", safeName);
    return { url: `/uploads/${safeName}` };
  }

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "umair-fitness-club" }, (err, res) => {
      if (err || !res) reject(err ?? new Error("Cloudinary returned no result"));
      else resolve(res as { secure_url: string });
    });
    stream.end(file);
  });
  return { url: result.secure_url };
}
```

- [ ] **Step 2: Add the schemas**

Append to `src/features/content/schemas.ts`:

```ts
export const galleryCaptionSchema = z.object({ caption: z.string().min(2) });

export const deleteGalleryImageSchema = z.object({ imageId: z.string().min(1) });
export type DeleteGalleryImageInput = z.infer<typeof deleteGalleryImageSchema>;

/** 5 MB. Large enough for a phone photo, small enough not to stall the action. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
```

- [ ] **Step 3: Write the failing tests**

Extend the db mock factory in `src/features/content/actions.test.ts` with `galleryImage: { create: vi.fn(), delete: vi.fn() }`, and add:

```ts
vi.mock("@/lib/uploads", () => ({ uploadImage: vi.fn() }));
```

with `import { uploadImage } from "@/lib/uploads";` and `const mockedUpload = uploadImage as unknown as Mock;`.

Then append:

```ts
describe("uploadGalleryImage", () => {
  function formDataWith(file: File | null, caption: string) {
    const fd = new FormData();
    if (file) fd.set("file", file);
    fd.set("caption", caption);
    return fd;
  }

  const pngFile = () => new File([new Uint8Array([1, 2, 3])], "floor.png", { type: "image/png" });

  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockedUpload.mockResolvedValue({ url: "/uploads/abc-floor.png" });
  });

  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(uploadGalleryImage(formDataWith(pngFile(), "Floor session"))).rejects.toThrow(
      "Forbidden"
    );
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a submission with no file", async () => {
    await expect(uploadGalleryImage(formDataWith(null, "Floor session"))).rejects.toThrow();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a non-image file", async () => {
    // The gallery renders every row through next/image. A PDF would upload
    // fine and then break the page it appears on.
    const pdf = new File([new Uint8Array([1])], "notes.pdf", { type: "application/pdf" });

    await expect(uploadGalleryImage(formDataWith(pdf, "Notes"))).rejects.toThrow("image");
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit before uploading it", async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "huge.png", { type: "image/png" });

    await expect(uploadGalleryImage(formDataWith(big, "Huge"))).rejects.toThrow();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("rejects a caption that is too short, before uploading", async () => {
    await expect(uploadGalleryImage(formDataWith(pngFile(), "x"))).rejects.toThrow();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("stores the url the adapter returned, not the original filename", async () => {
    // The row must point at wherever the adapter actually put the file —
    // Cloudinary's secure_url in production, /uploads/... under the stub.
    // Writing file.name here would produce a broken image on both.
    await uploadGalleryImage(formDataWith(pngFile(), "Floor session"));

    expect(db.galleryImage.create).toHaveBeenCalledWith({
      data: { url: "/uploads/abc-floor.png", caption: "Floor session" },
    });
  });
});

describe("deleteGalleryImage", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(deleteGalleryImage({ imageId: "g1" })).rejects.toThrow("Forbidden");
    expect(db.galleryImage.delete).not.toHaveBeenCalled();
  });

  it("deletes the row for admins", async () => {
    await expect(deleteGalleryImage({ imageId: "g1" })).resolves.toEqual({ ok: true });
    expect(db.galleryImage.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });
});
```

Import `MAX_UPLOAD_BYTES` from `./schemas` and the two action names from `./actions`.

- [ ] **Step 4: Run them and watch them fail**

Run: `npx vitest run src/features/content/actions.test.ts --reporter=verbose`

Expected: FAIL — `uploadGalleryImage is not a function`.

- [ ] **Step 5: Implement both**

Append to `src/features/content/actions.ts`, adding imports for `uploadImage`, the two schemas and `MAX_UPLOAD_BYTES`:

```ts
/**
 * Takes FormData rather than a typed object: a file cannot cross the server
 * action boundary any other way. The caption goes through Zod; the file is
 * checked by hand, since Zod has no useful File schema here.
 */
export async function uploadGalleryImage(formData: FormData) {
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  const { caption } = galleryCaptionSchema.parse({ caption: formData.get("caption") });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Validation: no file uploaded");
  // The gallery renders every row through next/image, so a non-image would
  // upload cleanly and then break the page it appears on.
  if (!file.type.startsWith("image/")) throw new Error("Validation: only image files are allowed");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Validation: image is larger than 5 MB");

  // Checks first, upload second: rejecting after writing the file would leave
  // an orphan on disk (or a paid-for Cloudinary asset) with no row pointing
  // at it.
  const { url } = await uploadImage(Buffer.from(await file.arrayBuffer()), file.name);
  await db.galleryImage.create({ data: { url, caption } });

  revalidatePath("/dashboard/admin/gallery");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteGalleryImage(rawInput: DeleteGalleryImageInput) {
  const input = deleteGalleryImageSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // The row goes; the uploaded file itself is left in place. Deleting the
  // stored asset means a second adapter method and a Cloudinary destroy call,
  // which the spec did not scope.
  await db.galleryImage.delete({ where: { id: input.imageId } });

  revalidatePath("/dashboard/admin/gallery");
  revalidatePath("/");
  return { ok: true as const };
}
```

- [ ] **Step 6: Run them and watch them pass**

Run: `npx vitest run src/features/content/actions.test.ts --reporter=verbose`

Expected: PASS, 8 new tests.

- [ ] **Step 7: Check the stub in isolation**

The stub's path handling is security-relevant and has no unit test, so exercise it directly:

```bash
node --input-type=module -e "
const { uploadImage } = await import('./src/lib/uploads.ts');
console.log(await uploadImage(Buffer.from('x'), '../../escape.png'));
"
```

If `tsx` is needed for the TS import, use `npx tsx -e` with the same body.

Expected: a url of the form `/uploads/<uuid>-escape.png` — no `..` and no path separators. Confirm `public/uploads/` contains the file and nothing was written outside it, then delete the test file.

- [ ] **Step 8: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add src/lib/uploads.ts src/features/content
git commit -m "feat: upload and delete gallery images"
```

---

## Task 15: Gallery upload and delete UI

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/gallery/GalleryUploadForm.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/gallery/DeleteImageButton.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/gallery/page.tsx`

**Interfaces:**
- Consumes: `uploadGalleryImage`, `deleteGalleryImage` from Task 14
- Produces: nothing later tasks use

- [ ] **Step 1: Write the upload form**

The action takes `FormData`, so this submits the form element directly rather than a typed object.

`src/app/(dashboard)/dashboard/admin/gallery/GalleryUploadForm.tsx`:

```tsx
"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadGalleryImage } from "@/features/content/actions";

export function GalleryUploadForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          setError(null);
          try {
            await uploadGalleryImage(data);
            formRef.current?.reset();
            router.refresh();
          } catch {
            setError("Couldn't upload that image. Use an image file under 5 MB and add a caption.");
          }
        });
      }}
      className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]"
    >
      <label htmlFor="gallery-file" className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
        Image
      </label>
      <input
        id="gallery-file"
        name="file"
        type="file"
        accept="image/*"
        className="w-full border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] text-sm"
      />
      <input
        name="caption"
        placeholder="Caption"
        aria-label="Caption"
        className="w-full border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {error && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {error}
        </p>
      )}
      <button
        disabled={isPending}
        className="bg-[var(--red)] text-white p-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
      >
        {isPending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the delete button**

`src/app/(dashboard)/dashboard/admin/gallery/DeleteImageButton.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGalleryImage } from "@/features/content/actions";

export function DeleteImageButton({ imageId }: { imageId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const button =
    "w-full border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  return (
    <div className="p-2 pt-0 flex flex-col gap-1">
      {confirming ? (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await deleteGalleryImage({ imageId });
                router.refresh();
              } catch {
                setError("Couldn't delete.");
                setConfirming(false);
              }
            })
          }
          className={`${button} text-[var(--red)]`}
        >
          {isPending ? "Deleting…" : "Confirm"}
        </button>
      ) : (
        <button onClick={() => setConfirming(true)} className={button}>
          Delete
        </button>
      )}
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire the page**

Replace `src/app/(dashboard)/dashboard/admin/gallery/page.tsx` entirely:

```tsx
import Image from "next/image";
import { getGalleryImages } from "@/features/content/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { GalleryUploadForm } from "./GalleryUploadForm";
import { DeleteImageButton } from "./DeleteImageButton";

export default async function AdminGalleryPage() {
  const images = await getGalleryImages();

  return (
    <>
      <Topbar title="Gallery" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <GalleryUploadForm />
        {images.length === 0 ? (
          <EmptyState body="No gallery images yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="border border-[var(--line)]">
                {/* next/image rather than a bare <img>: next lint's
                    no-img-element rule fails the build otherwise. */}
                <Image
                  src={img.url}
                  alt={img.caption}
                  width={300}
                  height={150}
                  className="w-full h-[150px] object-cover block"
                />
                <div className="p-2 text-[var(--dim)] text-xs">{img.caption}</div>
                <DeleteImageButton imageId={img.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

The upload form renders above the empty-state branch on purpose: with no images yet, a form hidden behind `images.length > 0` would make the page impossible to get out of.

The uploaded url is now relative (`/uploads/...`), which `next/image` serves without a `remotePatterns` entry. The seeded images stay on `images.unsplash.com`, which is already listed. **No `next.config.ts` change is needed** — confirm that by uploading and looking at the result rather than assuming.

- [ ] **Step 4: Verify live**

`npx next dev -p 3200`, admin, `/dashboard/admin/gallery`.

Confirm: uploading a small PNG with a caption adds a card **whose image actually renders** (this is the whole point of Ruling 2 — a broken-image icon means the stub change did not take); the file appears in `public/uploads/`; the new image also shows on the public homepage gallery; a PDF is rejected with the error copy; delete asks for confirmation and removes the card.

- [ ] **Step 5: Read it at three widths**

At 320px the file input and caption are full-width and ≥44px, and the image grid is one column; at 1280px the grid is four across, unchanged from today. No horizontal page scroll.

- [ ] **Step 6: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add "src/app/(dashboard)/dashboard/admin/gallery"
git commit -m "feat: upload and delete gallery images from the admin page"
```

---

## Task 16: Database-backed plans and `updatePlan`

**Files:**
- Create: `src/features/plans/format.ts`
- Create: `src/features/plans/format.test.ts`
- Create: `src/features/plans/schemas.ts`
- Create: `src/features/plans/actions.ts`
- Create: `src/features/plans/actions.test.ts`
- Modify: `src/features/marketing/queries.ts` (delete `PLAN_PRICES`, `getPublicPlans` reads `Plan`)
- Modify: `src/features/marketing/queries.test.ts`
- Modify: `src/features/memberships/queries.ts` (delete `PLAN_PRICES`, `getPlanBreakdown` reads `Plan`)
- Modify: `src/features/memberships/queries.test.ts`

**Interfaces:**
- Consumes: `db.plan` from Task 1
- Produces: `formatPlanPrice(cents: number): string`, `updatePlan({ key, name, priceCents })`, and a `getPlanBreakdown` row shape of `{ id, key, name, priceCents, price, memberCount }`. Task 17 renders that shape.

See **Ruling 3** (price formatting) and **Ruling 4** (the deleted test).

- [ ] **Step 1: Write the failing formatter tests**

`src/features/plans/format.test.ts`:

```ts
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
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/plans/format.test.ts --reporter=verbose`

Expected: FAIL — `Cannot find module './format'`.

- [ ] **Step 3: Write the formatter**

`src/features/plans/format.ts`:

```ts
/**
 * The one place a plan price becomes display text.
 *
 * Whole-dollar amounts render without cents ("$89 / mo") because that is
 * exactly what the PLAN_PRICES consts produced before prices moved into the
 * database — formatting everything at two decimals would silently rewrite the
 * live pricing page to "$89.00 / mo". Prices an admin types with cents keep
 * them.
 */
export function formatPlanPrice(priceCents: number): string {
  const dollars = priceCents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)} / mo`;
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `npx vitest run src/features/plans/format.test.ts --reporter=verbose`

Expected: PASS, 4 tests.

- [ ] **Step 5: Rewrite the marketing tests (RED)**

In `src/features/marketing/queries.test.ts`:

Add `plan: { findMany: vi.fn() }` to the db mock factory.

**Delete** the test `"does not touch the database"` — see Ruling 4. It asserts precisely the behaviour this task changes.

**Replace** `"returns all three tiers with their prices, regardless of who is enrolled"` with:

```ts
  it("returns every tier from the Plan table, regardless of who is enrolled", async () => {
    // The guarantee that matters, carried over from the const era: a public
    // price list shows every tier. It now holds because the catalogue is read
    // from Plan rather than grouped from Membership — the seed has exactly
    // one membership (FIGHTER), so an enrolment-derived list would show one.
    (db.plan.findMany as unknown as Mock).mockResolvedValue([
      { key: "CONTENDER", priceCents: 8900, sortOrder: 1 },
      { key: "FIGHTER", priceCents: 14900, sortOrder: 2 },
      { key: "CHAMPION", priceCents: 24900, sortOrder: 3 },
    ]);

    const plans = await getPublicPlans();

    expect(plans).toEqual([
      { plan: "CONTENDER", price: "$89 / mo" },
      { plan: "FIGHTER", price: "$149 / mo" },
      { plan: "CHAMPION", price: "$249 / mo" },
    ]);
  });

  it("asks for the tiers in their configured display order", async () => {
    (db.plan.findMany as unknown as Mock).mockResolvedValue([]);

    await getPublicPlans();

    const arg = (db.plan.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.orderBy).toEqual({ sortOrder: "asc" });
  });

  it("reflects a price an admin has edited", async () => {
    (db.plan.findMany as unknown as Mock).mockResolvedValue([
      { key: "CONTENDER", priceCents: 9900, sortOrder: 1 },
    ]);

    await expect(getPublicPlans()).resolves.toEqual([
      { plan: "CONTENDER", price: "$99 / mo" },
    ]);
  });
```

- [ ] **Step 6: Run them and watch them fail**

Run: `npx vitest run src/features/marketing/queries.test.ts --reporter=verbose`

Expected: FAIL on the new tests — the current `getPublicPlans` returns the const values and never calls `db.plan.findMany`, so `mock.calls[0]` is undefined.

- [ ] **Step 7: Switch `getPublicPlans` to the table**

In `src/features/marketing/queries.ts`: delete the `PLAN_PRICES` const, add `import { formatPlanPrice } from "@/features/plans/format";`, and replace `getPublicPlans`:

```ts
// No memberCount here — per-plan member counts are a business metric that
// does not belong on a public marketing page. See admin-only
// getPlanBreakdown() in src/features/memberships/queries.ts for that.
//
// The catalogue comes from the Plan table, not from who currently holds a
// membership: a public price list must always show every tier, regardless of
// enrolment. That was true when this read a const and is still true now.
export async function getPublicPlans() {
  const plans = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return plans.map((p) => ({ plan: p.key, price: formatPlanPrice(p.priceCents) }));
}
```

The `{ plan, price }` shape is unchanged, and the function was already `async` with both callers already awaiting it, so no call site needs editing.

- [ ] **Step 8: Run them and watch them pass**

Run: `npx vitest run src/features/marketing/queries.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 9: Rewrite `getPlanBreakdown` (RED then GREEN)**

Add to `src/features/memberships/queries.test.ts`:

```ts
describe("getPlanBreakdown", () => {
  it("lists every plan, including tiers nobody has bought", async () => {
    // groupBy over memberships could only ever return plans someone holds, so
    // an empty tier was invisible on the admin plans screen — and invisible
    // is uneditable once Task 17 puts the editor in that table.
    (db.plan.findMany as unknown as Mock).mockResolvedValue([
      { id: "pl1", key: "CONTENDER", name: "Contender", priceCents: 8900, sortOrder: 1 },
      { id: "pl2", key: "FIGHTER", name: "Fighter", priceCents: 14900, sortOrder: 2 },
    ]);
    (db.membership.groupBy as unknown as Mock).mockResolvedValue([
      { plan: "FIGHTER", _count: { plan: 3 } },
    ]);

    const rows = await getPlanBreakdown();

    expect(rows).toEqual([
      {
        id: "pl1",
        key: "CONTENDER",
        name: "Contender",
        priceCents: 8900,
        price: "$89 / mo",
        memberCount: 0,
      },
      {
        id: "pl2",
        key: "FIGHTER",
        name: "Fighter",
        priceCents: 14900,
        price: "$149 / mo",
        memberCount: 3,
      },
    ]);
  });
});
```

Add `membership: { groupBy: vi.fn(), findFirst: vi.fn(), update: vi.fn() }` to that file's db mock factory if not already present.

Run it, watch it fail, then replace `getPlanBreakdown` in `src/features/memberships/queries.ts` — deleting the `PLAN_PRICES` const above it and importing `formatPlanPrice`:

```ts
/**
 * Every plan with how many members hold it.
 *
 * Driven by the Plan table rather than by grouping memberships, so a tier
 * nobody has bought still appears — otherwise it could never be priced.
 */
export async function getPlanBreakdown() {
  const [plans, byPlan] = await Promise.all([
    db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    db.membership.groupBy({ by: ["plan"], _count: { plan: true } }),
  ]);

  const counts = new Map(byPlan.map((b) => [b.plan, b._count.plan]));

  return plans.map((p) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    priceCents: p.priceCents,
    price: formatPlanPrice(p.priceCents),
    memberCount: counts.get(p.key) ?? 0,
  }));
}
```

Run again and watch it pass.

- [ ] **Step 10: Write `updatePlan` (RED)**

`src/features/plans/schemas.ts`:

```ts
import { z } from "zod";

export const updatePlanSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(2),
  // Zero is allowed — a free introductory tier is a real thing. Negative is
  // not.
  priceCents: z.number().int().min(0),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
```

`src/features/plans/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({ db: { plan: { update: vi.fn() } } }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { updatePlan } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedUpdate = db.plan.update as unknown as Mock;
const validInput = { key: "FIGHTER", name: "Fighter", priceCents: 15900 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updatePlan", () => {
  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });

    await expect(updatePlan(validInput)).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await expect(updatePlan(validInput)).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects a negative price before touching the database", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updatePlan({ ...validInput, priceCents: -1 })).rejects.toThrow();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects a fractional price, since cents are the smallest unit", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updatePlan({ ...validInput, priceCents: 8900.5 })).rejects.toThrow();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("updates the plan by key for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await expect(updatePlan(validInput)).resolves.toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { key: "FIGHTER" },
      data: { name: "Fighter", priceCents: 15900 },
    });
  });

  it("revalidates both public pages that show prices", async () => {
    // getPublicPlans has two callers: the pricing page and the homepage. A
    // price edit that only revalidated the admin screen would leave the old
    // price on the public site until the next deploy.
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });

    await updatePlan(validInput);

    const paths = (revalidatePath as unknown as Mock).mock.calls.map((c) => c[0]);
    expect(paths).toContain("/pricing");
    expect(paths).toContain("/");
  });
});
```

Run: `npx vitest run src/features/plans/actions.test.ts --reporter=verbose`

Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 11: Implement `updatePlan` (GREEN)**

`src/features/plans/actions.ts`:

```ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updatePlanSchema, type UpdatePlanInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function updatePlan(rawInput: UpdatePlanInput) {
  const input = updatePlanSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // Keyed on `key`, not id: it is unique, it is what Membership.plan holds,
  // and it is what the admin table has in hand.
  await db.plan.update({
    where: { key: input.key },
    data: { name: input.name, priceCents: input.priceCents },
  });

  revalidatePath("/dashboard/admin/plans");
  // getPublicPlans backs both of these. Revalidating only the admin screen
  // would leave the old price on the public site.
  revalidatePath("/pricing");
  revalidatePath("/");
  return { ok: true as const };
}
```

Run the file again: PASS, 6 tests.

- [ ] **Step 12: Confirm both consts are gone**

Run: `grep -rn "PLAN_PRICES" src/`

Expected: no output. Both copies deleted, as the spec requires.

- [ ] **Step 13: Full suite, typecheck, lint, commit**

Run: `npm test && npx tsc --noEmit && npm run lint`

Expected: all green. Check the public pricing page and homepage still read `$89 / mo`, `$149 / mo`, `$249 / mo` against the seeded data before committing.

```bash
git add src/features/plans src/features/marketing src/features/memberships
git commit -m "feat: read plan prices from the database and let admins edit them"
```

---

## Task 17: Inline plan editing on the admin plans page

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/plans/PlanRowEditor.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/plans/page.tsx`

**Interfaces:**
- Consumes: `updatePlan` from Task 16, and `getPlanBreakdown`'s new `{ id, key, name, priceCents, price, memberCount }` row shape
- Produces: nothing later tasks use

- [ ] **Step 1: Write the editor**

`src/app/(dashboard)/dashboard/admin/plans/PlanRowEditor.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlan } from "@/features/plans/actions";

export function PlanRowEditor({
  planKey,
  name,
  priceCents,
}: {
  planKey: string;
  name: string;
  priceCents: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name, priceCents });
  const router = useRouter();

  const field =
    "border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] w-full";
  const button =
    "border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={button}>
        Edit
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-[420px]">
      <input
        aria-label="Plan name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={field}
      />
      <input
        aria-label="Price in cents"
        type="number"
        value={form.priceCents}
        onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
        className={field}
      />
      <p className="text-[var(--dim)] text-xs">
        Price is in cents — 8900 is $89 / mo. This is what the public pricing page shows.
      </p>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await updatePlan({ key: planKey, name: form.name, priceCents: form.priceCents });
                setEditing(false);
                router.refresh();
              } catch {
                setError("Couldn't save. The price must be a whole number of cents, zero or more.");
              }
            })
          }
          className={button}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className={button}>
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the page**

`getPlanBreakdown` now returns real ids and a `name`, so the page no longer synthesises `id: p.plan`.

```tsx
import { getPlanBreakdown } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { PlanRowEditor } from "./PlanRowEditor";

type PlanRow = Awaited<ReturnType<typeof getPlanBreakdown>>[number];

export default async function AdminPlansPage() {
  const plans = await getPlanBreakdown();

  return (
    <>
      <Topbar title="Membership plans" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {plans.length === 0 ? (
          <EmptyState body="No plans have been configured yet." />
        ) : (
          <DataTable<PlanRow>
            columns={[
              { header: "Plan", render: (r) => r.name },
              { header: "Key", render: (r) => r.key },
              { header: "Price", render: (r) => r.price },
              { header: "Members", render: (r) => String(r.memberCount) },
              {
                header: "",
                render: (r) => (
                  <PlanRowEditor planKey={r.key} name={r.name} priceCents={r.priceCents} />
                ),
              },
            ]}
            rows={plans}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify live, end to end**

`npx next dev -p 3200`, admin, `/dashboard/admin/plans`.

Confirm: all three seeded tiers appear, including ones with zero members; editing CONTENDER's price to `9900` and saving updates the table to `$99 / mo`; **`/pricing` and the homepage both show `$99 / mo` without a restart** — that is the revalidation path from Task 16 working; setting a negative price shows the error and leaves the row unchanged.

- [ ] **Step 4: Read it at three widths**

At 320px the plans table scrolls inside its own container while the page does not; the editor's fields are full-width and Save/Cancel stack. Every target ≥44px.

- [ ] **Step 5: Commit**

```bash
npm test && npx tsc --noEmit && npm run lint
git add "src/app/(dashboard)/dashboard/admin/plans"
git commit -m "feat: edit plan names and prices from the admin plans table"
```

---

## Final Verification

Run after Task 17, before merging.

- [ ] **Full suite:** `npm test` — expect roughly 24 files and ~185 tests, 0 failures. The exact count depends on how many caller tests Task 2 removed; what matters is 0 failures and a count that reconciles with the per-task arithmetic.
- [ ] **Typecheck:** `npx tsc --noEmit` — clean.
- [ ] **Lint:** `npm run lint` — clean. Not `next lint`.
- [ ] **Build:** `npm run build` — succeeds, and the route list includes `/dashboard/admin/members/[id]`.
- [ ] **No leftover consts:** `grep -rn "PLAN_PRICES" src/` returns nothing.
- [ ] **Seed still works from empty:** `npx prisma db push --force-reset && npx prisma db seed` (worktree only).
- [ ] **Consolidated live pass** at 320 / 768 / 1280px across every surface this phase touched: `admin/members`, `admin/members/[id]`, `admin/orders`, `admin/shop`, `admin/content`, `admin/gallery`, `admin/plans`, plus the public `/` and `/pricing` to confirm prices still render. No horizontal scroll at 320px anywhere; no interactive target below 44px.
- [ ] **RBAC spot check:** log in as the trainer (`ana@umairfitness.gym` / `password123`) and confirm the admin routes are not reachable, then as the member (`marcus@umairfitness.gym`).
- [ ] **Update the ledger** at `docs/superpowers/ledgers/` with a Phase 5 entry — deferred items, named gaps, and any ruling that turned out wrong.

**Known gap carried forward, unchanged:** nothing executes a cancellation once `cancelEffectiveAt` passes (spec's own "Known gap" section, and Ruling 8 above). `updateMembership` gives an admin a manual route to `CANCELLED`; the scheduler is still unbuilt.
