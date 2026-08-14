# Landing Expansion, Motion, and Policy Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the landing page from three sections to twelve with a CSS-3D-and-scroll motion language, expand the footer with social and policy links, and add the four policy pages those links point at.

**Architecture:** Motion is CSS 3D transforms plus GSAP ScrollTrigger — no new dependency, since `gsap@3.15` is already installed and unused and ships ScrollTrigger in the same package. Data fetching stays in server components; two client wrappers (`Reveal`, `TiltCard`) animate what they are handed. Each of the twelve landing sections is its own file under `src/components/marketing/sections/`, composed by the page.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, Prisma 7 + SQLite, GSAP 3 (ScrollTrigger), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-14-landing-expansion-motion-policies-design.md`

## Global Constraints

- Zero border-radius. `* { border-radius: 0 !important }` is in `globals.css` — `rounded-*` classes will not render, do not add them.
- Colors and fonts come only from the CSS variables in `src/app/globals.css`: `--bg --panel --card --line --line2 --txt --mut --dim --red --inv --skel --skel2`, `--font-display --font-heading --font-sans`. No new colors. `text-white` on a red button is established convention and allowed.
- Arbitrary Tailwind values are written `bg-[var(--card)]`, never `bg-(--card)`.
- Mobile-first: `sm:` 640px, `md:` 768px, `lg:` 1024px. Interactive elements reach at least 44px height on mobile.
- **No new runtime dependency may appear in `package.json`.** If a task seems to need one, stop and report.
- **`prefers-reduced-motion: reduce` must leave every section fully visible and legible with no animation.** A reveal that leaves content at `opacity: 0` when motion is reduced is a broken page, not a subtle bug.
- Animate transforms and opacity only — never width, height, top, or left.
- Marketing pages are public. Never call anything from `src/features/memberships/queries.ts` or `src/features/content/queries.ts` — those return emails and draft posts.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npx vitest run` must all pass with zero errors. Baseline is 29 tests.
- Do not touch `Fight Club.dc.html`, `support.js`, or `image-slot.js` — vendored prototype artifacts.

---

## Task 1: Motion primitives

**Files:**
- Create: `src/lib/use-reduced-motion.ts`
- Create: `src/components/marketing/Reveal.tsx`
- Create: `src/components/marketing/TiltCard.tsx`
- Test: `src/lib/use-reduced-motion.test.ts`

**Interfaces:**
- Produces:
  - `prefersReducedMotion(): boolean` — reads the media query, returns `false` when `window` is undefined (SSR)
  - `Reveal({ children, className, y, delay }: { children: React.ReactNode; className?: string; y?: number; delay?: number })` — client component
  - `TiltCard({ children, className, max }: { children: React.ReactNode; className?: string; max?: number })` — client component

**Why the SSR-visible default matters:** both components render their children *visible* in the server HTML and only hide-then-animate once the effect runs on the client. Setting `opacity: 0` in the returned markup would leave the whole page blank for anyone whose JS fails to load. A one-frame flash is the correct trade.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/use-reduced-motion.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion } from "./use-reduced-motion";

const originalMatchMedia = globalThis.window?.matchMedia;

afterEach(() => {
  if (globalThis.window) {
    globalThis.window.matchMedia = originalMatchMedia!;
  }
});

