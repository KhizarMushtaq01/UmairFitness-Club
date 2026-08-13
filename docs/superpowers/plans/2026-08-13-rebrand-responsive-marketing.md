# Umair Fitness Club — Rebrand, Responsive Pass + Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app to Umair Fitness Club, make all 21 existing dashboard routes usable on phones and tablets, then add six public marketing pages that read live data.

**Architecture:** Three sequential phases. Phase 0 is a mechanical rename. Phase A adds Tailwind responsive prefixes to existing layouts and introduces a mobile nav drawer, whose open/closed state travels through a small React context because `Topbar` is rendered by each page while the sidebar lives in the layout. Phase B adds a `(marketing)` route group outside `(dashboard)` — public, no session guard — backed by its own query module that selects only public-safe columns.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, Prisma 7 + SQLite, Better Auth, Zod, React Hook Form, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-13-responsive-and-marketing-design.md`

## Global Constraints

- Zero border-radius on all UI primitives; `* { border-radius: 0 !important }` is already in `globals.css`. Do not add `rounded-*` classes — they will not render.
- Colors and fonts come from the CSS variables in `src/app/globals.css`: `--bg --panel --card --line --line2 --txt --mut --dim --red --inv --skel --skel2`, `--font-display --font-heading --font-sans`. Do not introduce new colors.
- Mobile-first. Base (unprefixed) styles target phones; `sm:` 640px, `md:` 768px, `lg:` 1024px. `md:` is the pivot where the sidebar becomes permanent.
- Interactive elements reach at least 44px height on mobile.
- Marketing pages are public. They must never call a query from `src/features/memberships/queries.ts` — those return email addresses.
- Every mutating dashboard server action still starts with `assertRole(session, allowedRoles)`. The contact action is the one deliberate exception; it is public and starts with Zod parsing instead.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npx vitest run` must all pass with zero errors before any task is considered done.
- Do not touch `Fight Club.dc.html`, `support.js`, or `image-slot.js` — vendored prototype artifacts, excluded from lint.
- Blog, SEO metadata, JSON-LD, sitemap, GSAP motion, and live Stripe are out of scope.

---

## Task 1: Rebrand to Umair Fitness Club

**Files:**
- Modify: `src/components/shared/Logo.tsx`
- Modify: `prisma/seed.ts`
- Modify: `src/lib/email.ts:13`
- Modify: `src/lib/uploads.ts:13`
- Modify: `package.json:2`

**Interfaces:**
- Produces: seeded accounts at `danny@umairfitness.gym`, `ana@umairfitness.gym`, `marcus@umairfitness.gym` (password `password123`). Every later task's manual verification uses these addresses.

- [ ] **Step 1: Rewrite the Logo**

The lettermark goes from two glyphs to three. The box widens from `w-8` (32px) to `w-11` (44px) and the glyph size drops from 17px to 15px, or `UFC` overflows the clip-path.

```tsx
// src/components/shared/Logo.tsx
export function Logo() {
  return (
    <div className="flex items-center gap-[11px]">
      <div
        className="w-11 h-8 bg-[var(--txt)] text-[var(--inv)] grid place-items-center font-[var(--font-heading)] text-[15px] tracking-[.04em]"
        style={{ clipPath: "polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)" }}
      >
        UFC
      </div>
      <div className="font-[var(--font-heading)] text-[19px] tracking-[.14em] whitespace-nowrap">
        UMAIR FITNESS CLUB
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the seed addresses and copy**

Replace every `@fightclub.gym` with `@umairfitness.gym` in `prisma/seed.ts` (six occurrences — three `email` fields and three `accountId` fields). Then update the two branded strings:

```ts
// prisma/seed.ts — invoice description
{ userId: member.id, desc: "Umair Fitness Club wraps + gloves", amount: 16400, status: "REFUNDED", issuedAt: new Date("2026-04-22") },
```

```ts
// prisma/seed.ts — product name
const gloves = await db.product.create({ data: { name: "UFC Pro leather gloves — 14oz", price: 12000, stock: 34, category: "Gear" } });
```

- [ ] **Step 3: Update the email from-address**

```ts
// src/lib/email.ts:13
    from: "Umair Fitness Club <noreply@umairfitness.gym>",
