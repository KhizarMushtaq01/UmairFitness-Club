# FIGHT CLUB — Developer Handoff (Claude Code)

Premium gym-management platform. Boxing/MMA focus, luxury urban brand.
The design prototype lives in `Fight Club.dc.html` — treat it as the visual source of truth (all styles are inline; lift values directly).

---

## 1. Brand & Design Tokens

**Logo:** "FC" lettermark — white square with the bottom-right corner cut (`clip-path: polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)`), Bebas Neue glyphs, paired with a 3px red vertical bar + "FIGHT CLUB" wordmark. Inverts cleanly for light theme (dark square, light glyphs).

**Colors (CSS variables, dark / light):**

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#050505` | `#f4f2ef` |
| `--panel` | `#0c0c0c` | `#ffffff` |
| `--card` | `#111111` | `#ffffff` |
| `--line` | `#212121` | `#e3e0da` |
| `--line2` | `#2e2e2e` | `#d3cfc7` |
| `--txt` | `#f5f5f5` | `#0a0a0a` |
| `--mut` | `#9c9c9c` | `#5d5b57` |
| `--dim` | `#5c5c5c` | `#a09d97` |
| `--red` (primary) | `#E50914` | `#D00810` |

**Type system:**
- Display / hero: **Anton**, uppercase, `line-height .92`, `clamp(56px, 7vw, 104px)`
- Headings / numerals: **Bebas Neue**, letter-spacing `.02–.14em`
- Body / UI: **Inter** 400–700; labels are `600 11px`, uppercase, tracking `.16–.34em`
- Zero border-radius everywhere. Sharp corners are the brand.
- Red is used as a scalpel: one accent per composition (kickers, active states, deltas, featured borders).

**Motifs:** 1px hairline grids (`--line`), marquee strip, angular clip-paths on imagery, grayscale coach portraits, red 3px top-borders on featured cards.

## 2. Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Framer Motion · GSAP (hero/marquee only) · Prisma + PostgreSQL · Better Auth · Stripe · UploadThing · Cloudinary · Resend · Zod · React Hook Form · TanStack Query.

## 3. Folder Structure (feature-based)

```
src/
  app/
    (marketing)/            # public — server components, SEO metadata per page
      page.tsx              # home
      about/ classes/ trainers/ pricing/ blog/ blog/[slug]/ contact/
    (auth)/
      login/ signup/ forgot-password/ reset-password/[token]/
    (dashboard)/
      layout.tsx            # sidebar shell + RBAC guard
      member/               # overview, workouts, nutrition, bookings, payments, profile
      trainer/              # overview, clients, clients/[id], schedule, programs
      admin/                # analytics, members, trainers, plans, shop, orders,
                            # content, gallery, settings, roles
    api/
      auth/[...all]/        # Better Auth handler
      webhooks/stripe/
      uploadthing/
  features/                 # one folder per domain
    bookings/ | memberships/ | workouts/ | nutrition/ | payments/
    shop/ | content/ | analytics/ | notifications/
      components/  actions.ts  queries.ts  schemas.ts  types.ts
  components/
    ui/                     # shadcn primitives (restyled: radius 0, tokens above)
    shared/                 # Logo, StatCard, DataTable, EmptyState, ErrorState,
                            # Skeletons, SectionKicker, StatusBadge, ThemeToggle
  lib/                      # auth.ts, db.ts, stripe.ts, resend.ts, utils.ts
  styles/globals.css        # Tailwind v4 @theme with tokens above
```

## 4. Data Model (Prisma sketch)

```
User(id, email, name, role: MEMBER|TRAINER|ADMIN, ...)
Membership(userId, plan: CONTENDER|FIGHTER|CHAMPION, status, stripeSubId, renewsAt, frozenUntil)
Class(id, discipline, title, coachId, room, capacity, startsAt, durationMin)
Booking(userId, classId, status: CONFIRMED|WAITLIST|CANCELLED|ATTENDED)
WorkoutProgram(id, coachId, name, weeks) / WorkoutDay / Exercise(sets, load, tempo)
ProgramAssignment(programId, memberId, startedAt, adherencePct)
NutritionPlan(memberId, coachId, kcal, protein, carbs, fat) / Meal
Invoice(userId, stripeInvoiceId, amount, status, issuedAt)
Product(name, price, stock, category) / Order / OrderItem
Post(title, tag, status: DRAFT|PUBLISHED, views) / GalleryImage(cloudinaryId)
Notification(userId, title, body, readAt)
AttendanceLog(userId, checkedInAt)
```

## 5. RBAC

Single `role` enum on User; permission matrix (see admin → Roles screen in prototype):
- MEMBER: book classes, view own data
- TRAINER: + manage client programs, mark attendance
- ADMIN: + members/billing, plans/pricing, content, roles/settings

Enforce in three layers: middleware route-group guard `(dashboard)/{role}`, per-server-action `assertRole()`, and Prisma row-level scoping (`where: { userId }`) in queries.

## 6. Key Flows

- **Signup → Stripe:** free-week trial (no card) → plan checkout (Stripe Checkout) → webhook activates Membership → Resend welcome email.
- **Booking:** capacity check transactionally; full class → waitlist; auto-promote on cancel (respects member "waitlist auto-book" pref); Resend + in-app notification.
- **Assessments:** every 8 weeks, booked with a coach, feeds member progress charts.
- **Freeze/cancel:** freeze ≤8 wk/yr; cancel = Stripe sub cancel at period end + 30-day notice.

## 7. Page-State Contract (every dashboard route)

Prototype's Ready/Loading/Empty/Error switcher defines all four states:
- **Loading:** shimmer skeletons matching final layout (stat-card row + chart block + table block)
- **Empty:** dashed 1px border box, icon, Bebas headline "Nothing here yet", CTA
- **Error:** red 1px border box, `role="alert"`, retry button
- Implement via `loading.tsx`, `error.tsx`, and per-feature `<EmptyState>`.

## 8. SEO & A11y

- Per-page `generateMetadata` + OpenGraph; JSON-LD `HealthClub` on marketing pages; sitemap + robots.
- Focus rings = 1px red border (see input `:focus` in prototype); `aria-pressed` on toggles, `aria-busy` on skeletons, `role="alert"` on errors; all hit targets ≥44px on mobile.

## 9. Motion

- Hero: GSAP stagger on headline lines (y+opacity, `power4.out`, 80ms stagger).
- Marquee: CSS `translateX(-50%)` loop, 26s linear, duplicate content ×2.
- Cards/tables: Framer Motion `whileHover` background shift only — no scale/lift; the brand is flat and heavy.
- Page transitions: 200ms fade; respect `prefers-reduced-motion`.