function stubMatchMedia(matches: boolean) {
  globalThis.window = globalThis.window ?? ({} as Window & typeof globalThis);
  globalThis.window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

describe("prefersReducedMotion", () => {
  it("is true when the user asked for reduced motion", () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("is false when the user did not", () => {
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("queries the reduce preference, not some other media string", () => {
    stubMatchMedia(false);
    prefersReducedMotion();
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/use-reduced-motion.test.ts`
Expected: FAIL — `Cannot find module './use-reduced-motion'`.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/use-reduced-motion.ts

/**
 * True when the visitor has asked their OS for less motion.
 *
 * Returns false during SSR, where no media query exists. Callers must still
 * land on the final visual state when this is true — see Reveal.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/use-reduced-motion.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write Reveal**

```tsx
// src/components/marketing/Reveal.tsx
"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion: leave it exactly as the server rendered it — visible.
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Hide here rather than in the returned markup, so a failed JS load
      // leaves the content readable instead of invisible.
      gsap.set(el, { opacity: 0, y, z: -60 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        z: 0,
        duration: 0.7,
        delay,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [y, delay]);

  return (
    <div ref={ref} className={className} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Write TiltCard**

```tsx
// src/components/marketing/TiltCard.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/use-reduced-motion";

export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Pointer-driven tilt is meaningless on touch, and attaching the handlers
    // there burns battery for nothing.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setEnabled(finePointer && !prefersReducedMotion());
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !enabled) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${px * max * 2}deg) rotateX(${-py * max * 2}deg)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={enabled ? onMove : undefined}
      onPointerLeave={enabled ? reset : undefined}
      className={className}
      style={{ transition: "transform 200ms ease-out", willChange: enabled ? "transform" : undefined }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 errors, 32 tests passing (29 baseline + 3 new).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Reveal and TiltCard motion primitives with reduced-motion support"
```

---

## Task 2: Public queries for stats, gallery, and posts

**Files:**
- Modify: `src/features/marketing/queries.ts`
- Modify: `src/features/marketing/queries.test.ts`

**Interfaces:**
- Produces:
  - `getSiteStats(): Promise<{ memberCount: number; classCount: number; coachCount: number }>`
  - `getPublicGallery(): Promise<{ id: string; url: string; caption: string }[]>`
  - `getPublicPosts(): Promise<{ id: string; title: string; tag: string; date: string }[]>`

`getPublicPosts` filters `status: "PUBLISHED"` and returns neither `views` nor `authorId`. The admin `getAllPosts()` in `src/features/content/queries.ts` returns drafts — correctly, it feeds the console where an admin publishes them. A public query missing this filter puts an unpublished draft on the homepage.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/marketing/queries.test.ts`. The existing `vi.mock("@/lib/db", ...)` factory at the top of that file must gain the models these use — add `post: { findMany: vi.fn() }`, `galleryImage: { findMany: vi.fn() }`, `membership: { count: vi.fn() }`, and `class: { count: vi.fn() }` alongside what is already there, keeping the existing entries.

```ts
describe("getPublicPosts", () => {
  it("asks the database for published posts only", async () => {
    (db.post.findMany as unknown as Mock).mockResolvedValue([]);

    await getPublicPosts();

    const arg = (db.post.findMany as unknown as Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ status: "PUBLISHED" });
  });

  it("never returns views or authorId", async () => {
    (db.post.findMany as unknown as Mock).mockResolvedValue([
      {
        id: "p1",
        title: "Inside an 8-week fight camp",
        tag: "Fight camp",
        status: "PUBLISHED",
        views: 4200,
        authorId: "u1",
        createdAt: new Date("2026-07-01T10:00:00"),
      },
    ]);

    const posts = await getPublicPosts();

    expect(Object.keys(posts[0]).sort()).toEqual(["date", "id", "tag", "title"]);
    expect(JSON.stringify(posts)).not.toContain("4200");
    expect(JSON.stringify(posts)).not.toContain("authorId");
  });
});

describe("getPublicGallery", () => {
  it("returns id, url and caption", async () => {
    (db.galleryImage.findMany as unknown as Mock).mockResolvedValue([
      { id: "g1", url: "/uploads/floor.png", caption: "Floor session" },
    ]);

    await expect(getPublicGallery()).resolves.toEqual([
      { id: "g1", url: "/uploads/floor.png", caption: "Floor session" },
    ]);
  });
});

describe("getSiteStats", () => {
  it("counts members and coaches by role, and all classes", async () => {
    // Keyed on the role filter rather than call order — an implementation that
    // counted the wrong role would still pass an order-based mock.
    (db.user.count as unknown as Mock).mockImplementation(
      ({ where }: { where: { role: string } }) =>
        Promise.resolve(where.role === "MEMBER" ? 12 : where.role === "TRAINER" ? 3 : 0)
    );
    (db.class.count as unknown as Mock).mockResolvedValue(7);

    await expect(getSiteStats()).resolves.toEqual({
      memberCount: 12,
      classCount: 7,
      coachCount: 3,
    });
  });
});
```

Add `getPublicPosts`, `getPublicGallery`, `getSiteStats` to the existing import from `./queries`, and add `user: { findMany: vi.fn(), count: vi.fn() }` to the db mock (the file already mocks `user.findMany`; it needs `count` too).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/marketing/queries.test.ts`
Expected: FAIL — the three functions are not exported.

- [ ] **Step 3: Implement the queries**

Append to `src/features/marketing/queries.ts`:

```ts
export async function getSiteStats() {
  const [memberCount, coachCount, classCount] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.user.count({ where: { role: "TRAINER" } }),
    db.class.count(),
  ]);
  return { memberCount, classCount, coachCount };
}

export async function getPublicGallery() {
  const images = await db.galleryImage.findMany();
  return images.map((i) => ({ id: i.id, url: i.url, caption: i.caption }));
}

// PUBLISHED only. The admin getAllPosts() returns drafts on purpose; a public
// query without this filter would put an unpublished draft on the homepage.
export async function getPublicPosts() {
  const posts = await db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    tag: p.tag,
    date: p.createdAt.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/marketing/queries.test.ts`
Expected: PASS — the file's original 3 tests plus 4 new.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add public stats, gallery, and published-posts queries"
```

---

## Task 3: Footer expansion with social and policy links

**Files:**
- Modify: `src/components/marketing/SiteFooter.tsx`
- Create: `src/lib/site-links.ts`

**Interfaces:**
- Produces: `SOCIAL_LINKS`, `POLICY_LINKS`, `NAV_LINKS` from `@/lib/site-links` — each a readonly array of `{ href, label }`.

- [ ] **Step 1: Write the link map**

```ts
// src/lib/site-links.ts

/**
 * Social hrefs are "#" placeholders. The club's real handles are not known
 * here, and guessing URLs would ship dead links. Replace these four values
 * and the footer picks them up — this is the only place to edit.
 */
export const SOCIAL_LINKS = [
  { href: "#", label: "Instagram" },
  { href: "#", label: "Facebook" },
  { href: "#", label: "YouTube" },
  { href: "#", label: "WhatsApp" },
] as const;

export const POLICY_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/cookies", label: "Cookies" },
] as const;

export const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/classes", label: "Classes" },
  { href: "/trainers", label: "Trainers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;
```

- [ ] **Step 2: Rewrite the footer**

```tsx
// src/components/marketing/SiteFooter.tsx
import Link from "next/link";
import { NAV_LINKS, POLICY_LINKS, SOCIAL_LINKS } from "@/lib/site-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] mt-20">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-2">
          <div style={{ fontFamily: "var(--font-heading)" }} className="text-[19px] tracking-[.14em]">
            UMAIR FITNESS CLUB
          </div>
          <p className="text-[var(--dim)] text-xs mt-2 max-w-[280px]">
            Boxing · Muay Thai · Strength — coached, not guessed.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Explore
          </div>
          <div className="flex flex-col mt-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Legal
          </div>
          <div className="flex flex-col mt-3">
            {POLICY_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-6 text-[var(--dim)] text-xs">
          © {new Date().getFullYear()} Umair Fitness Club. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: expand footer with social, policy, and nav columns"
```

---

## Task 4: Policy pages

**Files:**
- Create: `src/components/marketing/PolicyPage.tsx`
- Create: `src/app/(marketing)/privacy/page.tsx`
- Create: `src/app/(marketing)/terms/page.tsx`
- Create: `src/app/(marketing)/refunds/page.tsx`
- Create: `src/app/(marketing)/cookies/page.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode })` — renders the heading, the pending-review banner, and prose styling.

Each page carries a visible banner saying the text is a template pending legal review. That banner is what makes the draft honest; removing it is the owner's decision to make with a lawyer.

- [ ] **Step 1: Write the shared shell**

```tsx
// src/components/marketing/PolicyPage.tsx
export function PolicyPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-[760px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1
        style={{ fontFamily: "var(--font-display)" }}
        className="text-[36px] sm:text-[56px] leading-[0.95]"
      >
        {title}
      </h1>
      <p className="text-[var(--dim)] text-xs mt-3 uppercase tracking-widest">
        Last updated {updated}
      </p>

      <div
        role="note"
        className="border border-[var(--red)] bg-[var(--card)] p-4 mt-8 text-sm text-[var(--mut)]"
      >
        <strong className="text-[var(--txt)]">Template — pending legal review.</strong>{" "}
        This wording is a starting draft, not legal advice. Have a qualified
        solicitor review and amend it for your jurisdiction before relying on
        it, then remove this notice.
      </div>

      <div className="mt-10 flex flex-col gap-6 text-sm text-[var(--mut)]">{children}</div>
    </section>
  );
}
```

Section headings inside each page use this shape, so the four pages stay visually identical:

```tsx
<h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
  Heading text
</h2>
```

- [ ] **Step 2: Write the privacy page**

```tsx
// src/app/(marketing)/privacy/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <PolicyPage title="PRIVACY POLICY" updated="14 August 2026">
      <p>
        This policy explains what personal information Umair Fitness Club
        collects when you use this website or hold a membership, why we collect
        it, and what choices you have.
      </p>

      <H>What we collect</H>
      <p>
        When you create an account we store your name, email address, and a
        hashed form of your password — we never store the password itself. If
        you hold a membership we also store your plan, its status, your class
        bookings, attendance records, and any training or nutrition programme a
        coach assigns you. If you contact us through the enquiry form we keep
        the name, email, and message you send.
      </p>

      <H>Why we collect it</H>
      <p>
        To run your membership: to let you sign in, book and cancel classes,
        show you your programme, and take payment for your plan. Coaches see
        the training data of members assigned to them so they can do their job.
        We do not sell your information, and we do not use it for advertising.
      </p>

      <H>Who can see it</H>
      <p>
        Members see only their own data. Coaches see the members assigned to
        them. Administrators can see membership and billing records because
        those are needed to run the club. Beyond that we share data only with
        the services we use to operate — payment processing, email delivery,
        and image hosting — and only what each needs to perform its function.
      </p>

      <H>How long we keep it</H>
      <p>
        While you hold an account, and for as long afterwards as we are
        required to keep financial records. You may ask us to delete your
        account at any time; we will do so except where we are legally obliged
        to retain a record.
      </p>

      <H>Your rights</H>
      <p>
        You may ask for a copy of the data we hold about you, ask us to correct
        it, or ask us to delete it. Write to us at the address on the contact
        page and we will respond within one month.
      </p>

      <H>Contact</H>
      <p>
        Questions about this policy can go to hello@umairfitness.gym or to the
        address listed on our contact page.
      </p>
    </PolicyPage>
  );
}
```

- [ ] **Step 3: Write the terms page**

```tsx
// src/app/(marketing)/terms/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <PolicyPage title="TERMS OF SERVICE" updated="14 August 2026">
      <p>
        These terms govern your use of the Umair Fitness Club website and your
        membership of the club. By creating an account you agree to them.
      </p>

      <H>Membership</H>
      <p>
        A membership is personal to you and may not be transferred or shared.
        You are responsible for keeping your account password secure and for
        anything done through your account. Tell us immediately if you think
        someone else has access to it.
      </p>

      <H>Using the gym</H>
      <p>
        You agree to follow the instructions of coaches and staff, to use
        equipment as it is intended, and to train within your ability. Combat
        disciplines carry inherent risk of injury; you take part voluntarily
        and accept that risk. Tell us before you start about any medical
        condition or injury that affects your training.
      </p>

      <H>Classes and bookings</H>
      <p>
        Class places are limited and allocated on booking. You may cancel a
        booking through your member dashboard. We may change or cancel a class
        where we need to — for example if a coach is unavailable — and will
        tell you as early as we can.
      </p>

      <H>Payment</H>
      <p>
        Plan fees are payable in advance for each period. If a payment fails we
        may suspend access until it is settled. Prices may change; we will give
        you notice before a change affects your plan.
      </p>

      <H>Conduct</H>
      <p>
        We may suspend or end a membership without refund for behaviour that
        endangers or harasses other members or staff, for damage to equipment,
        or for repeated breach of these terms.
      </p>

      <H>Changes to these terms</H>
      <p>
        We may update these terms. The date at the top shows when they last
        changed, and continued use of your membership after a change means you
        accept the updated version.
      </p>
    </PolicyPage>
  );
}
```

- [ ] **Step 4: Write the refunds page**

```tsx
// src/app/(marketing)/refunds/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function RefundsPage() {
  return (
    <PolicyPage title="REFUNDS & CANCELLATION" updated="14 August 2026">
      <p>
        This page explains how to cancel a membership, when a refund is due,
        and how class cancellations work.
      </p>

      <H>Cancelling a membership</H>
      <p>
        You may cancel at any time. Cancellation takes effect at the end of the
        period you have already paid for, and you keep access until then. We do
        not part-refund an unused portion of a period except in the cases
        below.
      </p>

      <H>When we do refund</H>
      <p>
        In full, if you cancel within fourteen days of first joining and have
        not used the facilities. Pro rata, if we close for an extended period,
        or if a medical condition evidenced by a doctor&apos;s note prevents you
        from training for a month or more.
      </p>

      <H>Freezing instead of cancelling</H>
      <p>
        Any plan can be frozen for up to one month per year at no charge, which
        pauses billing and keeps your place. Ask at the front desk or through
        the contact form.
      </p>

      <H>Classes</H>
      <p>
        Cancel a class booking through your member dashboard and the place
        returns to the pool for other members. If we cancel a class, it does
        not count against any allowance on your plan.
      </p>

      <H>Shop orders</H>
      <p>
        Unopened gear may be returned within fourteen days of delivery for a
        refund of the item price. Supplements cannot be returned once opened,
        for hygiene reasons.
      </p>

      <H>How to ask</H>
      <p>
        Write to hello@umairfitness.gym with your name and what you would like
        cancelled or refunded. We aim to respond within two working days.
      </p>
    </PolicyPage>
  );
}
```

- [ ] **Step 5: Write the cookies page**

```tsx
// src/app/(marketing)/cookies/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function CookiesPage() {
  return (
    <PolicyPage title="COOKIE POLICY" updated="14 August 2026">
      <p>
        A cookie is a small file a website stores in your browser. This page
        lists what this site uses and why.
      </p>

      <H>What we use</H>
      <p>
        One cookie, and it is essential: a session cookie set when you sign in,
        which is how the site knows it is still you as you move between pages.
        It is removed when the session expires or you sign out. Without it you
        could not stay signed in.
      </p>

      <H>What we do not use</H>
      <p>
        We set no advertising cookies, no cross-site trackers, and no
        third-party analytics cookies. Nothing on this site follows you to
        other websites.
      </p>

      <H>Managing cookies</H>
      <p>
        Your browser can block or delete cookies through its settings. Blocking
        the session cookie will prevent you from signing in to a member,
        coach, or admin dashboard, because the site would have no way to
        recognise you between requests.
      </p>

      <H>Changes</H>
      <p>
        If we add a cookie — for example if we introduce analytics — we will
        update this page and, where the law requires it, ask your consent
        first.
      </p>
    </PolicyPage>
  );
}
```

- [ ] **Step 6: Verify all four render and carry the banner**

Run: `npx tsc --noEmit && npm run lint`, then with the dev server on 5173:

```bash
for p in privacy terms refunds cookies; do
  printf "%-9s " "$p"
  curl -s -o /dev/null -w "%{http_code} " "http://localhost:5173/$p"
  curl -s "http://localhost:5173/$p" | grep -c "pending legal review"
done
```
Expected: `200 1` for each.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add privacy, terms, refunds, and cookies pages"
```

---

## Task 5: Landing sections — hero, stats, disciplines

**Files:**
- Create: `src/components/marketing/sections/Hero.tsx`
- Create: `src/components/marketing/sections/StatsBar.tsx`
- Create: `src/components/marketing/sections/Disciplines.tsx`

**Interfaces:**
- Consumes: `Reveal`, `TiltCard` (Task 1); `getSiteStats` return type (Task 2).
- Produces: `Hero()`, `StatsBar({ stats }: { stats: { memberCount: number; classCount: number; coachCount: number } })`, `Disciplines()`.

Sections are server components. They take already-fetched data as props — none of them queries.

- [ ] **Step 1: Write Hero**

```tsx
// src/components/marketing/sections/Hero.tsx
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";

export function Hero() {
  return (
    <section
      className="max-w-[1200px] mx-auto px-4 md:px-7 pt-16 pb-20 md:pt-28 md:pb-28"
      style={{ perspective: "1000px" }}
    >
      <Reveal>
        <p className="text-[10.5px] font-semibold tracking-[.26em] uppercase text-[var(--red)]">
          Karachi · Est. 2026
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <h1
          style={{ fontFamily: "var(--font-display)" }}
          className="text-[48px] sm:text-[72px] lg:text-[96px] leading-[0.95] mt-4"
        >
          TRAIN LIKE
          <br />
          IT MATTERS
        </h1>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="text-[var(--mut)] text-base mt-6 max-w-[520px]">
          Boxing, Muay Thai and strength coaching for people who want a plan,
          not a treadmill. Every member gets a programme, a coach, and a number
          to hit.
        </p>
      </Reveal>
      <Reveal delay={0.3}>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link
            href="/pricing"
            className="min-h-[44px] inline-flex items-center justify-center bg-[var(--red)] text-white px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
          >
            See plans
          </Link>
          <Link
            href="/classes"
            className="min-h-[44px] inline-flex items-center justify-center border border-[var(--line2)] text-[var(--txt)] px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
          >
            Class timetable
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Write StatsBar**

```tsx
// src/components/marketing/sections/StatsBar.tsx
import { Reveal } from "@/components/marketing/Reveal";

export function StatsBar({
  stats,
}: {
  stats: { memberCount: number; classCount: number; coachCount: number };
}) {
  const cells = [
    { label: "Members training", value: String(stats.memberCount) },
    { label: "Classes a week", value: String(stats.classCount) },
    { label: "Coaches on the floor", value: String(stats.coachCount) },
    { label: "Disciplines", value: "3" },
  ];

  return (
    <section className="border-y border-[var(--line)] bg-[var(--panel)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {cells.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.08}>
            <div style={{ fontFamily: "var(--font-heading)" }} className="text-[40px] leading-none">
              {c.value}
            </div>
            <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)] mt-2">
              {c.label}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write Disciplines**

```tsx
// src/components/marketing/sections/Disciplines.tsx
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";

const DISCIPLINES = [
  {
    name: "BOXING",
    blurb: "Footwork, guard, and combinations. Pad work every session, sparring when you are ready — never before.",
    detail: "Ring 1 · 60 min",
  },
  {
    name: "MUAY THAI",
    blurb: "Eight points of contact. Clinch work, knees and elbows, shin conditioning built up over weeks, not days.",
    detail: "Ring 2 · 60 min",
  },
  {
    name: "STRENGTH",
    blurb: "Barbell work on a written block. Squat, press, pull, hinge — loads that move up because they are tracked.",
    detail: "Platform floor · 75 min",
  },
] as const;

export function Disciplines() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-20" style={{ perspective: "1000px" }}>
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          WHAT WE TRAIN
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {DISCIPLINES.map((d, i) => (
          <Reveal key={d.name} delay={i * 0.1}>
            <TiltCard className="bg-[var(--card)] border border-[var(--line)] p-6 h-full">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-[28px]">
                {d.name}
              </div>
              <div className="text-[var(--red)] text-[10.5px] font-semibold tracking-[.18em] uppercase mt-1">
                {d.detail}
              </div>
              <p className="text-[var(--mut)] text-sm mt-4">{d.blurb}</p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors. Nothing renders these yet — Task 8 composes them.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add hero, stats, and disciplines landing sections"
```

---

## Task 6: Landing sections — how it works, coaches, gallery

**Files:**
- Create: `src/components/marketing/sections/HowItWorks.tsx`
- Create: `src/components/marketing/sections/CoachesPreview.tsx`
- Create: `src/components/marketing/sections/GalleryStrip.tsx`

**Interfaces:**
- Consumes: `Reveal`, `TiltCard`; `getPublicTrainers` and `getPublicGallery` return types.
- Produces: `HowItWorks()`, `CoachesPreview({ trainers })`, `GalleryStrip({ images })` where
  `trainers: { id: string; name: string; classCount: number; programCount: number }[]` and
  `images: { id: string; url: string; caption: string }[]`.

- [ ] **Step 1: Write HowItWorks**

```tsx
// src/components/marketing/sections/HowItWorks.tsx
import { Reveal } from "@/components/marketing/Reveal";

const STEPS = [
  ["01", "Assessment", "You come in, we test where you are and what you want. No sales pitch."],
  ["02", "Programme", "A coach writes you a block — sets, loads, tempo, the lot. It is yours, not a template."],
  ["03", "Review", "Adherence gets tracked. The block gets adjusted, not repeated."],
] as const;

export function HowItWorks() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--panel)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-20">
        <Reveal>
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            HOW IT WORKS
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
          {STEPS.map(([n, title, body], i) => (
            <Reveal key={n} delay={i * 0.1}>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-[var(--red)] text-[32px] leading-none">
                {n}
              </div>
              <div className="font-semibold text-sm mt-3">{title}</div>
              <p className="text-[var(--mut)] text-sm mt-2">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write CoachesPreview**

```tsx
// src/components/marketing/sections/CoachesPreview.tsx
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";

export function CoachesPreview({
  trainers,
}: {
  trainers: { id: string; name: string; classCount: number; programCount: number }[];
}) {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-20" style={{ perspective: "1000px" }}>
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            YOUR COACHES
          </h2>
          <Link
            href="/trainers"
            className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
          >
            All coaches →
          </Link>
        </div>
      </Reveal>
      {trainers.length === 0 ? (
        <p className="text-[var(--mut)] text-sm mt-6">Coach profiles going up soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {trainers.slice(0, 3).map((t, i) => (
            <Reveal key={t.id} delay={i * 0.1}>
              <TiltCard className="bg-[var(--card)] border border-[var(--line)] p-6 h-full">
                <div className="w-14 h-14 bg-[var(--red)] text-white grid place-items-center text-lg font-bold">
                  {t.name.split(" ").map((p) => p[0]).join("")}
                </div>
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-4">
                  {t.name}
                </div>
                <div className="text-[var(--mut)] text-xs mt-2">
                  {t.classCount} classes · {t.programCount} programmes
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Write GalleryStrip**

On narrow screens the strip scrolls horizontally inside its own container rather than shrinking images to thumbnails.

```tsx
// src/components/marketing/sections/GalleryStrip.tsx
import Image from "next/image";
import { Reveal } from "@/components/marketing/Reveal";

export function GalleryStrip({
  images,
}: {
  images: { id: string; url: string; caption: string }[];
}) {
  if (images.length === 0) return null;

  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7">
        <Reveal>
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            INSIDE THE GYM
          </h2>
        </Reveal>
      </div>
      <div className="mt-8 overflow-x-auto">
        <div className="flex gap-4 px-4 md:px-7 max-w-[1200px] mx-auto min-w-fit">
          {images.map((img) => (
            <figure key={img.id} className="border border-[var(--line)] shrink-0 w-[260px]">
              <Image
                src={img.url}
                alt={img.caption}
                width={520}
                height={340}
                className="w-full h-[170px] object-cover block"
              />
              <figcaption className="p-3 text-[var(--dim)] text-xs">{img.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add how-it-works, coaches, and gallery landing sections"
```

---

## Task 7: Landing sections — testimonials, posts, FAQ, CTA

**Files:**
- Create: `src/components/marketing/sections/Testimonials.tsx`
- Create: `src/components/marketing/sections/LatestPosts.tsx`
- Create: `src/components/marketing/sections/Faq.tsx`
- Create: `src/components/marketing/sections/FinalCta.tsx`

**Interfaces:**
- Consumes: `Reveal`, `TiltCard`; `getPublicPosts` return type.
- Produces: `Testimonials()`, `LatestPosts({ posts })` where `posts: { id: string; title: string; tag: string; date: string }[]`, `Faq()`, `FinalCta()`.

- [ ] **Step 1: Write Testimonials**

There is no review data. These are placeholders and the constant name says so. Attributions are a first name and a discipline — no surnames, no photos — and **no quote is attributed to a seeded person** (Marcus Reid, Ana Silva, Danny Okafor never appear here). Attributing invented words to a name that exists in the database is the version of this that does real harm.

```tsx
// src/components/marketing/sections/Testimonials.tsx
import { Reveal } from "@/components/marketing/Reveal";

/**
 * PLACEHOLDER COPY — REPLACE BEFORE LAUNCH.
 *
 * The database holds no reviews. These are written examples that exist to
 * show the layout, not real member feedback. Swap them for genuine quotes
 * (with permission) before this site goes public, or delete the section.
 */
const PLACEHOLDER_TESTIMONIALS = [
  {
    quote: "I had trained for years without a plan. Six weeks here and I finally knew what I was working towards.",
    who: "Bilal — Strength",
  },
  {
    quote: "The coaching is the difference. Someone actually watches your form and tells you what to fix.",
    who: "Sana — Muay Thai",
  },
  {
    quote: "Nobody pushed me into sparring. When I did step in, I was ready for it.",
    who: "Hamza — Boxing",
  },
] as const;

export function Testimonials() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--panel)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-20">
        <Reveal>
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            WHAT MEMBERS SAY
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {PLACEHOLDER_TESTIMONIALS.map((t, i) => (
            <Reveal key={t.who} delay={i * 0.1}>
              <blockquote className="bg-[var(--card)] border border-[var(--line)] p-6 h-full flex flex-col">
                <div className="text-[var(--red)] text-[32px] leading-none" style={{ fontFamily: "var(--font-heading)" }}>
                  &ldquo;
                </div>
                <p className="text-[var(--mut)] text-sm flex-1">{t.quote}</p>
                <footer className="text-[var(--dim)] text-xs mt-4 uppercase tracking-widest">{t.who}</footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write LatestPosts**

```tsx
// src/components/marketing/sections/LatestPosts.tsx
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";

export function LatestPosts({
  posts,
}: {
  posts: { id: string; title: string; tag: string; date: string }[];
}) {
  if (posts.length === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-20" style={{ perspective: "1000px" }}>
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          FROM THE GYM FLOOR
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {posts.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <TiltCard className="bg-[var(--card)] border border-[var(--line)] p-6 h-full">
              <div className="text-[var(--red)] text-[10.5px] font-semibold tracking-[.18em] uppercase">
                {p.tag}
              </div>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-3">
                {p.title}
              </div>
              <div className="text-[var(--dim)] text-xs mt-3">{p.date}</div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write Faq**

```tsx
// src/components/marketing/sections/Faq.tsx
import { Reveal } from "@/components/marketing/Reveal";

const FAQS = [
  ["Do I need experience?", "No. Most people who walk in have never thrown a punch. Beginners get taught the basics before anything else."],
  ["What should I bring?", "Training clothes, a water bottle, and a towel. We have gloves and wraps you can borrow for your first few sessions."],
  ["Is there a trial?", "Yes — your first session is free, and you can cancel a new membership within fourteen days if you have not used the gym."],
  ["Will I have to spar?", "Only when you and your coach agree you are ready, and never as a condition of membership."],
  ["Can I freeze my plan?", "Any plan can be frozen for up to one month a year at no charge."],
  ["What are the hours?", "Monday to Saturday 06:00–23:00, Sunday 08:00–20:00."],
] as const;

export function Faq() {
  return (
    <section className="max-w-[760px] mx-auto px-4 md:px-7 py-20">
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          QUESTIONS
        </h2>
      </Reveal>
      <dl className="mt-8">
        {FAQS.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.05}>
            <div className="border-b border-[var(--line)] py-5">
              <dt className="font-semibold text-sm">{q}</dt>
              <dd className="text-[var(--mut)] text-sm mt-2">{a}</dd>
            </div>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Write FinalCta**

```tsx
// src/components/marketing/sections/FinalCta.tsx
import Link from "next/link";
import { Reveal } from "@/components/marketing/Reveal";

export function FinalCta() {
  return (
    <section className="border-t border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-24 text-center">
        <Reveal>
          <h2
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[40px] sm:text-[64px] leading-[0.95]"
          >
            FIRST SESSION
            <br />
            IS ON US
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-[var(--mut)] text-base mt-6 max-w-[420px] mx-auto">
            Come in, get assessed, train once. Decide afterwards.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link
              href="/contact"
              className="min-h-[44px] inline-flex items-center justify-center bg-[var(--red)] text-white px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
            >
              Book your session
            </Link>
            <Link
              href="/pricing"
              className="min-h-[44px] inline-flex items-center justify-center border border-[var(--line2)] text-[var(--txt)] px-6 py-4 font-bold uppercase tracking-widest text-xs no-underline"
            >
              See plans
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add testimonials, posts, FAQ, and final CTA landing sections"
```

---

## Task 8: Compose the landing page

**Files:**
- Modify: `src/app/(marketing)/page.tsx`

**Interfaces:**
- Consumes: all nine section components from Tasks 5-7, plus the two that stay inline; `getPublicClasses`, `getPublicPlans`, `getPublicTrainers`, `getSiteStats`, `getPublicGallery`, `getPublicPosts`.

The existing "next sessions" and "membership" blocks move out of the page body into `NextSessions.tsx` and `Membership.tsx` alongside the others, so the page is composition only. Keep their existing markup — this is a move, not a rewrite — and wrap each in `<Reveal>` for consistency with its neighbours.

- [ ] **Step 1: Extract the two existing sections**

This is a **move, not a rewrite.** Open `src/app/(marketing)/page.tsx` and lift the two existing `<section>` blocks — the one headed `NEXT SESSIONS` and the one headed `MEMBERSHIP` — into new files verbatim. Do not restyle them, do not change their class strings, and keep `NextSessions`' existing `classes.length === 0` empty-state branch exactly as it is. The only additions are the `<Reveal>` wrappers described below.

Create `src/components/marketing/sections/NextSessions.tsx` with:

```ts
export function NextSessions({
  classes,
}: {
  classes: {
    id: string;
    discipline: string;
    title: string;
    room: string;
    day: string;
    time: string;
    durationMin: number;
    coachName: string;
    spotsLeft: number;
  }[];
})
```

and `src/components/marketing/sections/Membership.tsx` with:

```ts
export function Membership({ plans }: { plans: { plan: string; price: string }[] })
```

The `classes` shape must match `getPublicClasses`'s full return type — including `durationMin`, which this section does not render but the type carries.

In each, wrap the `<h2>` in a `<Reveal>`, and wrap each card in the grid in a `<Reveal delay={i * 0.1}>`, matching how `Disciplines` in Task 5 does it. Add the `style={{ perspective: "1000px" }}` to the section element only if you also wrap its cards in `TiltCard`; these two sections do not, so leave perspective off.

- [ ] **Step 2: Rewrite the page as composition**

```tsx
// src/app/(marketing)/page.tsx
import {
  getPublicClasses,
  getPublicGallery,
  getPublicPlans,
  getPublicPosts,
  getPublicTrainers,
  getSiteStats,
} from "@/features/marketing/queries";
import { Hero } from "@/components/marketing/sections/Hero";
import { StatsBar } from "@/components/marketing/sections/StatsBar";
import { Disciplines } from "@/components/marketing/sections/Disciplines";
import { NextSessions } from "@/components/marketing/sections/NextSessions";
import { HowItWorks } from "@/components/marketing/sections/HowItWorks";
import { CoachesPreview } from "@/components/marketing/sections/CoachesPreview";
import { GalleryStrip } from "@/components/marketing/sections/GalleryStrip";
import { Membership } from "@/components/marketing/sections/Membership";
import { Testimonials } from "@/components/marketing/sections/Testimonials";
import { LatestPosts } from "@/components/marketing/sections/LatestPosts";
import { Faq } from "@/components/marketing/sections/Faq";
import { FinalCta } from "@/components/marketing/sections/FinalCta";

// Reads live data, so it must not be statically prerendered — an admin's
// change has to reach the public site without a redeploy.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [classes, plans, trainers, stats, images, posts] = await Promise.all([
    getPublicClasses(),
    getPublicPlans(),
    getPublicTrainers(),
    getSiteStats(),
    getPublicGallery(),
    getPublicPosts(),
  ]);

  return (
    <>
      <Hero />
      <StatsBar stats={stats} />
      <Disciplines />
      <NextSessions classes={classes} />
      <HowItWorks />
      <CoachesPreview trainers={trainers} />
      <GalleryStrip images={images} />
      <Membership plans={plans} />
      <Testimonials />
      <LatestPosts posts={posts} />
      <Faq />
      <FinalCta />
    </>
  );
}
```

- [ ] **Step 3: Verify the page renders all twelve sections with real data**

Run the gate first: `npx tsc --noEmit && npm run lint && npx vitest run`

Then with the dev server on 5173:

```bash
curl -s http://localhost:5173/ | grep -oE "TRAIN LIKE|Members training|WHAT WE TRAIN|NEXT SESSIONS|HOW IT WORKS|YOUR COACHES|INSIDE THE GYM|MEMBERSHIP|WHAT MEMBERS SAY|FROM THE GYM FLOOR|QUESTIONS|FIRST SESSION" | sort -u | wc -l
```
Expected: `12`.

Confirm no draft post leaked:

```bash
curl -s http://localhost:5173/ | grep -c "Making weight without losing your mind"
```
Expected: `0` — that seeded post is a DRAFT.

- [ ] **Step 4: Confirm the page is still dynamic, not prerendered**

Stop the dev server, then run `npm run build`. Expected: `/` is listed with the `ƒ (Dynamic)` badge, and the four new policy routes appear as `○ (Static)` since they read no data.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: compose the landing page from twelve sections"
```

---

## Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit && npm run lint && npm run build && npx vitest run
```
Expected: zero errors; **36 tests** (29 baseline + 3 reduced-motion + 4 query); build lists `/` as `ƒ` and `/privacy`, `/terms`, `/refunds`, `/cookies` as `○`.

- [ ] **Step 2: Confirm no new dependency**

```bash
git diff master --stat -- package.json
```
Expected: no change to `dependencies` or `devDependencies`.

- [ ] **Step 3: Confirm no private data on any public page**

```bash
for p in "" about classes trainers pricing contact privacy terms refunds cookies; do
  printf "%-10s emails=" "/$p"
  curl -s "http://localhost:5173/$p" | grep -oE "[a-zA-Z0-9._%+-]+@umairfitness\.gym" | grep -v "^hello@" | wc -l
done
```
Expected: `0` for every page.

```bash
curl -s http://localhost:5173/ | grep -cE "authorId|\"views\""
```
Expected: `0`.

- [ ] **Step 4: Confirm all four policy pages carry the review banner**

```bash
for p in privacy terms refunds cookies; do
  printf "%-9s " "$p"
  curl -s "http://localhost:5173/$p" | grep -c "pending legal review"
done
```
Expected: `1` for each.

- [ ] **Step 5: Confirm the dashboard is unaffected**

Sign in as each seeded role and confirm the redirect matrix and all 21 dashboard routes still behave as before. This phase touched no dashboard code, so any change here is a regression.

- [ ] **Step 6: Manual check (human reviewer)**

Static assertions cannot judge motion. A person must confirm:

- With OS reduced-motion **off**: sections reveal on scroll, cards tilt under a mouse, nothing janks
- With OS reduced-motion **on**: every section is fully visible and legible, nothing animates, nothing is stuck invisible
- At 375 / 768 / 1280px: no horizontal page scroll; the gallery strip scrolls inside itself on narrow screens
- On a touch device: no tilt handlers firing, no stuck transforms

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "chore: final verification pass for landing expansion and policy pages"
```
