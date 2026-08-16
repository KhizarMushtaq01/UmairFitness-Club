# Member Dashboard Interactivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the member dashboard the behaviour its schema already implies — class booking with a waitlist, in-app + email notifications, an attendance streak, and membership freeze/cancel.

**Architecture:** Each feature is built vertically (schema → pure function → query → server action → UI → test) following the established `src/features/<domain>/{schemas,queries,actions}.ts` layout. Booking correctness lives in `db.$transaction`; streak and freeze-allowance logic live in pure functions tested without a database. All notifications funnel through one `notify()` helper so email delivery is best-effort and never rolls back an in-app notification.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript · Prisma 7 (SQLite via better-sqlite3 adapter) · Better Auth · Zod · React Hook Form · Tailwind v4 · Vitest

**Spec:** `docs/superpowers/specs/2026-08-16-dashboard-interactivity-design.md`

This plan covers the **member phase** only. The admin phase (member detail/editing, order and shop write actions, content and gallery, the `Plan` model) is a separate plan and carries its own migration.

## Global Constraints

- **Three-layer auth on every server action:** Zod schema in the feature's `schemas.ts`, then `assertRole(session, [...])`, then row-level scoping to the caller (`where: { userId }`) for user-owned resources. Handoff §5.
- **Third-party stays stubbed.** `lib/email.ts`, `lib/payments.ts`, `lib/uploads.ts` keep their "real call when the key is set, logged stub otherwise" shape. No live Stripe/Resend/Cloudinary calls.
- **Design tokens only:** `var(--card)`, `var(--line)`, `var(--line2)`, `var(--txt)`, `var(--mut)`, `var(--dim)`, `var(--red)`. Headings use `style={{ fontFamily: "var(--font-heading)" }}`. Zero border-radius everywhere.
- **Page padding is `p-4 md:p-7`.** Card/stat grids are `grid-cols-1 sm:grid-cols-2 lg:grid-cols-N`. Forms are `w-full max-w-[420px]`.
- **Interactive elements are ≥44px tall on mobile.** Use the established `px-4 py-2 min-h-[44px] inline-flex items-center justify-center` button pattern.
- **Every new route needs `loading.tsx` and `error.tsx`** plus an `EmptyState` for the no-data case. Handoff §7.
- **Responsive verification at 320px / 768px / 1280px.** No horizontal page scroll at 320px; no tap target under 44px there.
- **Tests run with `npm test`** (vitest, node environment). The database is mocked with `vi.mock("@/lib/db", ...)` — never hit the real SQLite file in a unit test.
- **`FROZEN` is never a stored status value.** It is derived from `frozenUntil > now`.
- The dev server runs on **port 3200** (`npm run dev`).

---

### Task 1: Schema — MembershipFreeze and cancelRequestedAt

Freeze is capped at 8 weeks per calendar year, but `Membership.frozenUntil` alone cannot say how many weeks were already used — a member could freeze repeatedly and bypass the cap. One row per freeze fixes that. `cancelRequestedAt` records when a cancellation was requested so the 30-day notice can be computed.

This project has no `prisma/migrations/` directory; it uses `prisma db push` against `dev.db`.

**Files:**
- Modify: `prisma/schema.prisma`

The seed needs no changes: both additions are optional (`cancelRequestedAt` is nullable, `freezes` starts empty), so existing seed rows stay valid. Step 3 re-runs it to prove that.

**Interfaces:**
- Consumes: nothing
- Produces: Prisma models `MembershipFreeze { id, membershipId, from, to, createdAt, membership }` and field `Membership.cancelRequestedAt: DateTime?`, relation `Membership.freezes: MembershipFreeze[]`

- [ ] **Step 1: Add the model and fields to the schema**

In `prisma/schema.prisma`, add two fields to the existing `Membership` model (keep every existing field):

```prisma
model Membership {
  id                String    @id @default(cuid())
  userId            String
  plan              String    // CONTENDER | FIGHTER | CHAMPION
  status            String    // ACTIVE | TRIAL | AT_RISK | CANCELLED
  renewsAt          DateTime?
  frozenUntil       DateTime?
  cancelRequestedAt DateTime?
  createdAt         DateTime  @default(now())
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  freezes           MembershipFreeze[]
}
```

Then append the new model at the end of the file:

```prisma
model MembershipFreeze {
  id           String     @id @default(cuid())
  membershipId String
  from         DateTime
  to           DateTime
  createdAt    DateTime   @default(now())
  membership   Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Push the schema and regenerate the client**

Run: `npx prisma db push && npx prisma generate`
Expected: "Your database is now in sync with your Prisma schema" and "Generated Prisma Client".

- [ ] **Step 3: Verify nothing regressed**

Run: `npm test`
Expected: PASS — the existing suite is unchanged by an additive schema change. If anything fails here, the schema edit broke an existing model; fix it before continuing.

Run: `npx prisma db seed`
Expected: the seed completes without error against the new schema.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: record membership freezes and cancellation requests

frozenUntil alone cannot say how many freeze weeks a member has already
used in a year, so the 8-week cap was unenforceable. One row per freeze
makes the allowance computable. cancelRequestedAt anchors the 30-day
cancellation notice."
```

---

### Task 2: computeStreak pure function

The check-in streak is the real logic behind the attendance feature, so it lives in a pure function tested without a database. Two rules matter and both are easy to get wrong: several check-ins on one calendar day count once, and a missing check-in *today* must not break the streak — otherwise a member's 30-day streak reads as broken at 9am before they train.

**Files:**
- Create: `src/features/workouts/streak.ts`
- Test: `src/features/workouts/streak.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `computeStreak(dates: Date[], today?: Date): number`

- [ ] **Step 1: Write the failing test**

Create `src/features/workouts/streak.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeStreak } from "./streak";

// A fixed "today" keeps these tests from breaking at midnight.
const TODAY = new Date(2026, 7, 16); // 16 Aug 2026
const day = (offset: number) => new Date(2026, 7, 16 - offset);