```

- [ ] **Step 4: Update the Cloudinary folder**

```ts
// src/lib/uploads.ts:13
    const stream = cloudinary.uploader.upload_stream({ folder: "umair-fitness-club" }, (err, res) => {
```

- [ ] **Step 5: Update the package name**

In `package.json`, change `"name": "fight-club"` to `"name": "umair-fitness-club"`. Leave `package-lock.json` alone; the next `npm install` rewrites it.

- [ ] **Step 6: Verify no references remain**

Run: `git grep -inE "fight.?club" -- src prisma package.json`
Expected: no output (exit code 1).

- [ ] **Step 7: Reseed the database**

The existing `dev.db` still holds the old addresses. Wipe and rebuild it:

```bash
rm -f dev.db
npx prisma db push
npx prisma db seed
```
Expected: `Seed complete: { admin: 'danny@umairfitness.gym', trainer: 'ana@umairfitness.gym', member: 'marcus@umairfitness.gym' }`

- [ ] **Step 8: Verify sign-in works at the new address**

```bash
npm run dev -- --port 5173 &
curl -s --retry 20 --retry-connrefused --retry-delay 2 -X POST http://localhost:5173/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"marcus@umairfitness.gym","password":"password123"}'
```
Expected: JSON containing `"role":"MEMBER"` and a `token`.

- [ ] **Step 9: Run the gate**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 errors, 21 tests passing.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: rebrand from Fight Club to Umair Fitness Club"
```

---

## Task 2: Make tables scroll instead of overflowing

**Files:**
- Modify: `src/components/shared/DataTable.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/settings/page.tsx:21`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DataTable` renders inside a horizontally scrollable container. Its props are unchanged — `{ columns: Column<T>[]; rows: T[] }`.

`DataTable` has nine consumers (member payments and workouts; trainer clients and schedule; admin members, trainers, plans, shop, orders). Fixing the wrapper here fixes all nine. The admin settings permission matrix builds its own `<table>` inline and needs the same treatment separately.

- [ ] **Step 1: Wrap DataTable's table**

Add a `min-w-[640px]` to the table so columns keep readable widths and the container scrolls, rather than the columns crushing.

```tsx
// src/components/shared/DataTable.tsx — replace the returned JSX
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--line)]">
            {columns.map((c) => (
              <th
                key={c.header}
                className="text-left text-[10.5px] font-semibold tracking-[.16em] uppercase text-[var(--dim)] p-3"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--line)]">
              {columns.map((c) => (
                <td key={c.header} className="p-3 text-sm">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
```

- [ ] **Step 2: Wrap the admin settings matrix**

In `src/app/(dashboard)/dashboard/admin/settings/page.tsx`, wrap the `<table>` in the same container. Change:

```tsx
      <div className="p-7 max-w-[1200px]">
        <table className="w-full border-collapse">
```
to:
```tsx
      <div className="p-4 md:p-7 max-w-[1200px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
```

and close the extra `</div>` before the closing `</div>` of the padding wrapper.

- [ ] **Step 3: Verify the markup**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

```bash
curl -s -b /tmp/ck-admin.txt http://localhost:5173/dashboard/admin/members | grep -c "overflow-x-auto"
```
Expected: at least 1.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: let wide tables scroll instead of blowing out the page"
```

---

## Task 3: Responsive grids, padding, and form widths

**Files:**
- Modify: `src/app/(dashboard)/dashboard/admin/analytics/page.tsx:12`
- Modify: `src/app/(dashboard)/dashboard/admin/gallery/page.tsx:16`
- Modify: `src/app/(dashboard)/dashboard/member/nutrition/page.tsx:18`
- Modify: `src/app/(dashboard)/dashboard/member/overview/page.tsx:15`
- Modify: `src/app/(dashboard)/dashboard/trainer/overview/page.tsx:15`
- Modify: `src/app/(dashboard)/dashboard/trainer/programs/page.tsx:19`
- Modify: `src/components/shared/Skeletons.tsx:11`
- Modify: `src/app/(dashboard)/dashboard/admin/shop/AddProductForm.tsx:44`
- Modify: `src/app/(dashboard)/dashboard/member/profile/page.tsx:16`
- Modify: `src/app/(dashboard)/dashboard/member/profile/ProfileForm.tsx:12`
- Modify: every file containing `className="p-7` (61 files: pages, `loading.tsx`, `error.tsx`)

**Interfaces:**
- Consumes: nothing.
- Produces: no API change; visual only.

- [ ] **Step 1: Widen the stat grids**

In the five stat-row pages, replace `grid grid-cols-4 gap-4` with:

```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
```

Files and lines: `admin/analytics/page.tsx:12`, `member/nutrition/page.tsx:18`, `member/overview/page.tsx:15`, `trainer/overview/page.tsx:15`. The gallery at `admin/gallery/page.tsx:16` uses the same class and takes the same replacement.

- [ ] **Step 2: Match the skeleton to the grid**

`StatRowSkeleton` stands in for the stat row. Leaving it at four columns makes the page visibly jump when data arrives.

```tsx
// src/components/shared/Skeletons.tsx
export function StatRowSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {[1, 2, 3, 4].map((k) => (
        <Shimmer key={k} className="h-[110px]" />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Widen the programs grid**

```tsx
// src/app/(dashboard)/dashboard/trainer/programs/page.tsx:19
        <div className="p-4 md:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1200px]">
```

- [ ] **Step 4: Let forms fill narrow screens**

In the three files listed above, replace `max-w-[420px]` with `w-full max-w-[420px]`.

- [ ] **Step 5: Reduce page padding on phones**

Across all 61 files containing it, replace `className="p-7` with `className="p-4 md:p-7`. This includes the `loading.tsx` and `error.tsx` boundaries, which must match their pages or the layout shifts on load.

```bash
grep -rl 'className="p-7' src --include=*.tsx | xargs sed -i 's|className="p-7|className="p-4 md:p-7|g'
```

Then check nothing was missed:

```bash
grep -rn 'className="p-7[^ ]' src --include=*.tsx
```
Expected: no output.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 errors, 21 tests passing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: make dashboard grids, padding, and forms responsive"
```

---

## Task 4: Mobile navigation drawer

**Files:**
- Create: `src/components/shared/DashboardShell.tsx`
- Modify: `src/components/shared/Topbar.tsx`
- Modify: `src/components/shared/Sidebar.tsx`
- Modify: `src/app/(dashboard)/dashboard/member/layout.tsx`
- Modify: `src/app/(dashboard)/dashboard/trainer/layout.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/layout.tsx`

**Interfaces:**
- Consumes: `Sidebar` from `@/components/shared/Sidebar` (props `{ role: Role; userName: string; userPlan: string }`), `Role` and `ROLE_BASE_PATH` from `@/lib/dashboard-nav`.
- Produces:
  - `DashboardShell({ role, userName, userPlan, children }: { role: Role; userName: string; userPlan: string; children: React.ReactNode })` — client component, replaces the grid `<div>` in all three role layouts.
  - `useSidebar(): { open: boolean; setOpen: (v: boolean) => void }` — exported from the same file, consumed by `Topbar`.

`Topbar` is rendered by each page, while the sidebar lives in the layout. They sit in different subtrees, so the drawer's open state travels through a React context rather than props. `Topbar` becomes a client component; it only receives a `title` string, which is serializable, so pages can keep passing it unchanged.

- [ ] **Step 1: Write the shell with its context**

```tsx
// src/components/shared/DashboardShell.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import type { Role } from "@/lib/dashboard-nav";

type SidebarState = { open: boolean; setOpen: (v: boolean) => void };

const SidebarContext = createContext<SidebarState>({ open: false, setOpen: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function DashboardShell({
  role,
  userName,
  userPlan,
  children,
}: {
  role: Role;
  userName: string;
  userPlan: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation, so tapping a nav item does not leave the drawer
  // sitting open over the page it just opened.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="grid grid-cols-1 md:grid-cols-[248px_1fr] min-h-screen items-start">
        {/* Permanent sidebar, tablet and up */}
        <div className="hidden md:block">
          <Sidebar role={role} userName={userName} userPlan={userPlan} />
        </div>

        {/* Drawer, phones only */}
        {open && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              id="dashboard-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="w-[248px] max-w-[80%] h-full overflow-y-auto"
            >
              <Sidebar role={role} userName={userName} userPlan={userPlan} />
            </div>
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="flex-1 h-full bg-black/60"
            />
          </div>
        )}

        <div className="min-w-0">{children}</div>
      </div>
    </SidebarContext.Provider>
  );
}
```

- [ ] **Step 2: Let the sidebar scroll inside the drawer**

`Sidebar` is `sticky top-0 h-screen`, which fights the drawer's own scroll container. Change its root element in `src/components/shared/Sidebar.tsx`:

```tsx
    <aside className="md:sticky md:top-0 h-full md:h-screen bg-[var(--panel)] border-r border-[var(--line)] flex flex-col">
```

Also raise the nav links to a 44px touch target — change the link className from `px-3 py-2.5` to:

```tsx
              className="flex items-center gap-3.5 px-3 py-3 min-h-[44px] no-underline"
```

- [ ] **Step 3: Add the hamburger to the Topbar**

```tsx
// src/components/shared/Topbar.tsx
"use client";
import { useSidebar } from "./DashboardShell";

export function Topbar({ title }: { title: string }) {
  const { open, setOpen } = useSidebar();

  return (
    <div className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md border-b border-[var(--line)] flex items-center gap-4 px-4 md:px-7 h-16">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="dashboard-nav-drawer"
        className="md:hidden w-11 h-11 grid place-items-center border border-[var(--line2)] text-[var(--txt)] shrink-0"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>
      <div
        style={{ fontFamily: "var(--font-heading)" }}
        className="text-[20px] md:text-[26px] tracking-[.06em] truncate"
      >
        {title}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Swap the shell into the three role layouts**

In `src/app/(dashboard)/dashboard/member/layout.tsx`, replace the returned JSX:

```tsx
  return (
    <DashboardShell role="MEMBER" userName={session.user.name} userPlan={membership?.plan ?? "Member"}>
      {children}
    </DashboardShell>
  );
```

and swap the import `import { Sidebar } from "@/components/shared/Sidebar";` for `import { DashboardShell } from "@/components/shared/DashboardShell";`.

Do the same in `trainer/layout.tsx` with `role="TRAINER"` and `userPlan="Coach"`, and in `admin/layout.tsx` with `role="ADMIN"` and `userPlan="Owner · Admin"`. Keep each file's existing session and role guards exactly as they are.

- [ ] **Step 5: Verify the guards still hold**

Run the gate first: `npx tsc --noEmit && npm run lint && npx vitest run`

Then, with the dev server running and cookie jars for each role, confirm the redirect matrix is unchanged:

```bash
curl -s -b /tmp/ck-member.txt -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:5173/dashboard/admin/analytics
```
Expected: `307 http://localhost:5173/dashboard/member/overview`

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:5173/dashboard/member/overview
```
Expected: `307 http://localhost:5173/login`

- [ ] **Step 6: Verify the drawer markup is present**

```bash
curl -s -b /tmp/ck-admin.txt http://localhost:5173/dashboard/admin/analytics | grep -c "Open navigation"
```
Expected: 1.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add mobile navigation drawer to dashboard layouts"
```

---

## Task 5: Public marketing queries

**Files:**
- Create: `src/features/marketing/queries.ts`
- Test: `src/features/marketing/queries.test.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db`.
- Produces:
  - `getPublicClasses(): Promise<{ id: string; discipline: string; title: string; room: string; time: string; day: string; durationMin: number; coachName: string; spotsLeft: number }[]>`
  - `getPublicTrainers(): Promise<{ id: string; name: string; classCount: number; programCount: number }[]>`
  - `getPublicPlans(): Promise<{ plan: string; price: string; memberCount: number }[]>`

These are written fresh rather than reusing `src/features/memberships/queries.ts`, whose `getAllTrainers()` returns `email`. That is correct for the admin console and a leak on a public page.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/marketing/queries.test.ts
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    class: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    membership: { groupBy: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { getPublicClasses, getPublicTrainers, getPublicPlans } from "./queries";

const mockedClasses = db.class.findMany as unknown as Mock;
const mockedUsers = db.user.findMany as unknown as Mock;
const mockedGroupBy = db.membership.groupBy as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublicTrainers", () => {
  it("never exposes an email address", async () => {
    mockedUsers.mockResolvedValue([
      {
        id: "t1",
        name: "Ana Silva",
        email: "ana@umairfitness.gym",
        _count: { coachClasses: 2, coachPrograms: 1 },
      },
    ]);

    const trainers = await getPublicTrainers();

    expect(trainers).toEqual([{ id: "t1", name: "Ana Silva", classCount: 2, programCount: 1 }]);
    expect(JSON.stringify(trainers)).not.toContain("@");
  });
});

describe("getPublicClasses", () => {
  it("exposes the coach's name but not their email, and computes spots left", async () => {
    mockedClasses.mockResolvedValue([
      {
        id: "c1",
        discipline: "Boxing",
        title: "Boxing — Advanced",
        room: "Ring 1",
        capacity: 16,
        durationMin: 60,
        startsAt: new Date("2026-08-08T18:30:00"),
        coach: { name: "Ana Silva", email: "ana@umairfitness.gym" },
        bookings: [{ status: "CONFIRMED" }, { status: "CANCELLED" }],
      },
    ]);

    const classes = await getPublicClasses();

    expect(classes[0].coachName).toBe("Ana Silva");
    expect(classes[0].spotsLeft).toBe(15);
    expect(JSON.stringify(classes)).not.toContain("@");
  });
});

describe("getPublicPlans", () => {
  it("returns a price for each seeded plan", async () => {
    mockedGroupBy.mockResolvedValue([{ plan: "FIGHTER", _count: { plan: 1 } }]);

    const plans = await getPublicPlans();

    expect(plans).toEqual([{ plan: "FIGHTER", price: "$149 / mo", memberCount: 1 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/marketing/queries.test.ts`
Expected: FAIL — `Cannot find module './queries'`.

- [ ] **Step 3: Implement the queries**

```ts
// src/features/marketing/queries.ts
import { db } from "@/lib/db";

// Public pages must not leak staff email addresses, so these queries select
// their fields explicitly rather than reusing the admin queries.
const PLAN_PRICES: Record<string, string> = {
  CONTENDER: "$89 / mo",
  FIGHTER: "$149 / mo",
  CHAMPION: "$249 / mo",
};

export async function getPublicClasses() {
  const classes = await db.class.findMany({
    include: { coach: true, bookings: true },
    orderBy: { startsAt: "asc" },
  });
  return classes.map((c) => ({
    id: c.id,
    discipline: c.discipline,
    title: c.title,
    room: c.room,
    day: c.startsAt.toLocaleDateString([], { weekday: "short" }),
    time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    durationMin: c.durationMin,
    coachName: c.coach.name,
    spotsLeft: c.capacity - c.bookings.filter((b) => b.status === "CONFIRMED").length,
  }));
}

export async function getPublicTrainers() {
  const trainers = await db.user.findMany({
    where: { role: "TRAINER" },
    include: { _count: { select: { coachClasses: true, coachPrograms: true } } },
    orderBy: { name: "asc" },
  });
  return trainers.map((t) => ({
    id: t.id,
    name: t.name,
    classCount: t._count.coachClasses,
    programCount: t._count.coachPrograms,
  }));
}

export async function getPublicPlans() {
  const byPlan = await db.membership.groupBy({ by: ["plan"], _count: { plan: true } });
  return byPlan.map((p) => ({
    plan: p.plan,
    price: PLAN_PRICES[p.plan] ?? "—",
    memberCount: p._count.plan,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/marketing/queries.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add public marketing queries that exclude private fields"
```

---

## Task 6: Contact form server action

**Files:**
- Create: `src/features/marketing/schemas.ts`
- Create: `src/features/marketing/actions.ts`
- Test: `src/features/marketing/actions.test.ts`

**Interfaces:**
- Consumes: `sendEmail` from `@/lib/email` (signature `sendEmail(input: { to: string; subject: string; html: string }): Promise<{ id: string }>`).
- Produces:
  - `contactSchema` — Zod object `{ name: string (min 2); email: string (email); message: string (min 10) }`
  - `type ContactInput = z.infer<typeof contactSchema>`
  - `sendContactMessage(rawInput: ContactInput): Promise<{ ok: true }>`

This action has no `assertRole`. It is public by design — a visitor is not signed in. It parses input first so a malformed submission never reaches the mail adapter.

- [ ] **Step 1: Write the schema**

```ts
// src/features/marketing/schemas.ts
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  message: z.string().min(10),
});
export type ContactInput = z.infer<typeof contactSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// src/features/marketing/actions.test.ts
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { sendEmail } from "@/lib/email";
import { sendContactMessage } from "./actions";

const mockedSend = sendEmail as unknown as Mock;
const valid = {
  name: "Ali Raza",
  email: "ali@example.com",
  message: "I would like to ask about the Fighter plan and class timings.",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedSend.mockResolvedValue({ id: "stub-1" });
});

describe("sendContactMessage", () => {
  it("rejects a malformed email without sending", async () => {
    await expect(sendContactMessage({ ...valid, email: "not-an-email" })).rejects.toThrow();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("rejects a message that is too short without sending", async () => {
    await expect(sendContactMessage({ ...valid, message: "hi" })).rejects.toThrow();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("sends the enquiry on valid input", async () => {
    const result = await sendContactMessage(valid);

    expect(result).toEqual({ ok: true });
    expect(mockedSend).toHaveBeenCalledTimes(1);
    const arg = mockedSend.mock.calls[0][0];
    expect(arg.to).toBe("hello@umairfitness.gym");
    expect(arg.subject).toContain("Ali Raza");
    expect(arg.html).toContain("ali@example.com");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/marketing/actions.test.ts`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 4: Implement the action**

```ts
// src/features/marketing/actions.ts
"use server";
import { sendEmail } from "@/lib/email";
import { contactSchema, type ContactInput } from "./schemas";

const INBOX = "hello@umairfitness.gym";

/**
 * Public — a visitor is not signed in, so there is deliberately no
 * assertRole here. Input is parsed first so a malformed submission never
 * reaches the mail adapter.
 */
export async function sendContactMessage(rawInput: ContactInput) {
  const input = contactSchema.parse(rawInput);

  await sendEmail({
    to: INBOX,
    subject: `Website enquiry from ${input.name}`,
    html: `<p><strong>From:</strong> ${input.name} (${input.email})</p><p>${input.message}</p>`,
  });

  return { ok: true as const };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/marketing/actions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add public contact form server action"
```

---

## Task 7: Marketing shell — header, footer, layout

**Files:**
- Create: `src/components/marketing/SiteHeader.tsx`
- Create: `src/components/marketing/SiteFooter.tsx`
- Create: `src/app/(marketing)/layout.tsx`

**Interfaces:**
- Consumes: `Logo` from `@/components/shared/Logo`.
- Produces: `SiteHeader`, `SiteFooter`, and a `(marketing)` route group layout wrapping both around `{children}`.

The `(marketing)` group sits outside `(dashboard)`, so it inherits no session guard. That is deliberate — these pages are public.

- [ ] **Step 1: Write the site navigation map and header**

```tsx
// src/components/marketing/SiteHeader.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";

const NAV = [
  ["/about", "About"],
  ["/classes", "Classes"],
  ["/trainers", "Trainers"],
  ["/pricing", "Pricing"],
  ["/contact", "Contact"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md border-b border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto flex items-center gap-4 px-4 md:px-7 h-16">
        <Link href="/" className="no-underline text-[var(--txt)] shrink-0">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-auto">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-[12.5px] font-semibold tracking-[.08em] uppercase no-underline"
              style={{ color: pathname === href ? "var(--txt)" : "var(--mut)" }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className="bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs no-underline"
          >
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden ml-auto w-11 h-11 grid place-items-center border border-[var(--line2)] shrink-0"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ☰
          </span>
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-[var(--line)] flex flex-col px-4 pb-4">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="min-h-[44px] flex items-center text-[12.5px] font-semibold tracking-[.08em] uppercase no-underline border-b border-[var(--line)]"
              style={{ color: pathname === href ? "var(--txt)" : "var(--mut)" }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-4 bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs no-underline text-center"
          >
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Write the footer**

```tsx
// src/components/marketing/SiteFooter.tsx
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] mt-20">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-10 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div>
          <div
            style={{ fontFamily: "var(--font-heading)" }}
            className="text-[19px] tracking-[.14em]"
          >
            UMAIR FITNESS CLUB
          </div>
          <p className="text-[var(--dim)] text-xs mt-1">
            Boxing · Muay Thai · Strength — coached, not guessed.
          </p>
        </div>
        <div className="flex gap-6">
          <Link href="/classes" className="text-[var(--mut)] text-xs uppercase tracking-widest no-underline">
            Classes
          </Link>
          <Link href="/pricing" className="text-[var(--mut)] text-xs uppercase tracking-widest no-underline">
            Pricing
          </Link>
          <Link href="/contact" className="text-[var(--mut)] text-xs uppercase tracking-widest no-underline">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Write the marketing layout**

```tsx
// src/app/(marketing)/layout.tsx
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors. The layout has no page yet, so no route resolves — that is expected until Task 8.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add public marketing shell with header and footer"
```

---

## Task 8: Home page

**Files:**
- Delete: `src/app/page.tsx` (the current redirect)
- Create: `src/app/(marketing)/page.tsx`

**Interfaces:**
- Consumes: `getPublicClasses`, `getPublicPlans` from `@/features/marketing/queries`.
- Produces: `/` serves the home page.

`src/app/page.tsx` and `src/app/(marketing)/page.tsx` both resolve to `/`. Both existing at once is a build-breaking route conflict, so the old file must be deleted in the same commit.

- [ ] **Step 1: Delete the redirect page**

```bash
git rm src/app/page.tsx
```

- [ ] **Step 2: Write the home page**

```tsx
// src/app/(marketing)/page.tsx
import Link from "next/link";
import { getPublicClasses, getPublicPlans } from "@/features/marketing/queries";

export default async function HomePage() {
  const [classes, plans] = await Promise.all([getPublicClasses(), getPublicPlans()]);

  return (
    <>
      <section className="max-w-[1200px] mx-auto px-4 md:px-7 pt-16 pb-20 md:pt-28 md:pb-28">
        <p className="text-[10.5px] font-semibold tracking-[.26em] uppercase text-[var(--red)]">
          Karachi · Est. 2026
        </p>
        <h1
          style={{ fontFamily: "var(--font-display)" }}
          className="text-[48px] sm:text-[72px] lg:text-[96px] leading-[0.95] mt-4"
        >
          TRAIN LIKE
          <br />
          IT MATTERS
        </h1>
        <p className="text-[var(--mut)] text-base mt-6 max-w-[520px]">
          Boxing, Muay Thai and strength coaching for people who want a plan, not
          a treadmill. Every member gets a programme, a coach, and a number to hit.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link
            href="/pricing"
            className="bg-[var(--red)] text-white px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline text-center"
          >
            See plans
          </Link>
          <Link
            href="/classes"
            className="border border-[var(--line2)] text-[var(--txt)] px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline text-center"
          >
            Class timetable
          </Link>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 md:px-7 pb-20">
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          NEXT SESSIONS
        </h2>
        {classes.length === 0 ? (
          <p className="text-[var(--mut)] text-sm mt-4">Timetable goes live shortly.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {classes.slice(0, 3).map((c) => (
              <div key={c.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
                <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                  {c.discipline}
                </div>
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">
                  {c.title}
                </div>
                <div className="text-[var(--mut)] text-xs mt-2">
                  {c.day} {c.time} · {c.room} · {c.coachName}
                </div>
                <div className="text-[var(--red)] text-sm font-semibold mt-3">
                  {c.spotsLeft} spots left
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-[1200px] mx-auto px-4 md:px-7 pb-20">
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          MEMBERSHIP
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {plans.map((p) => (
            <div key={p.plan} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl">
                {p.plan}
              </div>
              <div className="text-[var(--red)] text-lg font-semibold mt-2">{p.price}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Verify the route resolves for a signed-out visitor**

Run: `npm run build` — expected to succeed with `/` listed once, not as a conflict.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
```
Expected: `200` (no redirect — this is the intentional change from commit `442fdce`).

```bash
curl -s http://localhost:5173/ | grep -oE "TRAIN LIKE|UMAIR FITNESS CLUB|spots left"
```
Expected: all three present.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: replace root redirect with the marketing home page"
```

---

## Task 9: About, Classes, Trainers, and Pricing pages

**Files:**
- Create: `src/app/(marketing)/about/page.tsx`
- Create: `src/app/(marketing)/classes/page.tsx`
- Create: `src/app/(marketing)/trainers/page.tsx`
- Create: `src/app/(marketing)/pricing/page.tsx`

**Interfaces:**
- Consumes: `getPublicClasses`, `getPublicTrainers`, `getPublicPlans` from `@/features/marketing/queries`.

- [ ] **Step 1: Write the about page**

```tsx
// src/app/(marketing)/about/page.tsx
export default function AboutPage() {
  return (
    <section className="max-w-[760px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        ABOUT THE CLUB
      </h1>
      <p className="text-[var(--mut)] mt-6">
        Umair Fitness Club is a coaching gym. Members are not left to work out
        alone — every one of them is on a written programme, reviewed by a coach,
        with attendance and adherence tracked week to week.
      </p>
      <p className="text-[var(--mut)] mt-4">
        We run boxing, Muay Thai and strength blocks out of two rings and a
        platform floor. Class sizes are capped so a coach can actually see you.
      </p>
      <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em] mt-12">
        HOW IT WORKS
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {[
          ["01", "Assessment", "You come in, we test where you are and what you want."],
          ["02", "Programme", "A coach writes you a block — sets, loads, tempo, the lot."],
          ["03", "Review", "Adherence gets tracked. The block gets adjusted, not repeated."],
        ].map(([n, title, body]) => (
          <li key={n} className="flex gap-4 border-b border-[var(--line)] pb-4">
            <span style={{ fontFamily: "var(--font-heading)" }} className="text-[var(--dim)] text-lg">
              {n}
            </span>
            <div>
              <div className="font-semibold text-sm">{title}</div>
              <div className="text-[var(--dim)] text-xs mt-1">{body}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: Write the classes page**

```tsx
// src/app/(marketing)/classes/page.tsx
import { getPublicClasses } from "@/features/marketing/queries";

export default async function ClassesPage() {
  const classes = await getPublicClasses();

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        TIMETABLE
      </h1>
      {classes.length === 0 ? (
        <p className="text-[var(--mut)] mt-6">No classes scheduled yet — check back shortly.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {classes.map((c) => (
            <div key={c.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                {c.discipline}
              </div>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">
                {c.title}
              </div>
              <div className="text-[var(--mut)] text-xs mt-2">
                {c.day} {c.time} · {c.durationMin} min · {c.room}
              </div>
              <div className="text-[var(--dim)] text-xs mt-1">Coach {c.coachName}</div>
              <div className="text-[var(--red)] text-sm font-semibold mt-3">
                {c.spotsLeft} spots left
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Write the trainers page**

```tsx
// src/app/(marketing)/trainers/page.tsx
import { getPublicTrainers } from "@/features/marketing/queries";

export default async function TrainersPage() {
  const trainers = await getPublicTrainers();

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        COACHES
      </h1>
      {trainers.length === 0 ? (
        <p className="text-[var(--mut)] mt-6">Coach profiles going up soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {trainers.map((t) => (
            <div key={t.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div className="w-14 h-14 bg-[var(--red)] text-white grid place-items-center text-lg font-bold">
                {t.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-4">
                {t.name}
              </div>
              <div className="text-[var(--mut)] text-xs mt-2">
                {t.classCount} classes · {t.programCount} programmes
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Write the pricing page**

```tsx
// src/app/(marketing)/pricing/page.tsx
import Link from "next/link";
import { getPublicPlans } from "@/features/marketing/queries";

const PLAN_BLURB: Record<string, string> = {
  CONTENDER: "Open gym, two classes a week, group programming.",
  FIGHTER: "Unlimited classes, a written block, monthly coach review.",
  CHAMPION: "Everything in Fighter plus 1-to-1 sessions and nutrition.",
};

export default async function PricingPage() {
  const plans = await getPublicPlans();

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        MEMBERSHIP
      </h1>
      <p className="text-[var(--mut)] mt-6 max-w-[520px]">
        No joining fee. Freeze any plan for up to a month a year.
      </p>
      {plans.length === 0 ? (
        <p className="text-[var(--mut)] mt-6">Plans are being finalised.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {plans.map((p) => (
            <div key={p.plan} className="bg-[var(--card)] border border-[var(--line)] p-6 flex flex-col">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-[32px]">
                {p.plan}
              </div>
              <div className="text-[var(--red)] text-xl font-semibold mt-2">{p.price}</div>
              <p className="text-[var(--mut)] text-sm mt-4 flex-1">
                {PLAN_BLURB[p.plan] ?? "Ask us about this plan."}
              </p>
              <Link
                href="/contact"
                className="mt-6 bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs no-underline text-center"
              >
                Enquire
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Verify all four render signed out**

```bash
for p in about classes trainers pricing; do
  printf "%-10s " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5173/$p"
done
```
Expected: `200` for each.

```bash
curl -s http://localhost:5173/trainers | grep -c "@"
```
Expected: `0` — no email addresses on the public coaches page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add about, classes, trainers, and pricing pages"
```

---

## Task 10: Contact page

**Files:**
- Create: `src/app/(marketing)/contact/page.tsx`
- Create: `src/app/(marketing)/contact/ContactForm.tsx`

**Interfaces:**
- Consumes: `contactSchema`, `ContactInput` from `@/features/marketing/schemas`; `sendContactMessage` from `@/features/marketing/actions`.

- [ ] **Step 1: Write the client form**

```tsx
// src/app/(marketing)/contact/ContactForm.tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/features/marketing/schemas";
import { sendContactMessage } from "@/features/marketing/actions";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  if (sent) {
    return (
      <div className="border border-[var(--line2)] p-6">
        <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl">
          Message sent
        </div>
        <p className="text-[var(--mut)] text-sm mt-2">
          We&apos;ll come back to you within one working day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        setServerError(null);
        try {
          await sendContactMessage(data);
          reset();
          setSent(true);
        } catch {
          setServerError("Couldn't send that. Please try again.");
        }
      })}
      className="flex flex-col gap-3 w-full max-w-[520px]"
    >
      <input
        {...register("name")}
        placeholder="Your name"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.name && <p className="text-[var(--red)] text-sm">{errors.name.message}</p>}

      <input
        {...register("email")}
        placeholder="Email"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.email && <p className="text-[var(--red)] text-sm">{errors.email.message}</p>}

      <textarea
        {...register("message")}
        rows={5}
        placeholder="What would you like to know?"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.message && <p className="text-[var(--red)] text-sm">{errors.message.message}</p>}

      {serverError && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {serverError}
        </p>
      )}

      <button
        disabled={isSubmitting}
        className="bg-[var(--red)] text-white p-4 font-bold uppercase tracking-widest text-xs"
      >
        {isSubmitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the contact page**

```tsx
// src/app/(marketing)/contact/page.tsx
import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        GET IN TOUCH
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-10">
        <ContactForm />
        <div className="flex flex-col gap-6">
          {[
            ["Address", "Plot 12, Shahrah-e-Faisal, Karachi"],
            ["Phone", "+92 300 0000000"],
            ["Email", "hello@umairfitness.gym"],
            ["Hours", "Mon–Sat 06:00–23:00 · Sun 08:00–20:00"],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-[var(--line)] pb-4">
              <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                {label}
              </div>
              <div className="text-sm mt-1">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/contact
```
Expected: `200`.

```bash
curl -s http://localhost:5173/contact | grep -oE "GET IN TOUCH|Send message|hello@umairfitness.gym"
```
Expected: all three present.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add contact page with working enquiry form"
```

---

## Task 11: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit && npm run lint && npm run build && npx vitest run
```
Expected: zero errors; the build lists all six marketing routes plus the 21 dashboard routes; all tests pass (21 from Phase 1 plus 6 new = 27).

- [ ] **Step 2: Confirm the rename is complete**

```bash
git grep -inE "fight.?club" -- src prisma package.json
```
Expected: no output.

- [ ] **Step 3: Confirm no private data on public pages**

```bash
for p in "" about classes trainers pricing contact; do
  printf "%-10s emails=" "/$p"
  curl -s "http://localhost:5173/$p" | grep -oE "@umairfitness\.gym" | grep -v "hello@" | wc -l
done
```
Expected: `0` for every page except `/contact`, where only the public `hello@umairfitness.gym` inbox appears.

- [ ] **Step 4: Confirm the guards are unchanged**

Sign in as each seeded role, then probe:

```bash
curl -s -b /tmp/ck-member.txt -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:5173/dashboard/admin/analytics
curl -s -b /tmp/ck-trainer.txt -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:5173/dashboard/admin/roles
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:5173/dashboard/member/payments
```
Expected: member → `/dashboard/member/overview`, trainer → `/dashboard/trainer/overview`, anonymous → `/login`.

- [ ] **Step 5: Confirm all 21 dashboard routes still return 200**

Walk every tab for each role as in the Phase 1 verification: 6 member, 4 trainer plus a client detail page, 10 admin.

- [ ] **Step 6: Manual responsive check (human reviewer)**

Static markup cannot prove a layout looks right. Open the app at three widths — 375px, 768px, 1280px — and confirm:

- no horizontal page scroll on any dashboard route at 375px
- the hamburger appears below 768px and the sidebar is permanent above it
- all ten admin nav items are reachable in the drawer
- wide tables scroll inside their own container rather than moving the page

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "chore: final verification pass for rebrand, responsive, and marketing"
```