describe("computeStreak", () => {
  it("returns 0 for no check-ins", () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak([day(0), day(1), day(2)], TODAY)).toBe(3);
  });

  it("counts multiple check-ins on one day only once", () => {
    const twiceToday = [new Date(2026, 7, 16, 7), new Date(2026, 7, 16, 19)];
    expect(computeStreak([...twiceToday, day(1)], TODAY)).toBe(2);
  });

  it("stays alive when today has no check-in yet", () => {
    expect(computeStreak([day(1), day(2)], TODAY)).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(computeStreak([day(0), day(1), day(3), day(4)], TODAY)).toBe(2);
  });

  it("returns 0 when the most recent check-in is older than yesterday", () => {
    expect(computeStreak([day(5), day(6)], TODAY)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/workouts/streak.test.ts`
Expected: FAIL — cannot find module `./streak`.

- [ ] **Step 3: Write the implementation**

Create `src/features/workouts/streak.ts`:

```ts
/**
 * Consecutive days with at least one check-in, counting backwards.
 *
 * `today` is injectable so tests do not depend on the wall clock. Dates are
 * compared date-only in the server's timezone — an explicit simplification
 * that will need revisiting for a gym spanning timezones.
 */
export function computeStreak(dates: Date[], today: Date = new Date()): number {
  if (dates.length === 0) return 0;

  const days = new Set(dates.map(dayKey));
  const cursor = new Date(today);

  // A missing check-in today does not break the streak; the day is not over.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/workouts/streak.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/workouts/streak.ts src/features/workouts/streak.test.ts
git commit -m "feat: compute check-in streaks from attendance dates"
```

---

### Task 3: Attendance summary query and overview UI

`AttendanceLog` rows are written by the trainer's `MarkAttendanceButton` and never read back for the member. This surfaces them.

The query lives in `features/workouts/queries.ts` because `markAttendance` already lives in `features/workouts/actions.ts`; a new folder for one query would break the existing pairing of query beside action.

**Files:**
- Modify: `src/features/workouts/queries.ts` (append)
- Modify: `src/app/(dashboard)/dashboard/member/overview/page.tsx`

**Interfaces:**
- Consumes: `computeStreak(dates, today?)` from Task 2
- Produces: `getAttendanceSummary(userId): Promise<{ streak: number; total: number; recent: { id: string; date: string; time: string }[] }>`

- [ ] **Step 1: Add the query**

Append to `src/features/workouts/queries.ts` (keep the existing `import { db } from "@/lib/db";` at the top and add the streak import beside it):

```ts
import { computeStreak } from "./streak";

export async function getAttendanceSummary(userId: string) {
  const logs = await db.attendanceLog.findMany({
    where: { userId },
    orderBy: { checkedInAt: "desc" },
  });

  return {
    streak: computeStreak(logs.map((l) => l.checkedInAt)),
    total: logs.length,
    recent: logs.slice(0, 8).map((l) => ({
      id: l.id,
      date: l.checkedInAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
      time: l.checkedInAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })),
  };
}
```

- [ ] **Step 2: Render it on the overview**

Rewrite `src/app/(dashboard)/dashboard/member/overview/page.tsx`. The existing stat row and "up next" block stay exactly as they are; a streak card joins the stat row and a check-in history block is appended:

```tsx
import { requireSession } from "@/lib/rbac";
import { getMemberOverview } from "@/features/analytics/queries";
import { getAttendanceSummary } from "@/features/workouts/queries";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function MemberOverviewPage() {
  const session = await requireSession();
  const [{ stats, upNext }, attendance] = await Promise.all([
    getMemberOverview(session.user.id),
    getAttendanceSummary(session.user.id),
  ]);

  const streakCard = {
    label: "Check-in streak",
    value: `${attendance.streak}`,
    delta: attendance.streak === 1 ? "day" : "days",
    deltaColor: attendance.streak > 0 ? "var(--red)" : "var(--mut)",
  };

  return (
    <>
      <Topbar title="Overview" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[streakCard, ...stats].map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {upNext.length === 0 ? (
          <EmptyState
            body="Book a class to see it here."
            ctaLabel="Browse classes"
            ctaHref="/dashboard/member/classes"
          />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {upNext.map((n, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg">
                  {n.time}
                </div>
                <div>
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-[var(--dim)] text-xs">{n.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-[var(--card)] border border-[var(--line)]">
          <div className="p-4 border-b border-[var(--line)] text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Recent check-ins
          </div>
          {attendance.recent.length === 0 ? (
            <p className="p-4 text-[var(--mut)] text-sm">
              No check-ins yet. Your coach marks attendance when you train.
            </p>
          ) : (
            attendance.recent.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap gap-x-4 gap-y-1 p-4 border-b border-[var(--line)] last:border-0 text-sm"
              >
                <span className="font-semibold">{r.date}</span>
                <span className="text-[var(--dim)]">{r.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
```

Note the CTA href now points at `/dashboard/member/classes`, the route Task 8 creates. It 404s until then — that is expected and fixed within this plan.

- [ ] **Step 3: Verify the suite and the page**

Run: `npm test`
Expected: PASS — no existing test covers this page, and the new query is exercised through `computeStreak`'s own tests.

Run: `npm run dev`, sign in as the seeded member, open `http://localhost:3200/dashboard/member/overview`.
Expected: a "Check-in streak" card leads the stat row and a "Recent check-ins" block renders below.

- [ ] **Step 4: Check responsiveness**

At 320px: stat cards stack to one column, the check-in rows wrap (`flex-wrap`) instead of overflowing, and the page does not scroll horizontally. At 768px: two columns. At 1280px: four columns.

- [ ] **Step 5: Commit**

```bash
git add src/features/workouts/queries.ts "src/app/(dashboard)/dashboard/member/overview/page.tsx"
git commit -m "feat: show check-in streak and recent attendance on member overview

AttendanceLog rows were written by the trainer and never read back for
the member they belonged to."
```

---

### Task 4: notify() helper, notification queries and actions

One funnel for every notification. The in-app row is the source of truth and email is best-effort: if `sendEmail` throws, the row must survive, or a Resend outage would silently swallow a member's waitlist promotion.

This task also moves `updateProfile` out of `features/notifications/actions.ts`, where it never belonged, into `features/profile/actions.ts` — this task is adding real notification actions to that file, and Task 10's freeze/cancel actions need the correctly-named home.

**Files:**
- Create: `src/features/notifications/notify.ts`
- Create: `src/features/notifications/notify.test.ts`
- Create: `src/features/notifications/queries.ts`
- Create: `src/features/profile/actions.ts`
- Create: `src/features/profile/schemas.ts`
- Modify: `src/features/notifications/actions.ts` (replace contents)
- Modify: `src/features/notifications/schemas.ts` (replace contents)
- Modify: `src/app/(dashboard)/dashboard/member/profile/ProfileForm.tsx` (imports only)
- Delete: nothing

**Interfaces:**
- Consumes: `sendEmail` from `@/lib/email`
- Produces:
  - `notify(userId: string, title: string, body: string): Promise<void>`
  - `getNotifications(userId: string): Promise<{ items: { id: string; title: string; body: string; createdAt: string; read: boolean }[]; unread: number }>`
  - `markNotificationRead(input: { notificationId: string }): Promise<{ ok: true }>`
  - `markAllNotificationsRead(): Promise<{ ok: true }>`
  - `updateProfile(input: { name: string })` — unchanged behaviour, new path `@/features/profile/actions`

- [ ] **Step 1: Write the failing test for notify**

Create `src/features/notifications/notify.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    notification: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { notify } from "./notify";

const mockedCreate = db.notification.create as unknown as Mock;
const mockedFindUser = db.user.findUnique as unknown as Mock;
const mockedSendEmail = sendEmail as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockedCreate.mockResolvedValue({ id: "n1" });
  mockedFindUser.mockResolvedValue({ id: "u1", email: "m@example.com" });
  mockedSendEmail.mockResolvedValue({ id: "e1" });
});

describe("notify", () => {
  it("writes the in-app notification", async () => {
    await notify("u1", "Booked", "You are confirmed.");
    expect(mockedCreate).toHaveBeenCalledWith({
      data: { userId: "u1", title: "Booked", body: "You are confirmed." },
    });
  });

  it("emails the notification to the user", async () => {
    await notify("u1", "Booked", "You are confirmed.");
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "m@example.com", subject: "Booked" })
    );
  });

  it("keeps the in-app notification when email delivery fails", async () => {
    mockedSendEmail.mockRejectedValue(new Error("resend down"));

    await expect(notify("u1", "Booked", "You are confirmed.")).resolves.toBeUndefined();
    expect(mockedCreate).toHaveBeenCalledTimes(1);
  });

  it("still writes the notification when the user has no email on file", async () => {
    mockedFindUser.mockResolvedValue(null);

    await notify("u1", "Booked", "You are confirmed.");
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/notifications/notify.test.ts`
Expected: FAIL — cannot find module `./notify`.

- [ ] **Step 3: Write notify**

Create `src/features/notifications/notify.ts`. This is a plain helper, **not** a `"use server"` action — it is called from actions, never from a client.

```ts
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * The single funnel for member-facing notifications.
 *
 * The in-app row is the source of truth; email is best-effort. A Resend
 * outage must not lose a waitlist promotion, so a failed send is logged and
 * swallowed rather than thrown.
 */
export async function notify(userId: string, title: string, body: string): Promise<void> {
  await db.notification.create({ data: { userId, title, body } });

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await sendEmail({ to: user.email, subject: title, html: `<p>${body}</p>` });
  } catch (err) {
    console.error("[notify] email delivery failed", err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/notifications/notify.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Add the notifications query**

Create `src/features/notifications/queries.ts`:

```ts
import { db } from "@/lib/db";

export async function getNotifications(userId: string) {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    items: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt.toLocaleDateString([], { month: "short", day: "numeric" }),
      read: n.readAt !== null,
    })),
    unread: rows.filter((n) => n.readAt === null).length,
  };
}
```

- [ ] **Step 6: Move updateProfile to its own feature**

Create `src/features/profile/schemas.ts` — this is the existing rule copied verbatim, and the `min(2)` must not change during a move:

```ts
import { z } from "zod";

export const updateProfileSchema = z.object({ name: z.string().min(2) });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

Create `src/features/profile/actions.ts`:

```ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updateProfileSchema, type UpdateProfileInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function updateProfile(rawInput: UpdateProfileInput) {
  const input = updateProfileSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  // Scoped to the caller's own id — a user can only rename themselves.
  await db.user.update({ where: { id: session.user.id }, data: { name: input.name } });
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const };
}
```

`ProfileForm.tsx` imports only the action, so exactly one line changes there — line 3 becomes:

```tsx
import { updateProfile } from "@/features/profile/actions";
```

- [ ] **Step 7: Replace the notifications schemas and actions**

Replace the entire contents of `src/features/notifications/schemas.ts`:

```ts
import { z } from "zod";

export const markNotificationReadSchema = z.object({ notificationId: z.string().min(1) });
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
```

Replace the entire contents of `src/features/notifications/actions.ts`:

```ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { markNotificationReadSchema, type MarkNotificationReadInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(rawInput: MarkNotificationReadInput) {
  const input = markNotificationReadSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  // Role alone is not enough — the notification must belong to the caller,
  // or any signed-in user could clear someone else's bell.
  const notification = await db.notification.findUnique({ where: { id: input.notificationId } });
  if (!notification || notification.userId !== session.user.id) {
    throw new Error("Forbidden: not your notification");
  }

  await db.notification.update({
    where: { id: input.notificationId },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function markAllNotificationsRead() {
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  await db.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true as const };
}
```

- [ ] **Step 8: Write the ownership test for markNotificationRead**

Create `src/features/notifications/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    notification: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedFindUnique = db.notification.findUnique as unknown as Mock;
const mockedUpdate = db.notification.update as unknown as Mock;
const mockedUpdateMany = db.notification.updateMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markNotificationRead", () => {
  it("throws when the notification belongs to another user", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    mockedFindUnique.mockResolvedValue({ id: "n1", userId: "someone-else" });

    await expect(markNotificationRead({ notificationId: "n1" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("throws when there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(markNotificationRead({ notificationId: "n1" })).rejects.toThrow("Unauthorized");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("marks the caller's own notification read", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    mockedFindUnique.mockResolvedValue({ id: "n1", userId: "u1" });

    const result = await markNotificationRead({ notificationId: "n1" });
    expect(result).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe("markAllNotificationsRead", () => {
  it("only clears the caller's unread notifications", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });

    await markAllNotificationsRead();
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { userId: "u1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
```

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS. If `ProfileForm.tsx` still imports from the old path, TypeScript will fail — fix the import, do not restore the old file.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/features/notifications src/features/profile "src/app/(dashboard)/dashboard/member/profile/ProfileForm.tsx"
git commit -m "feat: add notification funnel, queries and read actions

notify() writes the in-app row first and treats email as best-effort, so
a Resend outage cannot swallow a waitlist promotion.

Moves updateProfile out of features/notifications, where it had nothing
to do with notifications, into its own profile feature."
```

---

### Task 5: Notification bell in the Topbar

`Topbar` is called as `<Topbar title="..." />` in 22 pages. Passing notifications down as a prop would mean editing all 22. Instead the role layout (a server component) fetches them and hands them to `DashboardShell`, which publishes them on a context that `Topbar` reads. Three files change; no page file is touched.

The panel is the one genuinely new responsive problem: a narrow popover anchored to the bell overflows a phone viewport. Below `sm` it becomes a full-width sheet pinned under the Topbar with internal scrolling — mirroring how `DashboardShell` already treats the sidebar (drawer on phones, permanent from `md`).

**Files:**
- Create: `src/components/shared/NotificationBell.tsx`
- Modify: `src/components/shared/DashboardShell.tsx`
- Modify: `src/components/shared/Topbar.tsx`
- Modify: `src/app/(dashboard)/dashboard/member/layout.tsx`
- Modify: `src/app/(dashboard)/dashboard/trainer/layout.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/layout.tsx`

**Interfaces:**
- Consumes: `getNotifications(userId)` and both read actions from Task 4
- Produces: `useNotifications(): { items: NotificationItem[]; unread: number }` exported from `DashboardShell`; `type NotificationItem = { id: string; title: string; body: string; createdAt: string; read: boolean }`

- [ ] **Step 1: Publish notifications on the shell context**

In `src/components/shared/DashboardShell.tsx`, keep everything that exists and add a second context beside the sidebar one:

```tsx
export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

type NotificationState = { items: NotificationItem[]; unread: number };

const NotificationContext = createContext<NotificationState>({ items: [], unread: 0 });

export function useNotifications() {
  return useContext(NotificationContext);
}
```

Add `notifications` to the component's props:

```tsx
export function DashboardShell({
  role,
  userName,
  userPlan,
  notifications,
  children,
}: {
  role: Role;
  userName: string;
  userPlan: string;
  notifications: NotificationState;
  children: React.ReactNode;
}) {
```

Wrap the existing `SidebarContext.Provider` in the new provider — the returned JSX becomes:

```tsx
  return (
    <NotificationContext.Provider value={notifications}>
      <SidebarContext.Provider value={{ open, setOpen }}>
        {/* the existing grid, sidebar, drawer and children markup, unchanged */}
      </SidebarContext.Provider>
    </NotificationContext.Provider>
  );
```

- [ ] **Step 2: Build the bell**

Create `src/components/shared/NotificationBell.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "./DashboardShell";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";

export function NotificationBell() {
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // App Router does not re-render a layout on client navigation, and the
  // notifications are fetched in the layout — without an explicit refresh the
  // unread count stays stale after marking anything read.
  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch {
        /* the count simply stays as it was; nothing destructive happened */
      }
    });

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="w-11 h-11 grid place-items-center border border-[var(--line2)] text-[var(--txt)] relative"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          🔔
        </span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 w-2 h-2 bg-[var(--red)]"
          />
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer. Sits below the panel, above the page. */}
          <button
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className="fixed z-50 left-0 right-0 top-16 max-h-[70vh] overflow-y-auto bg-[var(--panel)] border-y border-[var(--line)]
                       sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[360px] sm:border sm:max-h-[420px]"
          >
            <div className="flex items-center gap-3 p-4 border-b border-[var(--line)]">
              <span className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                Notifications
              </span>
              {unread > 0 && (
                <button
                  disabled={isPending}
                  onClick={() => run(() => markAllNotificationsRead())}
                  className="ml-auto text-[11px] uppercase tracking-widest text-[var(--red)] min-h-[44px] px-2"
                >
                  Mark all read
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="p-4 text-[var(--mut)] text-sm">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  disabled={isPending || n.read}
                  onClick={() => run(() => markNotificationRead({ notificationId: n.id }))}
                  className="w-full text-left p-4 border-b border-[var(--line)] last:border-0 min-h-[44px] block"
                >
                  <span className="flex items-center gap-2">
                    {!n.read && <span aria-hidden="true" className="w-1.5 h-1.5 bg-[var(--red)] shrink-0" />}
                    <span className="font-semibold text-sm">{n.title}</span>
                    <span className="ml-auto text-[var(--dim)] text-xs shrink-0">{n.createdAt}</span>
                  </span>
                  <span className="block text-[var(--dim)] text-xs mt-1">{n.body}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount the bell in the Topbar**

In `src/components/shared/Topbar.tsx`, keep the existing hamburger button and title exactly as they are, add the import `import { NotificationBell } from "./NotificationBell";`, and render `<NotificationBell />` as the last child inside the sticky header div. The bell carries `ml-auto`, so it pins right without changing the existing layout.

- [ ] **Step 4: Feed notifications from each role layout**

In all three of `member/layout.tsx`, `trainer/layout.tsx` and `admin/layout.tsx`, add the import:

```tsx
import { getNotifications } from "@/features/notifications/queries";
```

fetch after the session guard, and pass the result through. For the member layout, the membership lookup and the notifications fetch are independent, so run them together:

```tsx
  const [membership, notifications] = await Promise.all([
    db.membership.findFirst({ where: { userId: session.user.id } }),
    getNotifications(session.user.id),
  ]);

  return (
    <DashboardShell
      role="MEMBER"
      userName={session.user.name}
      userPlan={membership?.plan ?? "Member"}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  );
```

Apply the same `notifications={notifications}` prop in the trainer and admin layouts, keeping each one's existing `role` and `userPlan` values.

- [ ] **Step 5: Verify**

Run: `npm test` — Expected: PASS.
Run: `npm run lint` — Expected: no errors.

Run `npm run dev` and sign in. The bell appears on every dashboard page. With no notifications it opens to "Nothing yet." (Real notifications arrive in Task 6; to check the panel now, insert one row by hand with `npx prisma studio`.)

- [ ] **Step 6: Check responsiveness**

At 320px: the panel spans the full width under the Topbar, scrolls internally past ~70vh, and the page behind does not scroll horizontally. The bell is 44×44. At 768px and above: the panel is a 360px popover anchored to the bell's right edge, fully on-screen.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared "src/app/(dashboard)/dashboard/member/layout.tsx" "src/app/(dashboard)/dashboard/trainer/layout.tsx" "src/app/(dashboard)/dashboard/admin/layout.tsx"
git commit -m "feat: add notification bell to the dashboard topbar

Routes notifications through the shell's context rather than a Topbar
prop, so all 22 pages keep their existing <Topbar title=... /> call.

The panel is a full-width sheet below sm and a right-anchored popover
above it — a bell-anchored popover overflows a phone viewport."
```

---

### Task 6: bookClass action

The transaction is not optional. Counting confirmed bookings and inserting the new one must be atomic, or two members clicking the last seat simultaneously both read "1 seat free" and both get confirmed.

`notify()` is called **after** the transaction commits. Sending email inside a transaction would hold it open for the length of a network call.

**Files:**
- Modify: `src/features/bookings/schemas.ts` (append)
- Modify: `src/features/bookings/actions.ts` (append)
- Modify: `src/features/bookings/actions.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `notify(userId, title, body)` from Task 4
- Produces: `bookClass(input: { classId: string }): Promise<{ ok: true; status: "CONFIRMED" | "WAITLIST" }>`

- [ ] **Step 1: Write the failing tests**

The existing `src/features/bookings/actions.test.ts` mocks `db` with only `booking.findUnique` and `booking.update`. Replace its `vi.mock("@/lib/db", ...)` block with the fuller one below, add the `notify` mock, and keep every existing `describe("cancelBooking")` test untouched:

```ts
vi.mock("@/lib/db", () => {
  const tx = {
    class: { findUnique: vi.fn() },
    booking: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  return {
    db: {
      booking: { findUnique: vi.fn(), update: vi.fn() },
      // Hand the callback the same tx object every time so assertions can
      // reach it, and run it inline — there is no real transaction here.
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});
vi.mock("@/features/notifications/notify", () => ({ notify: vi.fn() }));
```

Extend the existing `import { cancelBooking } from "./actions";` to `import { cancelBooking, bookClass } from "./actions";` — a second import statement from the same module trips lint. Then add beside the existing imports:

```ts
import { notify } from "@/features/notifications/notify";

const tx = (db as unknown as { __tx: {
  class: { findUnique: Mock };
  booking: { findUnique: Mock; findFirst: Mock; count: Mock; create: Mock; update: Mock };
} }).__tx;
const mockedNotify = notify as unknown as Mock;
```

Append this describe block:

```ts
describe("bookClass", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    tx.class.findUnique.mockResolvedValue({ id: "c1", title: "Boxing 101", capacity: 2 });
    tx.booking.findFirst.mockResolvedValue(null);
    tx.booking.create.mockResolvedValue({ id: "b9" });
  });

  it("confirms the booking while the class is under capacity", async () => {
    tx.booking.count.mockResolvedValue(1); // capacity 2, one seat left

    const result = await bookClass({ classId: "c1" });

    expect(result).toEqual({ ok: true, status: "CONFIRMED" });
    expect(tx.booking.create).toHaveBeenCalledWith({
      data: { userId: "u1", classId: "c1", status: "CONFIRMED" },
    });
  });

  it("waitlists the booking once the class is full", async () => {
    tx.booking.count.mockResolvedValue(2); // capacity 2, no seats left

    const result = await bookClass({ classId: "c1" });

    expect(result).toEqual({ ok: true, status: "WAITLIST" });
    expect(tx.booking.create).toHaveBeenCalledWith({
      data: { userId: "u1", classId: "c1", status: "WAITLIST" },
    });
  });

  it("rejects a second active booking for the same class", async () => {
    tx.booking.findFirst.mockResolvedValue({ id: "b1", status: "CONFIRMED" });

    await expect(bookClass({ classId: "c1" })).rejects.toThrow("Conflict");
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown class", async () => {
    tx.class.findUnique.mockResolvedValue(null);

    await expect(bookClass({ classId: "nope" })).rejects.toThrow("Not found");
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("throws when there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(bookClass({ classId: "c1" })).rejects.toThrow("Unauthorized");
  });

  it("notifies the member after the transaction commits", async () => {
    tx.booking.count.mockResolvedValue(0);

    await bookClass({ classId: "c1" });

    expect(mockedNotify).toHaveBeenCalledWith("u1", expect.stringContaining("Booked"), expect.any(String));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/bookings/actions.test.ts`
Expected: FAIL — `bookClass` is not exported from `./actions`. The existing `cancelBooking` tests must still pass; if they broke, the `db` mock replacement dropped something they relied on.

- [ ] **Step 3: Add the schema**

Append to `src/features/bookings/schemas.ts`:

```ts
export const bookClassSchema = z.object({ classId: z.string().min(1) });
export type BookClassInput = z.infer<typeof bookClassSchema>;
```

- [ ] **Step 4: Write the action**

Append to `src/features/bookings/actions.ts`, and extend the existing schema import to include `bookClassSchema` and `BookClassInput`:

```ts
import { notify } from "@/features/notifications/notify";

export async function bookClass(rawInput: BookClassInput) {
  const input = bookClassSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);
  const userId = session.user.id;

  // Counting seats and taking one must be atomic. Without the transaction,
  // two members clicking the last seat both read "one free" and both confirm.
  const booked = await db.$transaction(async (tx) => {
    const klass = await tx.class.findUnique({ where: { id: input.classId } });
    if (!klass) throw new Error("Not found: no such class");

    // Only an active booking blocks a rebooking — a member who cancelled
    // is free to book the class again.
    const existing = await tx.booking.findFirst({
      where: { userId, classId: input.classId, status: { in: ["CONFIRMED", "WAITLIST"] } },
    });
    if (existing) throw new Error("Conflict: already booked onto this class");

    const confirmed = await tx.booking.count({
      where: { classId: input.classId, status: "CONFIRMED" },
    });
    const status = confirmed < klass.capacity ? "CONFIRMED" : "WAITLIST";
    await tx.booking.create({ data: { userId, classId: input.classId, status } });

    return { status, title: klass.title };
  });

  // Outside the transaction on purpose: notify sends email, and holding a
  // database transaction open across a network call is how deadlocks start.
  await notify(
    userId,
    booked.status === "CONFIRMED" ? "Booked in" : "Added to the waitlist",
    booked.status === "CONFIRMED"
      ? `Your seat for ${booked.title} is confirmed.`
      : `${booked.title} is full. We'll confirm you automatically if a seat frees up.`
  );

  revalidatePath("/dashboard/member/classes");
  revalidatePath("/dashboard/member/bookings");
  return { ok: true as const, status: booked.status as "CONFIRMED" | "WAITLIST" };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/bookings/actions.test.ts`
Expected: PASS — the three original `cancelBooking` tests plus six new ones.

- [ ] **Step 6: Commit**

```bash
git add src/features/bookings
git commit -m "feat: book a class, with waitlist when full

Seat counting and booking creation run in one transaction; without it two
members clicking the last seat would both be confirmed."
```

---

### Task 7: Auto-promote from the waitlist on cancel

A freed seat should go to the longest-waiting member without anyone intervening. Cancelling a *waitlist* booking promotes nobody — no seat was freed.

`cancelBooking` moves into a transaction, so its existing tests need their mocks rerouted to `tx`. Its ownership guard does not change.

**Files:**
- Modify: `src/features/bookings/actions.ts` (rewrite `cancelBooking`)
- Modify: `src/features/bookings/actions.test.ts` (update the existing describe block, append promotion tests)

**Interfaces:**
- Consumes: `notify` from Task 4; the `tx` mock shape from Task 6
- Produces: `cancelBooking` keeps its signature — `(input: { bookingId: string }) => Promise<{ ok: true }>`

- [ ] **Step 1: Update the existing cancelBooking tests and add promotion tests**

In `src/features/bookings/actions.test.ts`, the three existing `cancelBooking` tests currently drive `mockedFindUnique` / `mockedUpdate` (the top-level `db.booking.*` mocks). Repoint them at `tx.booking.findUnique` and `tx.booking.update`, and give each a `booking.status`. Replace the whole `describe("cancelBooking")` block with:

```ts
describe("cancelBooking", () => {
  beforeEach(() => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    tx.booking.findFirst.mockResolvedValue(null);
  });

  it("throws if the booking belongs to a different user", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "someone-else", status: "CONFIRMED" });

    await expect(cancelBooking({ bookingId: "b1" })).rejects.toThrow("Forbidden");
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("throws if there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(cancelBooking({ bookingId: "b1" })).rejects.toThrow("Unauthorized");
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("cancels the booking when it belongs to the caller", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });

    const result = await cancelBooking({ bookingId: "b1" });

    expect(result).toEqual({ ok: true });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "CANCELLED" },
    });
  });

  it("promotes the oldest waitlisted member into the freed seat", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });
    tx.booking.findFirst.mockResolvedValue({ id: "b2", userId: "u2", classId: "c1", status: "WAITLIST" });

    await cancelBooking({ bookingId: "b1" });

    expect(tx.booking.findFirst).toHaveBeenCalledWith({
      where: { classId: "c1", status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
    });
    expect(tx.booking.update).toHaveBeenCalledWith({
      where: { id: "b2" },
      data: { status: "CONFIRMED" },
    });
    expect(mockedNotify).toHaveBeenCalledWith("u2", expect.stringContaining("seat"), expect.any(String));
  });

  it("promotes nobody when a waitlist booking is cancelled", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b3", userId: "u1", classId: "c1", status: "WAITLIST" });

    await cancelBooking({ bookingId: "b3" });

    // No seat was freed, so the waitlist is never consulted.
    expect(tx.booking.findFirst).not.toHaveBeenCalled();
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it("promotes nobody when the waitlist is empty", async () => {
    tx.booking.findUnique.mockResolvedValue({ id: "b1", userId: "u1", classId: "c1", status: "CONFIRMED" });
    tx.booking.findFirst.mockResolvedValue(null);

    await cancelBooking({ bookingId: "b1" });

    expect(tx.booking.update).toHaveBeenCalledTimes(1); // the cancel itself only
    expect(mockedNotify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/bookings/actions.test.ts`
Expected: FAIL — the current `cancelBooking` calls `db.booking.*` directly, so the `tx` assertions find nothing.

- [ ] **Step 3: Rewrite cancelBooking**

Replace the existing `cancelBooking` in `src/features/bookings/actions.ts`:

```ts
export async function cancelBooking(rawInput: CancelBookingInput) {
  const input = cancelBookingSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  const promoted = await db.$transaction(async (tx) => {
    // Role alone isn't enough here — the booking must also belong to the
    // caller, otherwise any signed-in member could cancel anyone's booking.
    const booking = await tx.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking || booking.userId !== session.user.id) {
      throw new Error("Forbidden: not your booking");
    }

    await tx.booking.update({ where: { id: input.bookingId }, data: { status: "CANCELLED" } });

    // Cancelling a waitlist entry frees no seat, so nobody moves up.
    if (booking.status !== "CONFIRMED") return null;

    const next = await tx.booking.findFirst({
      where: { classId: booking.classId, status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return null;

    await tx.booking.update({ where: { id: next.id }, data: { status: "CONFIRMED" } });
    return next;
  });

  if (promoted) {
    await notify(
      promoted.userId,
      "A seat opened up",
      "You were on the waitlist and your place is now confirmed."
    );
  }

  revalidatePath("/dashboard/member/bookings");
  revalidatePath("/dashboard/member/classes");
  return { ok: true as const };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/bookings/actions.test.ts`
Expected: PASS — six `cancelBooking` tests and six `bookClass` tests.

Run: `npm test`
Expected: PASS across the whole suite.

- [ ] **Step 5: Commit**

```bash
git add src/features/bookings
git commit -m "feat: auto-promote the oldest waitlist entry when a seat frees

Cancelling a confirmed booking hands the seat to the longest-waiting
member in the same transaction. Cancelling a waitlist entry frees no seat
and promotes nobody."
```

---

### Task 8: The classes route

Members can now book, but nothing in the UI lets them. This is the route the overview's "Browse classes" CTA has been pointing at since Task 3.

**Files:**
- Create: `src/app/(dashboard)/dashboard/member/classes/page.tsx`
- Create: `src/app/(dashboard)/dashboard/member/classes/ClassCard.tsx`
- Create: `src/app/(dashboard)/dashboard/member/classes/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/member/classes/error.tsx`
- Modify: `src/features/bookings/queries.ts` (append)
- Modify: `src/lib/dashboard-nav.ts`

**Interfaces:**
- Consumes: `bookClass` from Task 6
- Produces: `getBookableClasses(userId): Promise<BookableClass[]>` where `type BookableClass = { id: string; title: string; discipline: string; coach: string; room: string; day: string; time: string; seatsLeft: number; capacity: number; myStatus: "CONFIRMED" | "WAITLIST" | null }`

- [ ] **Step 1: Add the query**

Append to `src/features/bookings/queries.ts`:

```ts
export async function getBookableClasses(userId: string) {
  const classes = await db.class.findMany({
    where: { startsAt: { gte: new Date() } },
    include: { coach: true, bookings: true },
    orderBy: { startsAt: "asc" },
  });

  return classes.map((c) => {
    const confirmed = c.bookings.filter((b) => b.status === "CONFIRMED").length;
    const mine = c.bookings.find(
      (b) => b.userId === userId && (b.status === "CONFIRMED" || b.status === "WAITLIST")
    );
    return {
      id: c.id,
      title: c.title,
      discipline: c.discipline,
      coach: c.coach.name,
      room: c.room,
      day: c.startsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
      time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      seatsLeft: Math.max(0, c.capacity - confirmed),
      capacity: c.capacity,
      myStatus: (mine?.status ?? null) as "CONFIRMED" | "WAITLIST" | null,
    };
  });
}
```

- [ ] **Step 2: Build the card**

Create `src/app/(dashboard)/dashboard/member/classes/ClassCard.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookClass } from "@/features/bookings/actions";

type Props = {
  id: string;
  title: string;
  discipline: string;
  coach: string;
  room: string;
  day: string;
  time: string;
  seatsLeft: number;
  capacity: number;
  myStatus: "CONFIRMED" | "WAITLIST" | null;
};

export function ClassCard(c: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const full = c.seatsLeft === 0;
  const label = c.myStatus === "CONFIRMED" ? "Booked" : c.myStatus === "WAITLIST" ? "On waitlist" : full ? "Join waitlist" : "Book";

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3">
      <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--red)]">
        {c.discipline}
      </div>
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] leading-[1.05]">
        {c.title}
      </div>
      <div className="text-[var(--dim)] text-xs flex flex-wrap gap-x-3 gap-y-1">
        <span>{c.day}</span>
        <span>{c.time}</span>
        <span>{c.room}</span>
        <span>{c.coach}</span>
      </div>
      <div className="text-xs" style={{ color: full ? "var(--red)" : "var(--mut)" }}>
        {full ? `Full · ${c.capacity} seats` : `${c.seatsLeft} of ${c.capacity} seats left`}
      </div>

      <button
        disabled={isPending || c.myStatus !== null}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await bookClass({ classId: c.id });
              router.refresh();
            } catch {
              setError("Couldn't book that class. Try again.");
            }
          })
        }
        className="mt-auto w-full border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]"
      >
        {isPending ? "Working…" : label}
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

- [ ] **Step 3: Build the page and its states**

Create `src/app/(dashboard)/dashboard/member/classes/page.tsx`:

```tsx
import { requireSession } from "@/lib/rbac";
import { getBookableClasses } from "@/features/bookings/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { ClassCard } from "./ClassCard";

export default async function MemberClassesPage() {
  const session = await requireSession();
  const classes = await getBookableClasses(session.user.id);

  return (
    <>
      <Topbar title="Book a class" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {classes.length === 0 ? (
          <EmptyState body="No upcoming classes on the timetable right now. Check back soon." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <ClassCard key={c.id} {...c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

Create `src/app/(dashboard)/dashboard/member/classes/loading.tsx`:

```tsx
import { TableSkeleton } from "@/components/shared/Skeletons";

export default function Loading() {
  return (
    <div className="p-4 md:p-7">
      <TableSkeleton />
    </div>
  );
}
```

Create `src/app/(dashboard)/dashboard/member/classes/error.tsx`:

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

- [ ] **Step 4: Add the nav entry**

In `src/lib/dashboard-nav.ts`, insert the classes entry into the `MEMBER` array, directly after `overview`:

```ts
  MEMBER: [
    ["overview", "Overview"],
    ["classes", "Book a class"],
    ["workouts", "Workout plan"],
    ["nutrition", "Nutrition"],
    ["bookings", "Bookings"],
    ["payments", "Payments"],
    ["profile", "Profile"],
  ],
```

- [ ] **Step 5: Verify**

Run: `npm test` — Expected: PASS.
Run: `npm run lint` — Expected: no errors.

Run `npm run dev`, sign in as the seeded member, open `http://localhost:3200/dashboard/member/classes`. Book a class: the button becomes "Booked" and the class appears under Bookings. The bell gains an unread notification. Cancel it from Bookings and confirm the seat count on the classes page goes back up.

- [ ] **Step 6: Check responsiveness**

At 320px: one card per row, the meta row wraps instead of overflowing, the book button is full-width and ≥44px, and the page does not scroll horizontally. At 768px: two columns. At 1280px: three.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/dashboard/member/classes" src/features/bookings/queries.ts src/lib/dashboard-nav.ts
git commit -m "feat: add the class booking route

RBAC has granted members 'book classes' since phase 1, but no UI ever
offered it — the overview's CTA led to a list of bookings they already
had."
```

---

### Task 9: computeFreezeAllowance pure function

The 8-week annual cap is real logic and belongs in a tested pure function, not inline in an action.

**Files:**
- Create: `src/features/profile/freeze-allowance.ts`
- Test: `src/features/profile/freeze-allowance.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `MAX_FREEZE_WEEKS_PER_YEAR: number` and `computeFreezeAllowance(freezes: { from: Date; to: Date }[], year: number): { usedWeeks: number; remainingWeeks: number }`

- [ ] **Step 1: Write the failing test**

Create `src/features/profile/freeze-allowance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeFreezeAllowance, MAX_FREEZE_WEEKS_PER_YEAR } from "./freeze-allowance";

const weeks = (from: Date, n: number) => ({
  from,
  to: new Date(from.getTime() + n * 7 * 24 * 60 * 60 * 1000),
});

describe("computeFreezeAllowance", () => {
  it("reports the full allowance when nothing was frozen", () => {
    expect(computeFreezeAllowance([], 2026)).toEqual({
      usedWeeks: 0,
      remainingWeeks: MAX_FREEZE_WEEKS_PER_YEAR,
    });
  });

  it("sums freezes within the year", () => {
    const freezes = [weeks(new Date(2026, 0, 5), 2), weeks(new Date(2026, 5, 1), 3)];
    expect(computeFreezeAllowance(freezes, 2026)).toEqual({ usedWeeks: 5, remainingWeeks: 3 });
  });

  it("ignores freezes from other calendar years", () => {
    const freezes = [weeks(new Date(2025, 0, 5), 6), weeks(new Date(2026, 0, 5), 1)];
    expect(computeFreezeAllowance(freezes, 2026)).toEqual({ usedWeeks: 1, remainingWeeks: 7 });
  });

  it("never reports negative remaining weeks", () => {
    const freezes = [weeks(new Date(2026, 0, 5), 12)];
    expect(computeFreezeAllowance(freezes, 2026)).toEqual({ usedWeeks: 12, remainingWeeks: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/profile/freeze-allowance.test.ts`
Expected: FAIL — cannot find module `./freeze-allowance`.

- [ ] **Step 3: Write the implementation**

Create `src/features/profile/freeze-allowance.ts`:

```ts
/** Handoff §6: a membership may be frozen for at most 8 weeks per year. */
export const MAX_FREEZE_WEEKS_PER_YEAR = 8;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A freeze counts against the calendar year its `from` date falls in, so a
 * freeze spanning New Year is charged wholly to the year it started.
 */
export function computeFreezeAllowance(freezes: { from: Date; to: Date }[], year: number) {
  const usedMs = freezes
    .filter((f) => f.from.getFullYear() === year)
    .reduce((sum, f) => sum + (f.to.getTime() - f.from.getTime()), 0);

  const usedWeeks = Math.round(usedMs / WEEK_MS);
  return {
    usedWeeks,
    remainingWeeks: Math.max(0, MAX_FREEZE_WEEKS_PER_YEAR - usedWeeks),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/profile/freeze-allowance.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/freeze-allowance.ts src/features/profile/freeze-allowance.test.ts
git commit -m "feat: compute the annual membership freeze allowance"
```

---

### Task 10: Freeze and cancel actions

Cancelling does not revoke access immediately — the member has paid through the period. Status stays as it was; `cancelRequestedAt` plus an effective date carry the intent.

**Files:**
- Modify: `src/lib/payments.ts` (append)
- Modify: `src/features/profile/schemas.ts` (append)
- Modify: `src/features/profile/actions.ts` (append)
- Create: `src/features/profile/actions.test.ts`
- Modify: `src/features/memberships/queries.ts` (append)

**Interfaces:**
- Consumes: `computeFreezeAllowance`, `MAX_FREEZE_WEEKS_PER_YEAR` from Task 9; `notify` from Task 4
- Produces:
  - `cancelSubscription(input: { membershipId: string }): Promise<{ id: string }>` in `lib/payments.ts`
  - `freezeMembership(input: { weeks: number }): Promise<{ ok: true; frozenUntil: Date }>`
  - `cancelMembership(): Promise<{ ok: true; effectiveAt: Date }>`
  - `getMembershipStatus(userId): Promise<{ plan: string; status: string; displayStatus: string; frozenUntil: Date | null; cancelEffectiveAt: Date | null; usedWeeks: number; remainingWeeks: number } | null>`

- [ ] **Step 1: Add the Stripe cancel stub**

Append to `src/lib/payments.ts`, matching the shape of the existing `createInvoiceCheckout`:

```ts
/**
 * Real Stripe subscription cancel when STRIPE_SECRET_KEY is set, otherwise a
 * logged stub. Dev leaves the key unset, so the stub path is what runs.
 */
export async function cancelSubscription(input: { membershipId: string }) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("[stub:payments] cancelSubscription", input);
    return { id: `stub-cancel-${crypto.randomUUID()}` };
  }
  throw new Error("cancelSubscription: live Stripe path not implemented yet");
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/profile/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { update: vi.fn() },
    membership: { findFirst: vi.fn(), update: vi.fn() },
    membershipFreeze: { create: vi.fn() },
  },
}));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("@/lib/payments", () => ({ cancelSubscription: vi.fn() }));
vi.mock("@/features/notifications/notify", () => ({ notify: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { cancelSubscription } from "@/lib/payments";
import { freezeMembership, cancelMembership } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedFindMembership = db.membership.findFirst as unknown as Mock;
const mockedUpdateMembership = db.membership.update as unknown as Mock;
const mockedCreateFreeze = db.membershipFreeze.create as unknown as Mock;
const mockedCancelSub = cancelSubscription as unknown as Mock;

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
});

describe("freezeMembership", () => {
  it("throws when the member has no membership", async () => {
    mockedFindMembership.mockResolvedValue(null);

    await expect(freezeMembership({ weeks: 2 })).rejects.toThrow("Not found");
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
  });

  it("freezes when the request fits the remaining allowance", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", freezes: [] });

    const result = await freezeMembership({ weeks: 3 });

    expect(result.ok).toBe(true);
    expect(mockedCreateFreeze).toHaveBeenCalledTimes(1);
    expect(mockedUpdateMembership).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { frozenUntil: expect.any(Date) },
    });
  });

  it("rejects a freeze that exceeds the 8-week annual cap", async () => {
    const thisYear = new Date().getFullYear();
    const from = new Date(thisYear, 0, 5);
    mockedFindMembership.mockResolvedValue({
      id: "m1",
      userId: "u1",
      freezes: [{ from, to: new Date(from.getTime() + 7 * 7 * DAY_MS) }], // 7 weeks used
    });

    await expect(freezeMembership({ weeks: 3 })).rejects.toThrow("Freeze allowance");
    expect(mockedCreateFreeze).not.toHaveBeenCalled();
  });

  it("throws when there is no active session", async () => {
    mockedGetSession.mockResolvedValue(null);

    await expect(freezeMembership({ weeks: 1 })).rejects.toThrow("Unauthorized");
  });
});

describe("cancelMembership", () => {
  it("sets an effective date at least 30 days out", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });

    const result = await cancelMembership();

    const daysOut = (result.effectiveAt.getTime() - Date.now()) / DAY_MS;
    expect(daysOut).toBeGreaterThanOrEqual(29.9);
  });

  it("uses renewsAt when it falls beyond the 30-day notice", async () => {
    const renewsAt = new Date(Date.now() + 90 * DAY_MS);
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt, freezes: [] });

    const result = await cancelMembership();

    expect(result.effectiveAt.getTime()).toBe(renewsAt.getTime());
  });

  it("does not revoke access immediately", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });

    await cancelMembership();

    const data = mockedUpdateMembership.mock.calls[0][0].data;
    expect(data.cancelRequestedAt).toBeInstanceOf(Date);
    expect(data.status).toBeUndefined();
  });

  it("tells the payment provider to cancel", async () => {
    mockedFindMembership.mockResolvedValue({ id: "m1", userId: "u1", renewsAt: null, freezes: [] });

    await cancelMembership();

    expect(mockedCancelSub).toHaveBeenCalledWith({ membershipId: "m1" });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/features/profile/actions.test.ts`
Expected: FAIL — `freezeMembership` and `cancelMembership` are not exported from `./actions`.

- [ ] **Step 4: Add the schemas**

Append to `src/features/profile/schemas.ts`:

```ts
import { MAX_FREEZE_WEEKS_PER_YEAR } from "./freeze-allowance";

export const freezeMembershipSchema = z.object({
  weeks: z.number().int().min(1).max(MAX_FREEZE_WEEKS_PER_YEAR),
});
export type FreezeMembershipInput = z.infer<typeof freezeMembershipSchema>;
```

- [ ] **Step 5: Write the actions**

Append to `src/features/profile/actions.ts`, extending the existing schema import to include `freezeMembershipSchema` and `FreezeMembershipInput`:

```ts
import { computeFreezeAllowance } from "./freeze-allowance";
import { cancelSubscription } from "@/lib/payments";
import { notify } from "@/features/notifications/notify";

const DAY_MS = 24 * 60 * 60 * 1000;
const CANCELLATION_NOTICE_DAYS = 30;

export async function freezeMembership(rawInput: FreezeMembershipInput) {
  const input = freezeMembershipSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { freezes: true },
  });
  if (!membership) throw new Error("Not found: no membership to freeze");

  const { remainingWeeks } = computeFreezeAllowance(membership.freezes, new Date().getFullYear());
  if (input.weeks > remainingWeeks) {
    throw new Error(`Freeze allowance exceeded: ${remainingWeeks} week(s) left this year`);
  }

  const from = new Date();
  const to = new Date(from.getTime() + input.weeks * 7 * DAY_MS);

  await db.membershipFreeze.create({ data: { membershipId: membership.id, from, to } });
  await db.membership.update({ where: { id: membership.id }, data: { frozenUntil: to } });

  await notify(
    session.user.id,
    "Membership frozen",
    `Your membership is frozen until ${to.toLocaleDateString()}.`
  );
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const, frozenUntil: to };
}

export async function cancelMembership() {
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { freezes: true },
  });
  if (!membership) throw new Error("Not found: no membership to cancel");

  // 30 days' notice, or the end of the paid period, whichever is later. The
  // status is deliberately left alone: the member paid through the period and
  // keeps access until it ends.
  const noticeEnd = new Date(Date.now() + CANCELLATION_NOTICE_DAYS * DAY_MS);
  const effectiveAt =
    membership.renewsAt && membership.renewsAt > noticeEnd ? membership.renewsAt : noticeEnd;

  await db.membership.update({
    where: { id: membership.id },
    data: { cancelRequestedAt: new Date() },
  });
  await cancelSubscription({ membershipId: membership.id });

  await notify(
    session.user.id,
    "Cancellation requested",
    `Your membership stays active until ${effectiveAt.toLocaleDateString()}.`
  );
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const, effectiveAt };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/features/profile/actions.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 7: Add the status query**

`FROZEN` is derived here, never stored. Append to `src/features/memberships/queries.ts`:

```ts
import { computeFreezeAllowance } from "@/features/profile/freeze-allowance";

export async function getMembershipStatus(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { freezes: true },
  });
  if (!membership) return null;

  const now = new Date();
  const frozen = membership.frozenUntil !== null && membership.frozenUntil > now;
  const { usedWeeks, remainingWeeks } = computeFreezeAllowance(
    membership.freezes,
    now.getFullYear()
  );

  const DAY = 24 * 60 * 60 * 1000;
  const noticeEnd = membership.cancelRequestedAt
    ? new Date(membership.cancelRequestedAt.getTime() + 30 * DAY)
    : null;
  const cancelEffectiveAt =
    noticeEnd && membership.renewsAt && membership.renewsAt > noticeEnd
      ? membership.renewsAt
      : noticeEnd;

  return {
    plan: membership.plan,
    status: membership.status,
    // Derived, not stored — adding FROZEN to the stored values would mean
    // updating every status colour map and the seed to say what frozenUntil
    // already says.
    displayStatus: frozen ? "FROZEN" : membership.status,
    frozenUntil: frozen ? membership.frozenUntil : null,
    cancelEffectiveAt,
    usedWeeks,
    remainingWeeks,
  };
}
```

- [ ] **Step 8: Run the full suite**

Run: `npm test` — Expected: PASS.
Run: `npm run lint` — Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/payments.ts src/features/profile src/features/memberships/queries.ts
git commit -m "feat: freeze and cancel a membership

Freezing is capped at 8 weeks a year and logged per freeze so the cap is
actually enforceable. Cancelling records the request and an effective date
30 days out but leaves access intact — the period is already paid for.

FROZEN is derived from frozenUntil rather than stored, so no status colour
map or seed row has to learn a new value."
```

---

### Task 11: Freeze and cancel on the profile page

The final surface. The membership card on the profile becomes actionable.

**Files:**
- Create: `src/app/(dashboard)/dashboard/member/profile/MembershipControls.tsx`
- Modify: `src/app/(dashboard)/dashboard/member/profile/page.tsx`

**Interfaces:**
- Consumes: `getMembershipStatus` and both actions from Task 10
- Produces: nothing downstream — this is the last task in the plan

- [ ] **Step 1: Build the controls**

Create `src/app/(dashboard)/dashboard/member/profile/MembershipControls.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { freezeMembership, cancelMembership } from "@/features/profile/actions";

type Props = {
  plan: string;
  displayStatus: string;
  frozenUntil: string | null;
  cancelEffectiveAt: string | null;
  remainingWeeks: number;
};

export function MembershipControls(m: Props) {
  const [weeks, setWeeks] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<unknown>, fallback: string) =>
    startTransition(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch {
        setError(fallback);
      }
    });

  const cancelled = m.cancelEffectiveAt !== null;

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 w-full max-w-[420px] flex flex-col gap-4">
      <div>
        <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
          Plan
        </div>
        <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">
          {m.plan}
        </div>
        <div className="text-[var(--dim)] text-xs mt-1">Status: {m.displayStatus}</div>
        {m.frozenUntil && (
          <div className="text-[var(--dim)] text-xs mt-1">Frozen until {m.frozenUntil}</div>
        )}
        {cancelled && (
          <div className="text-[var(--red)] text-xs mt-1">
            Cancellation requested — active until {m.cancelEffectiveAt}
          </div>
        )}
      </div>

      {!cancelled && (
        <>
          <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4">
            <label
              htmlFor="freeze-weeks"
              className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]"
            >
              Freeze — {m.remainingWeeks} week(s) left this year
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                id="freeze-weeks"
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                disabled={m.remainingWeeks === 0}
                className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] flex-1"
              >
                {Array.from({ length: m.remainingWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    {w} week{w > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <button
                disabled={isPending || m.remainingWeeks === 0}
                onClick={() => run(() => freezeMembership({ weeks }), "Couldn't freeze. Try again.")}
                className="border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]"
              >
                Freeze
              </button>
            </div>
          </div>

          <button
            disabled={isPending}
            onClick={() =>
              run(() => cancelMembership(), "Couldn't request cancellation. Try again.")
            }
            className="border border-[var(--red)] text-[var(--red)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest"
          >
            Cancel membership
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the profile page**

Replace `src/app/(dashboard)/dashboard/member/profile/page.tsx`. The inline membership card is replaced by the new component; `ProfileForm` is untouched:

```tsx
import { requireSession } from "@/lib/rbac";
import { getMembershipStatus } from "@/features/memberships/queries";
import { Topbar } from "@/components/shared/Topbar";
import { ProfileForm } from "./ProfileForm";
import { MembershipControls } from "./MembershipControls";

export default async function MemberProfilePage() {
  const session = await requireSession();
  const membership = await getMembershipStatus(session.user.id);

  return (
    <>
      <Topbar title="Profile & settings" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <ProfileForm initialName={session.user.name} />
        {membership && (
          <MembershipControls
            plan={membership.plan}
            displayStatus={membership.displayStatus}
            frozenUntil={membership.frozenUntil?.toLocaleDateString() ?? null}
            cancelEffectiveAt={membership.cancelEffectiveAt?.toLocaleDateString() ?? null}
            remainingWeeks={membership.remainingWeeks}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm test` — Expected: PASS.
Run: `npm run lint` — Expected: no errors.

Run `npm run dev`, sign in as the seeded member, open `http://localhost:3200/dashboard/member/profile`. Freeze for 2 weeks: the status reads FROZEN, "Frozen until …" appears, and the remaining allowance drops to 6. The bell gains a notification. Then request cancellation: the freeze controls disappear and the card shows an active-until date roughly 30 days out.

- [ ] **Step 4: Check responsiveness**

At 320px: the card fills the width, and the freeze `<select>` and button stack vertically (`flex-col sm:flex-row`) at ≥44px each. At 768px and above: the card caps at 420px and the select/button sit side by side.

- [ ] **Step 5: Final verification of the whole plan**

Run: `npm test` — Expected: PASS, whole suite.
Run: `npm run lint` — Expected: no errors.
Run: `npm run build` — Expected: a clean production build. This is the first build since the notification context was added and will catch any server/client boundary mistake in the layouts.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/dashboard/member/profile"
git commit -m "feat: let members freeze or cancel their membership from the profile"
```

---

## Done When

- A member can browse upcoming classes, book one, and land on the waitlist when it is full
- Cancelling a confirmed booking promotes the longest-waiting member automatically and notifies them
- The Topbar bell shows unread notifications on every dashboard page, for all three roles
- The member overview shows a check-in streak and recent attendance
- A member can freeze (within the 8-week annual cap) or request cancellation, and the profile reflects both
- `npm test`, `npm run lint` and `npm run build` all pass
- Every new surface holds up at 320px, 768px and 1280px with no horizontal page scroll and no sub-44px tap target
