# Fight Club — Foundation + Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the real Fight Club Next.js app (auth + RBAC + all member/trainer/admin dashboard routes) on top of the existing design prototype, with zero TypeScript/build/lint errors.

**Architecture:** Next.js 15 App Router project at the repo root, `(auth)` + `(dashboard)` route groups, Prisma+SQLite for data, Better Auth for sessions, feature folders (`bookings/`, `memberships/`, `workouts/`, `nutrition/`, `payments/`, `shop/`, `content/`, `analytics/`, `notifications/`) each owning their `queries.ts`/`actions.ts`/`schemas.ts`/`types.ts`, server components fetching data and handing it to presentational components, third-party services (Stripe/UploadThing/Cloudinary/Resend) behind stub adapters selected by env-var presence.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, Framer Motion, Prisma (SQLite), Better Auth, Zod, React Hook Form, TanStack Query, Vitest (unit tests).

## Global Constraints

- Node.js ≥ 18.18 (repo has v22.13 available)
- Zero border-radius on all UI primitives; colors/fonts exactly as in `docs/superpowers/specs/2026-08-07-dashboard-foundation-design.md` → Design Tokens
- No Prisma `enum` fields (SQLite doesn't support them) — use `String` + Zod literal unions + `as const` tuples
- Every mutating server action starts with `assertRole(session, allowedRoles)` before any DB write
- Member/trainer queries filter `where: { userId }` / `where: { coachId }`; only admin queries are unscoped
- Every dashboard route ships `loading.tsx`, `error.tsx`, and renders `<EmptyState>` on empty results
- `tsc --noEmit`, `next build`, and `next lint` must all pass with zero errors before any task is considered done
- Marketing pages, live Stripe/UploadThing/Cloudinary/Resend, SEO/JSON-LD are out of scope (later phase)

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (temporary placeholder root page — replaced by marketing phase later)

**Interfaces:**
- Produces: a runnable `npm run dev` Next.js 15 + TS + Tailwind v4 project at repo root

- [ ] **Step 1: Initialize git** (repo currently has no `.git`)

```bash
git init
```

- [ ] **Step 2: Scaffold with create-next-app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --yes
```

- [ ] **Step 3: Add remaining core dependencies**

```bash
npm install @prisma/client better-auth zod react-hook-form @hookform/resolvers @tanstack/react-query framer-motion gsap stripe uploadthing @uploadthing/react cloudinary resend
npm install -D prisma vitest @vitejs/plugin-react tsx
```

- [ ] **Step 4: Add shadcn/ui**

```bash
npx shadcn@latest init -d
```

- [ ] **Step 5: Write `.env.example` and `.env`**

```bash
# .env.example
DATABASE_URL="file:./dev.db"
BETTER_AUTH_SECRET="replace-with-openssl-rand--base64-32"
BETTER_AUTH_URL="http://localhost:3000"
# Optional — leave unset in dev to use stub adapters
STRIPE_SECRET_KEY=
UPLOADTHING_TOKEN=
CLOUDINARY_URL=
RESEND_API_KEY=
```

Copy `.env.example` to `.env` and generate a real secret:

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Paste the printed value in as `BETTER_AUTH_SECRET` in `.env`.

- [ ] **Step 6: Verify the scaffold builds**

Run: `npm run build`
Expected: build succeeds with the default Next.js starter page.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with core dependencies"
```

---

## Task 2: Port design tokens into Tailwind v4 theme

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/shared/Logo.tsx`

**Interfaces:**
- Produces: CSS variables `--bg --panel --card --line --line2 --txt --mut --dim --red --inv --skel --skel2` for both `[data-theme="dark"]` and `[data-theme="light"]`, and a `Logo` component

- [ ] **Step 1: Replace `globals.css` theme block**

```css
@import "tailwindcss";

@theme {
  --font-display: "Anton", sans-serif;
  --font-heading: "Bebas Neue", sans-serif;
  --font-sans: "Inter", sans-serif;
  --radius: 0px;
}

:root, [data-theme="dark"] {
  --bg:#050505; --panel:#0c0c0c; --card:#111111; --line:#212121; --line2:#2e2e2e;
  --txt:#f5f5f5; --mut:#9c9c9c; --dim:#5c5c5c; --red:#E50914; --inv:#050505;
  --skel:#1a1a1a; --skel2:#262626;
}
[data-theme="light"] {
  --bg:#f4f2ef; --panel:#ffffff; --card:#ffffff; --line:#e3e0da; --line2:#d3cfc7;
  --txt:#0a0a0a; --mut:#5d5b57; --dim:#a09d97; --red:#D00810; --inv:#ffffff;
  --skel:#e7e4df; --skel2:#dbd7d0;
}

html, body { background: var(--bg); color: var(--txt); }
* { box-sizing: border-box; border-radius: 0 !important; }
```

- [ ] **Step 2: Add Google Fonts to root layout**

Edit `src/app/layout.tsx` `<head>` (or use `next/font/google` — prefer `next/font` since it self-hosts and avoids layout shift):

```tsx
import { Anton, Bebas_Neue, Inter } from "next/font/google";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${anton.variable} ${bebas.variable} ${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create the shared Logo component**

```tsx
// src/components/shared/Logo.tsx
export function Logo() {
  return (
    <div className="flex items-center gap-[11px]">
      <div
        className="w-8 h-8 bg-[var(--txt)] text-[var(--inv)] grid place-items-center font-[var(--font-heading)] text-[17px]"
        style={{ clipPath: "polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)" }}
      >
        FC
      </div>
      <div className="font-[var(--font-heading)] text-[19px] tracking-[.14em]">
        FIGHT CLUB
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds, no CSS errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: port Fight Club design tokens into Tailwind v4 theme"
```

---

## Task 3: Prisma schema + SQLite datasource

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

**Interfaces:**
- Produces: `db` (PrismaClient singleton) exported from `src/lib/db.ts`, and all models listed in the spec's Data Model section

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  role          String   @default("MEMBER") // MEMBER | TRAINER | ADMIN
  emailVerified Boolean  @default(false)
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  sessions      Session[]
  accounts      Account[]
  memberships   Membership[]
  bookings      Booking[]
  coachClasses  Class[]              @relation("ClassCoach")
  coachPrograms WorkoutProgram[]     @relation("ProgramCoach")
  assignments   ProgramAssignment[]  @relation("MemberAssignments")
  nutritionAsMember NutritionPlan[]  @relation("NutritionMember")
  nutritionAsCoach  NutritionPlan[]  @relation("NutritionCoach")
  invoices      Invoice[]
  orders        Order[]
  posts         Post[]
  notifications Notification[]
  attendance    AttendanceLog[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  password              String?
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
}

model Membership {
  id          String    @id @default(cuid())
  userId      String
  plan        String    // CONTENDER | FIGHTER | CHAMPION
  status      String    // ACTIVE | TRIAL | AT_RISK | CANCELLED
  renewsAt    DateTime?
  frozenUntil DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Class {
  id          String   @id @default(cuid())
  discipline  String
  title       String
  coachId     String
  room        String
  capacity    Int
  startsAt    DateTime
  durationMin Int
  coach       User     @relation("ClassCoach", fields: [coachId], references: [id])
  bookings    Booking[]
}

model Booking {
  id        String   @id @default(cuid())
  userId    String
  classId   String
  status    String   // CONFIRMED | WAITLIST | CANCELLED | ATTENDED
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
}

model WorkoutProgram {
  id          String   @id @default(cuid())
  coachId     String
  name        String
  weeks       Int
  coach       User     @relation("ProgramCoach", fields: [coachId], references: [id])
  days        WorkoutDay[]
  assignments ProgramAssignment[]
}

model WorkoutDay {
  id        String   @id @default(cuid())
  programId String
  dayIndex  Int
  focus     String
  program   WorkoutProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  exercises Exercise[]
}

model Exercise {
  id           String     @id @default(cuid())
  workoutDayId String
  name         String
  sets         String
  load         String
  tempo        String
  workoutDay   WorkoutDay @relation(fields: [workoutDayId], references: [id], onDelete: Cascade)
}

model ProgramAssignment {
  id            String   @id @default(cuid())
  programId     String
  memberId      String
  startedAt     DateTime @default(now())
  adherencePct  Int
  program       WorkoutProgram @relation(fields: [programId], references: [id], onDelete: Cascade)
  member        User           @relation("MemberAssignments", fields: [memberId], references: [id], onDelete: Cascade)
}

model NutritionPlan {
  id       String @id @default(cuid())
  memberId String
  coachId  String
  kcal     Int
  protein  Int
  carbs    Int
  fat      Int
  member   User   @relation("NutritionMember", fields: [memberId], references: [id], onDelete: Cascade)
  coach    User   @relation("NutritionCoach", fields: [coachId], references: [id])
  meals    Meal[]
}

model Meal {
  id              String        @id @default(cuid())
  nutritionPlanId String
  time            String
  name            String
  detail          String
  kcal            Int
  plan            NutritionPlan @relation(fields: [nutritionPlanId], references: [id], onDelete: Cascade)
}

model Invoice {
  id       String   @id @default(cuid())
  userId   String
  desc     String
  amount   Int      // cents
  status   String   // PAID | REFUNDED | DUE
  issuedAt DateTime @default(now())
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Product {
  id       String @id @default(cuid())
  name     String
  price    Int    // cents
  stock    Int
  category String
  orderItems OrderItem[]
}

model Order {
  id        String      @id @default(cuid())
  userId    String
  status    String      // PACKING | SHIPPED | DELIVERED
  createdAt DateTime    @default(now())
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     OrderItem[]
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  qty       Int
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])
}

model Post {
  id        String   @id @default(cuid())
  title     String
  tag       String
  status    String   // DRAFT | PUBLISHED
  views     Int      @default(0)
  authorId  String
  createdAt DateTime @default(now())
  author    User     @relation(fields: [authorId], references: [id])
}

model GalleryImage {
  id      String @id @default(cuid())
  url     String
  caption String
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  title     String
  body      String
  readAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AttendanceLog {
  id          String   @id @default(cuid())
  userId      String
  checkedInAt DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Write the Prisma client singleton**

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 3: Generate client and push schema**

```bash
npx prisma generate
npx prisma db push
```
Expected: `dev.db` created, no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and SQLite datasource"
```

---

## Task 4: Seed script with prototype-matching demo data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `"prisma": { "seed": "tsx prisma/seed.ts" }`)

**Interfaces:**
- Consumes: `db` from `src/lib/db.ts`, all Prisma models from Task 3
- Produces: seeded DB with 1 admin (Danny Okafor), 1 trainer (Ana Silva), 1 member (Marcus Reid) plus supporting rows, matching the prototype's mock data so dashboards look identical to the reference design

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import { db } from "../src/lib/db";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const pw = await hashPassword("password123");

  const admin = await db.user.create({
    data: { email: "danny@fightclub.gym", name: "Danny Okafor", role: "ADMIN", emailVerified: true,
      accounts: { create: { providerId: "credential", accountId: "danny@fightclub.gym", password: pw } } },
  });
  const trainer = await db.user.create({
    data: { email: "ana@fightclub.gym", name: "Ana Silva", role: "TRAINER", emailVerified: true,
      accounts: { create: { providerId: "credential", accountId: "ana@fightclub.gym", password: pw } } },
  });
  const member = await db.user.create({
    data: { email: "marcus@fightclub.gym", name: "Marcus Reid", role: "MEMBER", emailVerified: true,
      accounts: { create: { providerId: "credential", accountId: "marcus@fightclub.gym", password: pw } } },
  });

  await db.membership.create({
    data: { userId: member.id, plan: "FIGHTER", status: "ACTIVE", renewsAt: new Date("2026-09-01") },
  });

  const boxingClass = await db.class.create({
    data: { discipline: "Boxing", title: "Boxing — Advanced", coachId: trainer.id, room: "Ring 1",
      capacity: 16, startsAt: new Date("2026-08-08T18:30:00"), durationMin: 60 },
  });
  const muayThai = await db.class.create({
    data: { discipline: "Muay Thai", title: "Muay Thai", coachId: trainer.id, room: "Ring 2",
      capacity: 14, startsAt: new Date("2026-08-08T12:15:00"), durationMin: 60 },
  });

  await db.booking.createMany({
    data: [
      { userId: member.id, classId: boxingClass.id, status: "CONFIRMED" },
      { userId: member.id, classId: muayThai.id, status: "CONFIRMED" },
    ],
  });

  const program = await db.workoutProgram.create({
    data: {
      coachId: trainer.id, name: "STRENGTH BLOCK C", weeks: 8,
      days: {
        create: [
          { dayIndex: 1, focus: "Max strength", exercises: { create: [
            { name: "Back squat", sets: "5 × 3", load: "142.5 kg", tempo: "31X1" },
            { name: "Romanian deadlift", sets: "4 × 6", load: "110 kg", tempo: "3010" },
          ] } },
          { dayIndex: 2, focus: "Power + pull", exercises: { create: [
            { name: "Bench press", sets: "5 × 3", load: "102.5 kg", tempo: "21X1" },
            { name: "Weighted pull-up", sets: "4 × 5", load: "+20 kg", tempo: "2011" },
          ] } },
        ],
      },
    },
  });
  await db.programAssignment.create({
    data: { programId: program.id, memberId: member.id, adherencePct: 92 },
  });

  const nutrition = await db.nutritionPlan.create({
    data: { memberId: member.id, coachId: trainer.id, kcal: 2450, protein: 190, carbs: 260, fat: 75,
      meals: { create: [
        { time: "07:30", name: "Breakfast", detail: "Oats, whey, blueberries, almonds", kcal: 580 },
        { time: "12:30", name: "Lunch", detail: "Chicken thigh, jasmine rice, greens", kcal: 640 },
      ] } },
  });
  void nutrition;

  await db.invoice.createMany({
    data: [
      { userId: member.id, desc: "Fighter plan — July", amount: 14900, status: "PAID", issuedAt: new Date("2026-07-01") },
      { userId: member.id, desc: "Fight Club wraps + gloves", amount: 16400, status: "REFUNDED", issuedAt: new Date("2026-04-22") },
    ],
  });

  const gloves = await db.product.create({ data: { name: "FC Pro leather gloves — 14oz", price: 12000, stock: 34, category: "Gear" } });
  await db.product.createMany({
    data: [
      { name: "Competition hand wraps 4.5m", price: 1800, stock: 210, category: "Gear" },
      { name: "Isolate whey — 2kg", price: 6800, stock: 48, category: "Supps" },
    ],
  });
  const order = await db.order.create({ data: { userId: member.id, status: "SHIPPED" } });
  await db.orderItem.create({ data: { orderId: order.id, productId: gloves.id, qty: 1 } });

  await db.post.createMany({
    data: [
      { title: "Inside an 8-week fight camp", tag: "Fight camp", status: "PUBLISHED", views: 4200, authorId: admin.id },
      { title: "Making weight without losing your mind", tag: "Nutrition", status: "DRAFT", views: 0, authorId: admin.id },
    ],
  });

  await db.galleryImage.createMany({
    data: [
      { url: "/uploads/pasted-1783022551988-0.png", caption: "Floor session" },
    ],
  });

  await db.notification.create({
    data: { userId: member.id, title: "Sparring Lab approval", body: "Coach Silva approved you for technical sparring." },
  });

  await db.attendanceLog.create({ data: { userId: member.id } });

  console.log("Seed complete:", { admin: admin.email, trainer: trainer.email, member: member.email });
}

main().finally(() => db.$disconnect());
```

- [ ] **Step 2: Register the seed command in `package.json`**

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run the seed**

Run: `npx prisma db seed`
Expected: prints `Seed complete: { admin: 'danny@fightclub.gym', trainer: 'ana@fightclub.gym', member: 'marcus@fightclub.gym' }`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add seed script with prototype-matching demo data"
```

---

## Task 5: Better Auth setup

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`
- Create: `src/lib/auth-client.ts`

**Interfaces:**
- Produces: `auth` (Better Auth server instance) from `src/lib/auth.ts`, `authClient` from `src/lib/auth-client.ts` with `.signIn`, `.signUp`, `.signOut`, `.useSession`

- [ ] **Step 1: Write the Better Auth server config**

```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "MEMBER", input: false },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
```

- [ ] **Step 2: Write the API route handler**

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: Write the client instance**

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
});
```

Add `NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"` to `.env` and `.env.example`.

- [ ] **Step 4: Regenerate Prisma client and push schema (Better Auth may add fields)**

Run: `npx prisma generate && npx prisma db push`
Expected: no schema drift errors.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: configure Better Auth with email/password and role field"
```

---

## Task 6: RBAC helper + unit tests

**Files:**
- Create: `src/lib/rbac.ts`
- Test: `src/lib/rbac.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `assertRole(session, allowedRoles: Role[]): asserts session is { user: { role: Role } }`, `getSession(): Promise<Session | null>`, `type Role = "MEMBER" | "TRAINER" | "ADMIN"`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node" },
});
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/rbac.test.ts
import { describe, it, expect } from "vitest";
import { assertRole, type Role } from "./rbac";

function makeSession(role: Role) {
  return { user: { id: "u1", role } } as const;
}

describe("assertRole", () => {
  it("passes when the user's role is in the allowed list", () => {
    expect(() => assertRole(makeSession("ADMIN"), ["ADMIN", "TRAINER"])).not.toThrow();
  });

  it("throws when the user's role is not in the allowed list", () => {
    expect(() => assertRole(makeSession("MEMBER"), ["ADMIN", "TRAINER"])).toThrow(
      "Forbidden: requires role ADMIN or TRAINER"
    );
  });

  it("throws when session is null", () => {
    expect(() => assertRole(null, ["ADMIN"])).toThrow("Unauthorized");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: FAIL — `./rbac` has no exported member `assertRole`.

- [ ] **Step 4: Implement `src/lib/rbac.ts`**

```ts
import { headers } from "next/headers";
import { auth } from "./auth";

export type Role = "MEMBER" | "TRAINER" | "ADMIN";

type SessionLike = { user: { id: string; role: Role } } | null;

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export function assertRole(session: SessionLike, allowed: Role[]): asserts session is { user: { id: string; role: Role } } {
  if (!session) throw new Error("Unauthorized: no active session");
  if (!allowed.includes(session.user.role)) {
    throw new Error(`Forbidden: requires role ${allowed.join(" or ")}`);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/rbac.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add RBAC assertRole helper with unit tests"
```

---

## Task 7: Login and signup pages

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/features/auth/schemas.ts`

**Interfaces:**
- Consumes: `authClient` from Task 5
- Produces: working login/signup forms that redirect to `/{role}` on success (root dashboard router resolves the exact segment in Task 9)

- [ ] **Step 1: Write validation schemas**

```ts
// src/features/auth/schemas.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignupInput = z.infer<typeof signupSchema>;
```

- [ ] **Step 2: Write the shared auth layout**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Write the login page**

```tsx
// src/app/(auth)/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    const { error } = await authClient.signIn.email(data);
    if (error) { setServerError(error.message ?? "Login failed"); return; }
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" style={{ fontFamily: "var(--font-sans)" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>Sign in</h1>
      <input {...register("email")} placeholder="Email" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.email && <p className="text-[var(--red)] text-sm">{errors.email.message}</p>}
      <input {...register("password")} type="password" placeholder="Password" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.password && <p className="text-[var(--red)] text-sm">{errors.password.message}</p>}
      {serverError && <p role="alert" className="text-[var(--red)] text-sm">{serverError}</p>}
      <button disabled={isSubmitting} className="bg-[var(--red)] text-white p-3 font-bold uppercase tracking-widest text-xs">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Write the signup page**

```tsx
// src/app/(auth)/signup/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    setServerError(null);
    const { error } = await authClient.signUp.email(data);
    if (error) { setServerError(error.message ?? "Signup failed"); return; }
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" style={{ fontFamily: "var(--font-sans)" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>Create account</h1>
      <input {...register("name")} placeholder="Full name" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.name && <p className="text-[var(--red)] text-sm">{errors.name.message}</p>}
      <input {...register("email")} placeholder="Email" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.email && <p className="text-[var(--red)] text-sm">{errors.email.message}</p>}
      <input {...register("password")} type="password" placeholder="Password" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.password && <p className="text-[var(--red)] text-sm">{errors.password.message}</p>}
      {serverError && <p role="alert" className="text-[var(--red)] text-sm">{serverError}</p>}
      <button disabled={isSubmitting} className="bg-[var(--red)] text-white p-3 font-bold uppercase tracking-widest text-xs">
        {isSubmitting ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, visit `/signup`, create an account, confirm redirect to `/dashboard` (Task 9 makes this route resolve; a temporary 404 there is expected until then).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add login and signup pages with Better Auth"
```

---

## Task 8: Shared dashboard components

**Files:**
- Create: `src/components/shared/StatCard.tsx`
- Create: `src/components/shared/EmptyState.tsx`
- Create: `src/components/shared/ErrorState.tsx`
- Create: `src/components/shared/Skeletons.tsx`
- Create: `src/components/shared/StatusBadge.tsx`
- Create: `src/components/shared/DataTable.tsx`

**Interfaces:**
- Produces: `<StatCard label value delta deltaColor />`, `<EmptyState title body ctaLabel onCta />`, `<ErrorState onRetry />`, `<StatRowSkeleton />` / `<ChartSkeleton />` / `<TableSkeleton />`, `<StatusBadge label color />`, `<DataTable columns rows />`

- [ ] **Step 1: StatCard**

```tsx
// src/components/shared/StatCard.tsx
export function StatCard({ label, value, delta, deltaColor }: { label: string; value: string; delta?: string; deltaColor?: string }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5">
      <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">{label}</div>
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[42px] leading-[1.05] mt-2">{value}</div>
      {delta && <div className="text-[11.5px] font-semibold mt-1" style={{ color: deltaColor ?? "var(--mut)" }}>{delta}</div>}
    </div>
  );
}
```

- [ ] **Step 2: EmptyState**

```tsx
// src/components/shared/EmptyState.tsx
export function EmptyState({ title = "Nothing here yet", body, ctaLabel, onCta }: { title?: string; body: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <div className="border border-dashed border-[var(--line2)] p-[90px_40px] text-center flex flex-col items-center gap-3.5">
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[30px]">{title}</div>
      <p className="text-[var(--mut)] text-sm max-w-[340px]">{body}</p>
      {ctaLabel && onCta && (
        <button onClick={onCta} className="mt-2 bg-[var(--red)] text-white px-6 py-3 font-bold text-xs uppercase tracking-widest">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: ErrorState**

```tsx
// src/components/shared/ErrorState.tsx
"use client";
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="border border-[var(--red)] bg-[var(--card)] p-[90px_40px] text-center flex flex-col items-center gap-3.5">
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[30px]">Something broke</div>
      <p className="text-[var(--mut)] text-sm max-w-[360px]">
        We couldn&apos;t load this view. It&apos;s on us — try again, and if it keeps happening the front desk can help.
      </p>
      <button onClick={onRetry} className="mt-2 border border-[var(--line2)] px-6 py-3 font-bold text-xs uppercase tracking-widest">
        Retry
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Skeletons**

```tsx
// src/components/shared/Skeletons.tsx
function Shimmer({ className }: { className: string }) {
  return <div className={`${className} bg-[linear-gradient(90deg,var(--skel)_25%,var(--skel2)_50%,var(--skel)_75%)] bg-[length:200%_100%] animate-[fcShimmer_1.4s_linear_infinite]`} />;
}
export function StatRowSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((k) => <Shimmer key={k} className="h-[110px]" />)}
    </div>
  );
}
export function ChartSkeleton() { return <Shimmer className="h-[320px]" />; }
export function TableSkeleton() { return <Shimmer className="h-[220px]" />; }
```

Add the `fcShimmer` keyframes to `globals.css`:

```css
@keyframes fcShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

- [ ] **Step 5: StatusBadge**

```tsx
// src/components/shared/StatusBadge.tsx
export function StatusBadge({ label, color }: { label: string; color: string }) {
  return <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>;
}
```

- [ ] **Step 6: DataTable**

```tsx
// src/components/shared/DataTable.tsx
export type Column<T> = { header: string; render: (row: T) => React.ReactNode };

export function DataTable<T extends { id: string }>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-[var(--line)]">
          {columns.map((c) => (
            <th key={c.header} className="text-left text-[10.5px] font-semibold tracking-[.16em] uppercase text-[var(--dim)] p-3">
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-[var(--line)]">
            {columns.map((c) => <td key={c.header} className="p-3 text-sm">{c.render(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add shared dashboard components (StatCard, EmptyState, ErrorState, Skeletons, StatusBadge, DataTable)"
```

---

## Task 9: Dashboard layout shell with RBAC guard

**Files:**
- Create: `src/lib/dashboard-nav.ts`
- Create: `src/app/(dashboard)/layout.tsx` (session-only guard, shared by all dashboard routes)
- Create: `src/app/(dashboard)/dashboard/page.tsx` (role router)
- Create: `src/app/(dashboard)/dashboard/member/layout.tsx` (role guard + sidebar shell)
- Create: `src/app/(dashboard)/dashboard/trainer/layout.tsx` (role guard + sidebar shell)
- Create: `src/app/(dashboard)/dashboard/admin/layout.tsx` (role guard + sidebar shell)
- Create: `src/components/shared/Sidebar.tsx`
- Create: `src/components/shared/Topbar.tsx`

**Interfaces:**
- Consumes: `getSession` from `src/lib/rbac.ts` (Task 6)
- Produces: session guard at `(dashboard)/layout.tsx`, per-role guard + sidebar at each `dashboard/{role}/layout.tsx`

Next.js Server Components have no built-in way to read the current pathname
(there is no `x-invoke-path` header) — reading it requires either middleware
writing a custom header, or `usePathname()` in a Client Component. Rather
than add middleware just for nav highlighting, `Sidebar` is a small Client
Component that calls `usePathname()` itself; the role guard (which does need
to run server-side, before any DB query, to actually block access) lives in
each role's own `layout.tsx` instead of one shared layout inspecting the URL.

- [ ] **Step 1: Write the nav-by-role map (shared across Sidebar and layouts)**

```ts
// src/lib/dashboard-nav.ts
export const NAV_BY_ROLE = {
  MEMBER: [
    ["overview", "Overview"], ["workouts", "Workout plan"], ["nutrition", "Nutrition"],
    ["bookings", "Bookings"], ["payments", "Payments"], ["profile", "Profile"],
  ],
  TRAINER: [
    ["overview", "Overview"], ["clients", "Clients"], ["schedule", "Schedule"], ["programs", "Programs"],
  ],
  ADMIN: [
    ["analytics", "Analytics"], ["members", "Members"], ["trainers", "Trainers"], ["plans", "Plans"],
    ["shop", "Shop"], ["orders", "Orders"], ["content", "Content"], ["gallery", "Gallery"],
    ["settings", "Settings"], ["roles", "Roles"],
  ],
} as const;

export const ROLE_BASE_PATH = { MEMBER: "member", TRAINER: "trainer", ADMIN: "admin" } as const;
export type Role = keyof typeof ROLE_BASE_PATH;
```

- [ ] **Step 2: Write the Sidebar (Client Component — owns its own active-tab detection)**

```tsx
// src/components/shared/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { NAV_BY_ROLE, ROLE_BASE_PATH, type Role } from "@/lib/dashboard-nav";

export function Sidebar({ role, userName, userPlan }: { role: Role; userName: string; userPlan: string }) {
  const pathname = usePathname();
  const base = ROLE_BASE_PATH[role];
  const items = NAV_BY_ROLE[role];
  const activeTab = pathname.split("/")[3] ?? "overview";
  const roleTitle = role === "ADMIN" ? "Admin console" : role === "TRAINER" ? "Coach portal" : "Member area";

  return (
    <aside className="sticky top-0 h-screen bg-[var(--panel)] border-r border-[var(--line)] flex flex-col">
      <div className="flex items-center gap-[11px] p-[22px_22px_20px] border-b border-[var(--line)]">
        <Logo />
      </div>
      <div className="p-[16px_22px_8px] text-[10px] font-bold tracking-[.26em] uppercase text-[var(--dim)]">{roleTitle}</div>
      <nav className="flex flex-col p-[6px_12px] gap-0.5">
        {items.map(([id, label], i) => {
          const active = id === activeTab;
          return (
            <Link key={id} href={`/dashboard/${base}/${id}`}
              className="flex items-center gap-3.5 px-3 py-2.5 no-underline"
              style={{ background: active ? "var(--card)" : "transparent", borderLeft: `2px solid ${active ? "var(--red)" : "transparent"}` }}>
              <span style={{ fontFamily: "var(--font-heading)" }} className="text-[13px] tracking-[.1em] text-[var(--dim)] w-[18px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[12.5px] font-semibold tracking-[.08em] uppercase" style={{ color: active ? "var(--txt)" : "var(--mut)" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--line)] p-[16px_22px] flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] bg-[var(--red)] text-white grid place-items-center text-xs font-bold">
            {userName.split(" ").map((p) => p[0]).join("")}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">{userName}</div>
            <div className="text-[var(--dim)] text-[11px]">{userPlan}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Write the Topbar**

```tsx
// src/components/shared/Topbar.tsx
export function Topbar({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md border-b border-[var(--line)] flex items-center gap-5 px-7 h-16">
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] tracking-[.06em]">{title}</div>
    </div>
  );
}
```

- [ ] **Step 4: Write the shared session-only dashboard layout**

```tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
```

- [ ] **Step 5: Write the `/dashboard` role router**

```tsx
// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { ROLE_BASE_PATH, type Role } from "@/lib/dashboard-nav";

export default async function DashboardIndex() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.user.role as Role;
  redirect(`/dashboard/${ROLE_BASE_PATH[role]}/${role === "ADMIN" ? "analytics" : "overview"}`);
}
```

- [ ] **Step 6: Write the three per-role layouts**

```tsx
// src/app/(dashboard)/dashboard/member/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/shared/Sidebar";
import { ROLE_BASE_PATH, type Role } from "@/lib/dashboard-nav";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "MEMBER") redirect(`/dashboard/${ROLE_BASE_PATH[session.user.role as Role]}`);

  const membership = await db.membership.findFirst({ where: { userId: session.user.id } });

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen items-start">
      <Sidebar role="MEMBER" userName={session.user.name} userPlan={membership?.plan ?? "Member"} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/trainer/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { Sidebar } from "@/components/shared/Sidebar";
import { ROLE_BASE_PATH, type Role } from "@/lib/dashboard-nav";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "TRAINER") redirect(`/dashboard/${ROLE_BASE_PATH[session.user.role as Role]}`);

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen items-start">
      <Sidebar role="TRAINER" userName={session.user.name} userPlan="Coach" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/admin/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { Sidebar } from "@/components/shared/Sidebar";
import { ROLE_BASE_PATH, type Role } from "@/lib/dashboard-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect(`/dashboard/${ROLE_BASE_PATH[session.user.role as Role]}`);

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen items-start">
      <Sidebar role="ADMIN" userName={session.user.name} userPlan="Owner · Admin" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
```

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, log in as `marcus@fightclub.gym` / `password123`, confirm redirect lands on `/dashboard/member/overview` (still 404 until Task 11, but the redirect target and sidebar rendering should be visibly correct — sidebar and topbar render, content area 404s). Then, still signed in as Marcus, manually visit `/dashboard/admin/analytics` and confirm it redirects back to `/dashboard/member`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard layout shell with per-role sidebar and RBAC guards"
```

---

## Task 10: Third-party stub adapters

**Files:**
- Create: `src/lib/payments.ts`
- Create: `src/lib/uploads.ts`
- Create: `src/lib/email.ts`

**Interfaces:**
- Produces: `createInvoiceCheckout(input): Promise<{ url: string }>`, `uploadImage(file: Buffer, filename: string): Promise<{ url: string }>`, `sendEmail(input): Promise<{ id: string }>` — each real-or-mock based on env var presence

- [ ] **Step 1: Payments adapter**

```ts
// src/lib/payments.ts
import Stripe from "stripe";

export async function createInvoiceCheckout(input: { userId: string; amountCents: number; description: string }) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("[stub:payments] createInvoiceCheckout", input);
    return { url: `https://stub-checkout.local/session/${crypto.randomUUID()}` };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price_data: { currency: "usd", unit_amount: input.amountCents, product_data: { name: input.description } }, quantity: 1 }],
    success_url: `${process.env.BETTER_AUTH_URL}/dashboard/member/payments?success=1`,
    cancel_url: `${process.env.BETTER_AUTH_URL}/dashboard/member/payments`,
    client_reference_id: input.userId,
  });
  return { url: session.url! };
}
```

- [ ] **Step 2: Uploads adapter**

```ts
// src/lib/uploads.ts
import { v2 as cloudinary } from "cloudinary";

export async function uploadImage(file: Buffer, filename: string) {
  if (!process.env.CLOUDINARY_URL) {
    console.log("[stub:uploads] uploadImage", filename);
    return { url: `https://stub-cdn.local/${encodeURIComponent(filename)}` };
  }
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "fight-club" }, (err, res) => {
      if (err || !res) reject(err); else resolve(res as { secure_url: string });
    });
    stream.end(file);
  });
  return { url: result.secure_url };
}
```

- [ ] **Step 3: Email adapter**

```ts
// src/lib/email.ts
import { Resend } from "resend";

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[stub:email] sendEmail", input.to, input.subject);
    return { id: `stub-${crypto.randomUUID()}` };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({ from: "Fight Club <noreply@fightclub.gym>", ...input });
  if (error) throw new Error(error.message);
  return { id: data!.id };
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds (no env vars set in dev, so all three log-and-stub paths are what get exercised).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add stub adapters for payments, uploads, and email"
```

---

## Task 11: Member — Overview

**Files:**
- Create: `src/features/analytics/queries.ts` (member overview query)
- Create: `src/app/(dashboard)/dashboard/member/overview/page.tsx`
- Create: `src/app/(dashboard)/dashboard/member/overview/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/member/overview/error.tsx`

**Interfaces:**
- Consumes: `db`, `getSession`, `assertRole`, `StatCard`, `EmptyState`, `StatRowSkeleton`/`ChartSkeleton`
- Produces: `getMemberOverview(userId: string): Promise<{ stats: {label:string;value:string;delta:string;deltaColor:string}[]; upNext: {time:string;title:string;sub:string}[] }>`

- [ ] **Step 1: Write the query**

```ts
// src/features/analytics/queries.ts
import { db } from "@/lib/db";

export async function getMemberOverview(userId: string) {
  const [bookingsThisMonth, attendanceCount] = await Promise.all([
    db.booking.count({ where: { userId, status: { in: ["CONFIRMED", "ATTENDED"] } } }),
    db.attendanceLog.count({ where: { userId } }),
  ]);
  const nextBookings = await db.booking.findMany({
    where: { userId, status: "CONFIRMED" },
    include: { class: true },
    orderBy: { class: { startsAt: "asc" } },
    take: 3,
  });

  const stats = [
    { label: "Sessions this month", value: String(bookingsThisMonth), delta: "", deltaColor: "var(--red)" },
    { label: "Total check-ins", value: String(attendanceCount), delta: "", deltaColor: "var(--mut)" },
  ];
  const upNext = nextBookings.map((b) => ({
    time: b.class.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: b.class.title,
    sub: `${b.class.room} · ${b.class.startsAt.toLocaleDateString()}`,
  }));

  return { stats, upNext };
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/member/overview/page.tsx
import { getSession } from "@/lib/rbac";
import { getMemberOverview } from "@/features/analytics/queries";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function MemberOverviewPage() {
  const session = await getSession();
  const { stats, upNext } = await getMemberOverview(session!.user.id);

  return (
    <>
      <Topbar title="Overview" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
        {upNext.length === 0 ? (
          <EmptyState body="Book a class to see it here." />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {upNext.map((n, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg">{n.time}</div>
                <div>
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-[var(--dim)] text-xs">{n.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Write loading and error boundaries**

```tsx
// src/app/(dashboard)/dashboard/member/overview/loading.tsx
import { StatRowSkeleton, ChartSkeleton } from "@/components/shared/Skeletons";
export default function Loading() {
  return <div className="p-7 flex flex-col gap-6"><StatRowSkeleton /><ChartSkeleton /></div>;
}
```

```tsx
// src/app/(dashboard)/dashboard/member/overview/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as Marcus, visit `/dashboard/member/overview`, confirm stat cards and upcoming bookings render from seeded data.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add member overview dashboard page"
```

---

## Task 12: Member — Workouts

**Files:**
- Create: `src/features/workouts/queries.ts`
- Create: `src/app/(dashboard)/dashboard/member/workouts/page.tsx`
- Create: `src/app/(dashboard)/dashboard/member/workouts/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/member/workouts/error.tsx`

**Interfaces:**
- Produces: `getMemberWorkoutPlan(userId): Promise<{ programName: string; days: { day: string; focus: string; exercises: {name:string;sets:string;load:string;tempo:string}[] }[] } | null>`

- [ ] **Step 1: Write the query**

```ts
// src/features/workouts/queries.ts
import { db } from "@/lib/db";

export async function getMemberWorkoutPlan(userId: string) {
  const assignment = await db.programAssignment.findFirst({
    where: { memberId: userId },
    orderBy: { startedAt: "desc" },
    include: { program: { include: { days: { include: { exercises: true }, orderBy: { dayIndex: "asc" } } } } },
  });
  if (!assignment) return null;
  return {
    programName: assignment.program.name,
    days: assignment.program.days.map((d) => ({
      day: `DAY ${d.dayIndex}`,
      focus: d.focus,
      exercises: d.exercises.map((e) => ({ name: e.name, sets: e.sets, load: e.load, tempo: e.tempo })),
    })),
  };
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/member/workouts/page.tsx
import { getSession } from "@/lib/rbac";
import { getMemberWorkoutPlan } from "@/features/workouts/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

export default async function MemberWorkoutsPage() {
  const session = await getSession();
  const plan = await getMemberWorkoutPlan(session!.user.id);

  return (
    <>
      <Topbar title="Workout plan" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {!plan ? (
          <EmptyState body="No program assigned yet. Your coach will assign one after your first assessment." />
        ) : (
          plan.days.map((d) => (
            <div key={d.day} className="bg-[var(--card)] border border-[var(--line)]">
              <div className="p-4 border-b border-[var(--line)] flex justify-between">
                <span style={{ fontFamily: "var(--font-heading)" }}>{d.day} — {d.focus}</span>
              </div>
              <DataTable
                columns={[
                  { header: "Exercise", render: (e) => e.name },
                  { header: "Sets", render: (e) => e.sets },
                  { header: "Load", render: (e) => e.load },
                  { header: "Tempo", render: (e) => e.tempo },
                ]}
                rows={d.exercises.map((e, i) => ({ id: `${d.day}-${i}`, ...e }))}
              />
            </div>
          ))
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/member/workouts/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/member/workouts/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/member/workouts`, confirm STRENGTH BLOCK C days render with exercises from seed data.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add member workouts dashboard page"
```

---

## Task 13: Member — Nutrition

**Files:**
- Create: `src/features/nutrition/queries.ts`
- Create: `src/app/(dashboard)/dashboard/member/nutrition/page.tsx`
- Create: `src/app/(dashboard)/dashboard/member/nutrition/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/member/nutrition/error.tsx`

**Interfaces:**
- Produces: `getMemberNutritionPlan(userId): Promise<{ kcal:number;protein:number;carbs:number;fat:number; meals:{time:string;name:string;detail:string;kcal:number}[] } | null>`

- [ ] **Step 1: Write the query**

```ts
// src/features/nutrition/queries.ts
import { db } from "@/lib/db";

export async function getMemberNutritionPlan(userId: string) {
  const plan = await db.nutritionPlan.findFirst({ where: { memberId: userId }, include: { meals: true } });
  if (!plan) return null;
  return {
    kcal: plan.kcal, protein: plan.protein, carbs: plan.carbs, fat: plan.fat,
    meals: plan.meals.map((m) => ({ time: m.time, name: m.name, detail: m.detail, kcal: m.kcal })),
  };
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/member/nutrition/page.tsx
import { getSession } from "@/lib/rbac";
import { getMemberNutritionPlan } from "@/features/nutrition/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function MemberNutritionPage() {
  const session = await getSession();
  const plan = await getMemberNutritionPlan(session!.user.id);

  return (
    <>
      <Topbar title="Nutrition" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {!plan ? (
          <EmptyState body="No nutrition plan yet. Ask your coach to set your macro targets." />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Calories", value: `${plan.kcal}` },
                { label: "Protein", value: `${plan.protein}g` },
                { label: "Carbs", value: `${plan.carbs}g` },
                { label: "Fat", value: `${plan.fat}g` },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--card)] border border-[var(--line)] p-5">
                  <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">{s.label}</div>
                  <div style={{ fontFamily: "var(--font-heading)" }} className="text-[32px] mt-2">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-[var(--card)] border border-[var(--line)]">
              {plan.meals.map((m, i) => (
                <div key={i} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
                  <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg w-16">{m.time}</div>
                  <div>
                    <div className="font-semibold text-sm">{m.name} — {m.kcal} kcal</div>
                    <div className="text-[var(--dim)] text-xs">{m.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/member/nutrition/loading.tsx
import { StatRowSkeleton, TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() {
  return <div className="p-7 flex flex-col gap-6"><StatRowSkeleton /><TableSkeleton /></div>;
}
```

```tsx
// src/app/(dashboard)/dashboard/member/nutrition/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/member/nutrition`, confirm macros and meals render.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add member nutrition dashboard page"
```

---

## Task 14: Member — Bookings (with cancel action)

**Files:**
- Create: `src/features/bookings/schemas.ts`
- Create: `src/features/bookings/queries.ts`
- Create: `src/features/bookings/actions.ts`
- Test: `src/features/bookings/actions.test.ts`
- Create: `src/app/(dashboard)/dashboard/member/bookings/page.tsx`
- Create: `src/app/(dashboard)/dashboard/member/bookings/BookingsList.tsx`
- Create: `src/app/(dashboard)/dashboard/member/bookings/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/member/bookings/error.tsx`

**Interfaces:**
- Consumes: `assertRole` from Task 6
- Produces: `cancelBookingSchema`, `cancelBooking(input): Promise<{ ok: true }>`, `getMemberBookings(userId)`

- [ ] **Step 1: Write the schema**

```ts
// src/features/bookings/schemas.ts
import { z } from "zod";

export const cancelBookingSchema = z.object({ bookingId: z.string().min(1) });
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
```

- [ ] **Step 2: Write the failing test for the action's RBAC + ownership check**

```ts
// src/features/bookings/actions.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { booking: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/rbac", () => ({ getSession: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { cancelBooking } from "./actions";

describe("cancelBooking", () => {
  it("throws if the booking belongs to a different user", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    (db.booking.findUnique as any).mockResolvedValue({ id: "b1", userId: "someone-else" });

    await expect(cancelBooking({ bookingId: "b1" })).rejects.toThrow("Forbidden");
  });

  it("cancels the booking when it belongs to the caller", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    (db.booking.findUnique as any).mockResolvedValue({ id: "b1", userId: "u1" });
    (db.booking.update as any).mockResolvedValue({ id: "b1", status: "CANCELLED" });

    const result = await cancelBooking({ bookingId: "b1" });
    expect(result).toEqual({ ok: true });
    expect(db.booking.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { status: "CANCELLED" } });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/bookings/actions.test.ts`
Expected: FAIL — `./actions` module not found.

- [ ] **Step 4: Implement the action**

```ts
// src/features/bookings/actions.ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { cancelBookingSchema, type CancelBookingInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function cancelBooking(rawInput: CancelBookingInput) {
  const input = cancelBookingSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking || booking.userId !== session.user.id) {
    throw new Error("Forbidden: not your booking");
  }

  await db.booking.update({ where: { id: input.bookingId }, data: { status: "CANCELLED" } });
  revalidatePath("/dashboard/member/bookings");
  return { ok: true as const };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/bookings/actions.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the query**

```ts
// src/features/bookings/queries.ts
import { db } from "@/lib/db";

export async function getMemberBookings(userId: string) {
  const bookings = await db.booking.findMany({
    where: { userId, status: { in: ["CONFIRMED", "WAITLIST"] } },
    include: { class: true },
    orderBy: { class: { startsAt: "asc" } },
  });
  return bookings.map((b) => ({
    id: b.id, time: b.class.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: b.class.title, room: b.class.room, status: b.status,
  }));
}
```

- [ ] **Step 7: Write the client list component (calls the server action)**

```tsx
// src/app/(dashboard)/dashboard/member/bookings/BookingsList.tsx
"use client";
import { useTransition } from "react";
import { cancelBooking } from "@/features/bookings/actions";

type Row = { id: string; time: string; title: string; room: string; status: string };

export function BookingsList({ bookings }: { bookings: Row[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="bg-[var(--card)] border border-[var(--line)]">
      {bookings.map((b) => (
        <div key={b.id} className="flex items-center gap-4 p-4 border-b border-[var(--line)] last:border-0">
          <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg w-16">{b.time}</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">{b.title}</div>
            <div className="text-[var(--dim)] text-xs">{b.room} · {b.status}</div>
          </div>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => { cancelBooking({ bookingId: b.id }); })}
            className="border border-[var(--line2)] px-4 py-2 text-xs uppercase tracking-widest"
          >
            {b.status === "WAITLIST" ? "Leave" : "Cancel"}
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Write the page**

```tsx
// src/app/(dashboard)/dashboard/member/bookings/page.tsx
import { getSession } from "@/lib/rbac";
import { getMemberBookings } from "@/features/bookings/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { BookingsList } from "./BookingsList";

export default async function MemberBookingsPage() {
  const session = await getSession();
  const bookings = await getMemberBookings(session!.user.id);

  return (
    <>
      <Topbar title="Bookings" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {bookings.length === 0
          ? <EmptyState body="No upcoming bookings. Book a class to see it here." />
          : <BookingsList bookings={bookings} />}
      </div>
    </>
  );
}
```

- [ ] **Step 9: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/member/bookings/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/member/bookings/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 10: Manual verification** — visit `/dashboard/member/bookings`, confirm seeded bookings show, click Cancel, confirm row status updates after revalidation.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add member bookings page with cancel action"
```

---

## Task 15: Member — Payments

**Files:**
- Create: `src/features/payments/queries.ts`
- Create: `src/app/(dashboard)/dashboard/member/payments/page.tsx`
- Create: `src/app/(dashboard)/dashboard/member/payments/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/member/payments/error.tsx`

**Interfaces:**
- Consumes: `createInvoiceCheckout` from Task 10 (referenced for the future "Pay now" flow; not wired to a DUE invoice in seed data, so no action needed this task — invoices are read-only display)
- Produces: `getMemberInvoices(userId)`

- [ ] **Step 1: Write the query**

```ts
// src/features/payments/queries.ts
import { db } from "@/lib/db";

export async function getMemberInvoices(userId: string) {
  const invoices = await db.invoice.findMany({ where: { userId }, orderBy: { issuedAt: "desc" } });
  return invoices.map((inv) => ({
    id: inv.id, desc: inv.desc, date: inv.issuedAt.toLocaleDateString(),
    amount: `$${(inv.amount / 100).toFixed(2)}`, status: inv.status,
    statusColor: inv.status === "REFUNDED" ? "var(--red)" : "var(--mut)",
  }));
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/member/payments/page.tsx
import { getSession } from "@/lib/rbac";
import { getMemberInvoices } from "@/features/payments/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function MemberPaymentsPage() {
  const session = await getSession();
  const invoices = await getMemberInvoices(session!.user.id);

  return (
    <>
      <Topbar title="Payments & invoices" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {invoices.length === 0 ? (
          <EmptyState body="No invoices yet." />
        ) : (
          <DataTable
            columns={[
              { header: "Invoice", render: (r) => r.desc },
              { header: "Date", render: (r) => r.date },
              { header: "Amount", render: (r) => r.amount },
              { header: "Status", render: (r) => <StatusBadge label={r.status} color={r.statusColor} /> },
            ]}
            rows={invoices}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/member/payments/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/member/payments/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/member/payments`, confirm the two seeded invoices render with correct status colors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add member payments dashboard page"
```

---

## Task 16: Member — Profile (preference toggles)

**Files:**
- Create: `src/features/notifications/schemas.ts`
- Create: `src/features/notifications/actions.ts`
- Create: `src/app/(dashboard)/dashboard/member/profile/page.tsx`
- Create: `src/app/(dashboard)/dashboard/member/profile/ProfileForm.tsx`
- Create: `src/app/(dashboard)/dashboard/member/profile/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/member/profile/error.tsx`

**Interfaces:**
- Produces: `updateProfileSchema`, `updateProfile(input): Promise<{ ok: true }>` (updates `User.name`; membership-level prefs are out of Phase-1 schema, so the UI documents them as read-only display fields sourced from the seeded `Membership`, avoiding a fabricated preferences table)

- [ ] **Step 1: Write the schema**

```ts
// src/features/notifications/schemas.ts
import { z } from "zod";

export const updateProfileSchema = z.object({ name: z.string().min(2) });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

- [ ] **Step 2: Write the action**

```ts
// src/features/notifications/actions.ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updateProfileSchema, type UpdateProfileInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function updateProfile(rawInput: UpdateProfileInput) {
  const input = updateProfileSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["MEMBER", "TRAINER", "ADMIN"]);

  await db.user.update({ where: { id: session.user.id }, data: { name: input.name } });
  revalidatePath("/dashboard/member/profile");
  return { ok: true as const };
}
```

- [ ] **Step 3: Write the client form**

```tsx
// src/app/(dashboard)/dashboard/member/profile/ProfileForm.tsx
"use client";
import { useState, useTransition } from "react";
import { updateProfile } from "@/features/notifications/actions";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 max-w-[420px]">
      <label className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">Full name</label>
      <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }}
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      <button
        disabled={isPending}
        onClick={() => startTransition(async () => { await updateProfile({ name }); setSaved(true); })}
        className="bg-[var(--red)] text-white p-3 font-bold uppercase tracking-widest text-xs"
      >
        {isPending ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write the page**

```tsx
// src/app/(dashboard)/dashboard/member/profile/page.tsx
import { getSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Topbar } from "@/components/shared/Topbar";
import { ProfileForm } from "./ProfileForm";

export default async function MemberProfilePage() {
  const session = await getSession();
  const membership = await db.membership.findFirst({ where: { userId: session!.user.id } });

  return (
    <>
      <Topbar title="Profile & settings" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <ProfileForm initialName={session!.user.name} />
        {membership && (
          <div className="bg-[var(--card)] border border-[var(--line)] p-5 max-w-[420px]">
            <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">Plan</div>
            <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">{membership.plan}</div>
            <div className="text-[var(--dim)] text-xs mt-1">Status: {membership.status}</div>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 5: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/member/profile/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/member/profile/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 6: Manual verification** — visit `/dashboard/member/profile`, edit name, save, confirm it persists after reload.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add member profile page with name update"
```

---

## Task 17: Trainer — Overview

**Files:**
- Modify: `src/features/analytics/queries.ts` (add `getTrainerOverview`)
- Create: `src/app/(dashboard)/dashboard/trainer/overview/page.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/overview/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/overview/error.tsx`

**Interfaces:**
- Produces: `getTrainerOverview(coachId): Promise<{ stats: {...}[]; sessionsToday: {time:string;title:string;room:string;attendees:string}[] }>`

- [ ] **Step 1: Add the query**

```ts
// append to src/features/analytics/queries.ts
export async function getTrainerOverview(coachId: string) {
  const [classCount, clientCount] = await Promise.all([
    db.class.count({ where: { coachId } }),
    db.programAssignment.count({ where: { program: { coachId } } }),
  ]);
  const classesToday = await db.class.findMany({
    where: { coachId },
    include: { bookings: true },
    orderBy: { startsAt: "asc" },
    take: 4,
  });

  const stats = [
    { label: "Classes", value: String(classCount), delta: "", deltaColor: "var(--red)" },
    { label: "Active clients", value: String(clientCount), delta: "", deltaColor: "var(--red)" },
  ];
  const sessionsToday = classesToday.map((c) => ({
    time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: c.title, room: c.room,
    attendees: `${c.bookings.filter((b) => b.status === "CONFIRMED").length} / ${c.capacity} booked`,
  }));

  return { stats, sessionsToday };
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/trainer/overview/page.tsx
import { getSession } from "@/lib/rbac";
import { getTrainerOverview } from "@/features/analytics/queries";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function TrainerOverviewPage() {
  const session = await getSession();
  const { stats, sessionsToday } = await getTrainerOverview(session!.user.id);

  return (
    <>
      <Topbar title="Overview" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-4 gap-4">{stats.map((s) => <StatCard key={s.label} {...s} />)}</div>
        {sessionsToday.length === 0 ? (
          <EmptyState body="No classes scheduled." />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {sessionsToday.map((s, i) => (
              <div key={i} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
                <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg w-16">{s.time}</div>
                <div>
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-[var(--dim)] text-xs">{s.room} · {s.attendees}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/trainer/overview/loading.tsx
import { StatRowSkeleton, TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() {
  return <div className="p-7 flex flex-col gap-6"><StatRowSkeleton /><TableSkeleton /></div>;
}
```

```tsx
// src/app/(dashboard)/dashboard/trainer/overview/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — log in as `ana@fightclub.gym`, visit `/dashboard/trainer/overview`, confirm class/client counts and today's sessions render.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add trainer overview dashboard page"
```

---

## Task 18: Trainer — Clients (list + detail)

**Files:**
- Create: `src/features/workouts/actions.ts` (mark-attendance action, used from client detail)
- Test: `src/features/workouts/actions.test.ts`
- Create: `src/app/(dashboard)/dashboard/trainer/clients/page.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/clients/[id]/page.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/clients/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/clients/error.tsx`

**Interfaces:**
- Modify: `src/features/workouts/queries.ts` — add `getTrainerClients(coachId)`, `getClientDetail(coachId, memberId)`
- Produces: `markAttendanceSchema`, `markAttendance(input): Promise<{ ok: true }>`

- [ ] **Step 1: Add trainer client queries**

```ts
// append to src/features/workouts/queries.ts
export async function getTrainerClients(coachId: string) {
  const assignments = await db.programAssignment.findMany({
    where: { program: { coachId } },
    include: { member: true, program: true },
  });
  return assignments.map((a) => ({
    id: a.member.id, name: a.member.name, program: a.program.name, adherencePct: a.adherencePct,
  }));
}

export async function getClientDetail(coachId: string, memberId: string) {
  const assignment = await db.programAssignment.findFirst({
    where: { memberId, program: { coachId } },
    include: { member: true, program: { include: { days: { include: { exercises: true }, orderBy: { dayIndex: "asc" } } } } },
  });
  if (!assignment) return null;
  return {
    memberName: assignment.member.name,
    adherencePct: assignment.adherencePct,
    programName: assignment.program.name,
    days: assignment.program.days.map((d) => ({ day: `DAY ${d.dayIndex}`, focus: d.focus, exerciseCount: d.exercises.length })),
  };
}
```

- [ ] **Step 2: Write the failing test for markAttendance's RBAC**

```ts
// src/features/workouts/actions.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { attendanceLog: { create: vi.fn() } } }));
vi.mock("@/lib/rbac", () => ({ getSession: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { markAttendance } from "./actions";

describe("markAttendance", () => {
  it("rejects members (only trainers/admins may mark attendance)", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    await expect(markAttendance({ memberId: "m1" })).rejects.toThrow("Forbidden");
  });

  it("creates an attendance log for trainers", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "coach1", role: "TRAINER" } });
    (db.attendanceLog.create as any).mockResolvedValue({ id: "log1" });
    const result = await markAttendance({ memberId: "m1" });
    expect(result).toEqual({ ok: true });
    expect(db.attendanceLog.create).toHaveBeenCalledWith({ data: { userId: "m1" } });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/workouts/actions.test.ts`
Expected: FAIL — `./actions` module not found.

- [ ] **Step 4: Implement the action**

```ts
// src/features/workouts/actions.ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const markAttendanceSchema = z.object({ memberId: z.string().min(1) });
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export async function markAttendance(rawInput: MarkAttendanceInput) {
  const input = markAttendanceSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["TRAINER", "ADMIN"]);

  await db.attendanceLog.create({ data: { userId: input.memberId } });
  revalidatePath("/dashboard/trainer/clients");
  return { ok: true as const };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/workouts/actions.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the clients list page**

```tsx
// src/app/(dashboard)/dashboard/trainer/clients/page.tsx
import Link from "next/link";
import { getSession } from "@/lib/rbac";
import { getTrainerClients } from "@/features/workouts/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

export default async function TrainerClientsPage() {
  const session = await getSession();
  const clients = await getTrainerClients(session!.user.id);

  return (
    <>
      <Topbar title="Clients" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {clients.length === 0 ? (
          <EmptyState body="No clients assigned yet." />
        ) : (
          <DataTable
            columns={[
              { header: "Name", render: (r) => <Link href={`/dashboard/trainer/clients/${r.id}`} className="underline">{r.name}</Link> },
              { header: "Program", render: (r) => r.program },
              { header: "Adherence", render: (r) => `${r.adherencePct}%` },
            ]}
            rows={clients}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 7: Write the client detail page**

```tsx
// src/app/(dashboard)/dashboard/trainer/clients/[id]/page.tsx
import { notFound } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { getClientDetail } from "@/features/workouts/queries";
import { Topbar } from "@/components/shared/Topbar";
import { MarkAttendanceButton } from "./MarkAttendanceButton";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const detail = await getClientDetail(session!.user.id, id);
  if (!detail) notFound();

  return (
    <>
      <Topbar title={detail.memberName} />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex justify-between items-center">
          <div>
            <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl">{detail.programName}</div>
            <div className="text-[var(--dim)] text-xs mt-1">Adherence: {detail.adherencePct}%</div>
          </div>
          <MarkAttendanceButton memberId={id} />
        </div>
        <div className="bg-[var(--card)] border border-[var(--line)]">
          {detail.days.map((d) => (
            <div key={d.day} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
              <div style={{ fontFamily: "var(--font-heading)" }}>{d.day}</div>
              <div className="text-[var(--dim)] text-xs">{d.focus} · {d.exerciseCount} exercises</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 8: Write the mark-attendance client button**

```tsx
// src/app/(dashboard)/dashboard/trainer/clients/[id]/MarkAttendanceButton.tsx
"use client";
import { useState, useTransition } from "react";
import { markAttendance } from "@/features/workouts/actions";

export function MarkAttendanceButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition();
  const [marked, setMarked] = useState(false);
  return (
    <button
      disabled={isPending || marked}
      onClick={() => startTransition(async () => { await markAttendance({ memberId }); setMarked(true); })}
      className="bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs"
    >
      {marked ? "Marked" : isPending ? "Marking…" : "Mark attendance"}
    </button>
  );
}
```

- [ ] **Step 9: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/trainer/clients/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/trainer/clients/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 10: Manual verification** — visit `/dashboard/trainer/clients`, click Marcus Reid, confirm detail page loads, click "Mark attendance", confirm it flips to "Marked".

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add trainer clients list and detail pages with attendance action"
```

---

## Task 19: Trainer — Schedule

**Files:**
- Create: `src/features/bookings/queries.ts` — add `getTrainerSchedule(coachId)` (same file as Task 14; append)
- Create: `src/app/(dashboard)/dashboard/trainer/schedule/page.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/schedule/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/schedule/error.tsx`

**Interfaces:**
- Produces: `getTrainerSchedule(coachId): Promise<{ id:string; day:string; time:string; title:string; room:string; booked:number; capacity:number }[]>`

- [ ] **Step 1: Add the query**

```ts
// append to src/features/bookings/queries.ts
export async function getTrainerSchedule(coachId: string) {
  const classes = await db.class.findMany({
    where: { coachId }, include: { bookings: true }, orderBy: { startsAt: "asc" },
  });
  return classes.map((c) => ({
    id: c.id, day: c.startsAt.toLocaleDateString([], { weekday: "short" }),
    time: c.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: c.title, room: c.room,
    booked: c.bookings.filter((b) => b.status === "CONFIRMED").length, capacity: c.capacity,
  }));
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/trainer/schedule/page.tsx
import { getSession } from "@/lib/rbac";
import { getTrainerSchedule } from "@/features/bookings/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

export default async function TrainerSchedulePage() {
  const session = await getSession();
  const rows = await getTrainerSchedule(session!.user.id);

  return (
    <>
      <Topbar title="Schedule" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {rows.length === 0 ? (
          <EmptyState body="No classes scheduled." />
        ) : (
          <DataTable
            columns={[
              { header: "Day", render: (r) => r.day },
              { header: "Time", render: (r) => r.time },
              { header: "Class", render: (r) => r.title },
              { header: "Room", render: (r) => r.room },
              { header: "Booked", render: (r) => `${r.booked} / ${r.capacity}` },
            ]}
            rows={rows}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/trainer/schedule/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/trainer/schedule/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/trainer/schedule`, confirm the two seeded classes render with correct booked counts.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add trainer schedule dashboard page"
```

---

## Task 20: Trainer — Programs

**Files:**
- Modify: `src/features/workouts/queries.ts` — add `getTrainerPrograms(coachId)`
- Create: `src/app/(dashboard)/dashboard/trainer/programs/page.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/programs/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/trainer/programs/error.tsx`

**Interfaces:**
- Produces: `getTrainerPrograms(coachId): Promise<{ id:string; name:string; weeks:number; assignedCount:number }[]>`

- [ ] **Step 1: Add the query**

```ts
// append to src/features/workouts/queries.ts
export async function getTrainerPrograms(coachId: string) {
  const programs = await db.workoutProgram.findMany({
    where: { coachId }, include: { _count: { select: { assignments: true } } },
  });
  return programs.map((p) => ({ id: p.id, name: p.name, weeks: p.weeks, assignedCount: p._count.assignments }));
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/trainer/programs/page.tsx
import { getSession } from "@/lib/rbac";
import { getTrainerPrograms } from "@/features/workouts/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function TrainerProgramsPage() {
  const session = await getSession();
  const programs = await getTrainerPrograms(session!.user.id);

  return (
    <>
      <Topbar title="Programs" />
      <div className="p-7 grid grid-cols-3 gap-4 max-w-[1200px]">
        {programs.length === 0 ? (
          <EmptyState body="No programs created yet." />
        ) : (
          programs.map((p) => (
            <div key={p.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-xl">{p.name}</div>
              <div className="text-[var(--dim)] text-xs mt-1">{p.weeks} weeks</div>
              <div className="text-[var(--red)] text-sm font-semibold mt-3">{p.assignedCount} assigned</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/trainer/programs/loading.tsx
import { ChartSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><ChartSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/trainer/programs/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/trainer/programs`, confirm STRENGTH BLOCK C shows with "1 assigned".

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add trainer programs dashboard page"
```

---

## Task 21: Admin — Analytics

**Files:**
- Modify: `src/features/analytics/queries.ts` — add `getAdminAnalytics()`
- Create: `src/app/(dashboard)/dashboard/admin/analytics/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/analytics/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/analytics/error.tsx`

**Interfaces:**
- Produces: `getAdminAnalytics(): Promise<{ stats: {...}[]; planMix: {plan:string;count:number}[] }>`

- [ ] **Step 1: Add the query**

```ts
// append to src/features/analytics/queries.ts
export async function getAdminAnalytics() {
  const [memberCount, activeCount, checkInsToday] = await Promise.all([
    db.user.count({ where: { role: "MEMBER" } }),
    db.membership.count({ where: { status: "ACTIVE" } }),
    db.attendanceLog.count({ where: { checkedInAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);
  const byPlan = await db.membership.groupBy({ by: ["plan"], _count: { plan: true } });

  const stats = [
    { label: "Total members", value: String(memberCount), delta: "", deltaColor: "var(--red)" },
    { label: "Active memberships", value: String(activeCount), delta: "", deltaColor: "var(--red)" },
    { label: "Check-ins today", value: String(checkInsToday), delta: "", deltaColor: "var(--mut)" },
  ];
  const planMix = byPlan.map((p) => ({ plan: p.plan, count: p._count.plan }));

  return { stats, planMix };
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/admin/analytics/page.tsx
import { getAdminAnalytics } from "@/features/analytics/queries";
import { StatCard } from "@/components/shared/StatCard";
import { Topbar } from "@/components/shared/Topbar";

export default async function AdminAnalyticsPage() {
  const { stats, planMix } = await getAdminAnalytics();

  return (
    <>
      <Topbar title="Analytics" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="grid grid-cols-4 gap-4">{stats.map((s) => <StatCard key={s.label} {...s} />)}</div>
        <div className="bg-[var(--card)] border border-[var(--line)] p-5">
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)] mb-3">Plan mix</div>
          {planMix.map((p) => (
            <div key={p.plan} className="flex justify-between py-2 border-b border-[var(--line)] last:border-0 text-sm">
              <span>{p.plan}</span><span className="font-semibold">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/analytics/loading.tsx
import { StatRowSkeleton, ChartSkeleton } from "@/components/shared/Skeletons";
export default function Loading() {
  return <div className="p-7 flex flex-col gap-6"><StatRowSkeleton /><ChartSkeleton /></div>;
}
```

```tsx
// src/app/(dashboard)/dashboard/admin/analytics/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — log in as `danny@fightclub.gym`, visit `/dashboard/admin/analytics`, confirm counts and plan mix (1 FIGHTER) render.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin analytics dashboard page"
```

---

## Task 22: Admin — Members

**Files:**
- Create: `src/features/memberships/queries.ts`
- Create: `src/app/(dashboard)/dashboard/admin/members/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/members/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/members/error.tsx`

**Interfaces:**
- Produces: `getAllMembers(): Promise<{id:string;name:string;email:string;plan:string;status:string;statusColor:string}[]>`

- [ ] **Step 1: Write the query**

```ts
// src/features/memberships/queries.ts
import { db } from "@/lib/db";

export async function getAllMembers() {
  const members = await db.user.findMany({
    where: { role: "MEMBER" },
    include: { memberships: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return members.map((m) => {
    const ms = m.memberships[0];
    return {
      id: m.id, name: m.name, email: m.email, plan: ms?.plan ?? "—", status: ms?.status ?? "NONE",
      statusColor: ms?.status === "AT_RISK" ? "var(--red)" : "var(--mut)",
    };
  });
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/admin/members/page.tsx
import { getAllMembers } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function AdminMembersPage() {
  const members = await getAllMembers();

  return (
    <>
      <Topbar title="Members" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {members.length === 0 ? (
          <EmptyState body="No members yet." />
        ) : (
          <DataTable
            columns={[
              { header: "Name", render: (r) => r.name },
              { header: "Email", render: (r) => r.email },
              { header: "Plan", render: (r) => r.plan },
              { header: "Status", render: (r) => <StatusBadge label={r.status} color={r.statusColor} /> },
            ]}
            rows={members}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/members/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/members/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/admin/members`, confirm Marcus Reid row shows FIGHTER / ACTIVE.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin members dashboard page"
```

---

## Task 23: Admin — Trainers

**Files:**
- Modify: `src/features/memberships/queries.ts` — add `getAllTrainers()`
- Create: `src/app/(dashboard)/dashboard/admin/trainers/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/trainers/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/trainers/error.tsx`

**Interfaces:**
- Produces: `getAllTrainers(): Promise<{id:string;name:string;email:string;classCount:number;clientCount:number}[]>`

- [ ] **Step 1: Add the query**

```ts
// append to src/features/memberships/queries.ts
export async function getAllTrainers() {
  const trainers = await db.user.findMany({
    where: { role: "TRAINER" },
    include: { _count: { select: { coachClasses: true, coachPrograms: true } } },
  });
  return trainers.map((t) => ({ id: t.id, name: t.name, email: t.email, classCount: t._count.coachClasses, programCount: t._count.coachPrograms }));
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/admin/trainers/page.tsx
import { getAllTrainers } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

export default async function AdminTrainersPage() {
  const trainers = await getAllTrainers();

  return (
    <>
      <Topbar title="Trainers" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {trainers.length === 0 ? (
          <EmptyState body="No trainers yet." />
        ) : (
          <DataTable
            columns={[
              { header: "Name", render: (r) => r.name },
              { header: "Email", render: (r) => r.email },
              { header: "Classes", render: (r) => String(r.classCount) },
              { header: "Programs", render: (r) => String(r.programCount) },
            ]}
            rows={trainers}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/trainers/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/trainers/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/admin/trainers`, confirm Ana Silva row shows 2 classes, 1 program.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin trainers dashboard page"
```

---

## Task 24: Admin — Plans

**Files:**
- Modify: `src/features/memberships/queries.ts` — add `getPlanBreakdown()`
- Create: `src/app/(dashboard)/dashboard/admin/plans/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/plans/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/plans/error.tsx`

**Interfaces:**
- Produces: `getPlanBreakdown(): Promise<{plan:string;memberCount:number}[]>`

- [ ] **Step 1: Add the query**

```ts
// append to src/features/memberships/queries.ts
const PLAN_PRICES: Record<string, string> = { CONTENDER: "$89 / mo", FIGHTER: "$149 / mo", CHAMPION: "$249 / mo" };

export async function getPlanBreakdown() {
  const byPlan = await db.membership.groupBy({ by: ["plan"], _count: { plan: true } });
  return byPlan.map((p) => ({ plan: p.plan, price: PLAN_PRICES[p.plan] ?? "—", memberCount: p._count.plan }));
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/admin/plans/page.tsx
import { getPlanBreakdown } from "@/features/memberships/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";

export default async function AdminPlansPage() {
  const plans = await getPlanBreakdown();

  return (
    <>
      <Topbar title="Membership plans" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {plans.length === 0 ? (
          <EmptyState body="No active plans yet." />
        ) : (
          <DataTable
            columns={[
              { header: "Plan", render: (r) => r.plan },
              { header: "Price", render: (r) => r.price },
              { header: "Members", render: (r) => String(r.memberCount) },
            ]}
            rows={plans.map((p) => ({ id: p.plan, ...p }))}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/plans/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/plans/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/admin/plans`, confirm FIGHTER shows $149/mo, 1 member.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin plans dashboard page"
```

---

## Task 25: Admin — Shop (products)

**Files:**
- Create: `src/features/shop/schemas.ts`
- Create: `src/features/shop/queries.ts`
- Create: `src/features/shop/actions.ts`
- Test: `src/features/shop/actions.test.ts`
- Create: `src/app/(dashboard)/dashboard/admin/shop/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/shop/AddProductForm.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/shop/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/shop/error.tsx`

**Interfaces:**
- Consumes: `assertRole`, `uploadImage` (Task 10, not exercised yet — product images are out of scope for Phase 1's text-only product form)
- Produces: `addProductSchema`, `addProduct(input): Promise<{ok:true}>`, `getAllProducts()`

- [ ] **Step 1: Write the schema**

```ts
// src/features/shop/schemas.ts
import { z } from "zod";

export const addProductSchema = z.object({
  name: z.string().min(2),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  category: z.string().min(2),
});
export type AddProductInput = z.infer<typeof addProductSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// src/features/shop/actions.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { product: { create: vi.fn() } } }));
vi.mock("@/lib/rbac", () => ({ getSession: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { addProduct } from "./actions";

describe("addProduct", () => {
  it("rejects non-admins", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });
    await expect(addProduct({ name: "Gloves", price: 12000, stock: 10, category: "Gear" })).rejects.toThrow("Forbidden");
  });

  it("creates a product for admins", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.product.create as any).mockResolvedValue({ id: "p1" });
    const result = await addProduct({ name: "Gloves", price: 12000, stock: 10, category: "Gear" });
    expect(result).toEqual({ ok: true });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/shop/actions.test.ts`
Expected: FAIL — `./actions` module not found.

- [ ] **Step 4: Implement query + action**

```ts
// src/features/shop/queries.ts
import { db } from "@/lib/db";

export async function getAllProducts() {
  const products = await db.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => ({
    id: p.id, name: p.name, price: `$${(p.price / 100).toFixed(2)}`, stock: p.stock, category: p.category,
    stockColor: p.stock < 10 ? "var(--red)" : "var(--mut)",
  }));
}
```

```ts
// src/features/shop/actions.ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { addProductSchema, type AddProductInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function addProduct(rawInput: AddProductInput) {
  const input = addProductSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.product.create({ data: input });
  revalidatePath("/dashboard/admin/shop");
  return { ok: true as const };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/shop/actions.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the add-product form**

```tsx
// src/app/(dashboard)/dashboard/admin/shop/AddProductForm.tsx
"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addProductSchema, type AddProductInput } from "@/features/shop/schemas";
import { addProduct } from "@/features/shop/actions";

export function AddProductForm() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddProductInput>({
    resolver: zodResolver(addProductSchema),
  });

  if (!open) {
    return <button onClick={() => setOpen(true)} className="bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs w-fit">Add product</button>;
  }

  return (
    <form
      onSubmit={handleSubmit((data) => startTransition(async () => { await addProduct(data); reset(); setOpen(false); }))}
      className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 max-w-[420px]"
    >
      <input {...register("name")} placeholder="Product name" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.name && <p className="text-[var(--red)] text-sm">{errors.name.message}</p>}
      <input {...register("price", { valueAsNumber: true })} type="number" placeholder="Price (cents)" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.price && <p className="text-[var(--red)] text-sm">{errors.price.message}</p>}
      <input {...register("stock", { valueAsNumber: true })} type="number" placeholder="Stock" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.stock && <p className="text-[var(--red)] text-sm">{errors.stock.message}</p>}
      <input {...register("category")} placeholder="Category" className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]" />
      {errors.category && <p className="text-[var(--red)] text-sm">{errors.category.message}</p>}
      <button disabled={isPending} className="bg-[var(--red)] text-white p-3 font-bold uppercase tracking-widest text-xs">
        {isPending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Write the page**

```tsx
// src/app/(dashboard)/dashboard/admin/shop/page.tsx
import { getAllProducts } from "@/features/shop/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddProductForm } from "./AddProductForm";

export default async function AdminShopPage() {
  const products = await getAllProducts();

  return (
    <>
      <Topbar title="Shop" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <AddProductForm />
        {products.length === 0 ? (
          <EmptyState body="No products yet." />
        ) : (
          <DataTable
            columns={[
              { header: "Product", render: (r) => r.name },
              { header: "Price", render: (r) => r.price },
              { header: "Category", render: (r) => r.category },
              { header: "Stock", render: (r) => <StatusBadge label={`${r.stock} in stock`} color={r.stockColor} /> },
            ]}
            rows={products}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 8: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/shop/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/shop/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 9: Manual verification** — visit `/dashboard/admin/shop`, confirm seeded products list, add a new product via the form, confirm it appears after submit.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add admin shop page with add-product action"
```

---

## Task 26: Admin — Orders

**Files:**
- Create: `src/features/shop/queries.ts` — add `getAllOrders()` (append to Task 25's file)
- Create: `src/app/(dashboard)/dashboard/admin/orders/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/orders/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/orders/error.tsx`

**Interfaces:**
- Produces: `getAllOrders(): Promise<{id:string;customer:string;items:string;status:string;statusColor:string}[]>`

- [ ] **Step 1: Add the query**

```ts
// append to src/features/shop/queries.ts
export async function getAllOrders() {
  const orders = await db.order.findMany({
    include: { user: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => ({
    id: o.id, customer: o.user.name,
    items: o.items.map((i) => `${i.product.name} ×${i.qty}`).join(", "),
    status: o.status, statusColor: o.status === "DELIVERED" ? "var(--dim)" : o.status === "SHIPPED" ? "var(--mut)" : "var(--red)",
  }));
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/(dashboard)/dashboard/admin/orders/page.tsx
import { getAllOrders } from "@/features/shop/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function AdminOrdersPage() {
  const orders = await getAllOrders();

  return (
    <>
      <Topbar title="Orders" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {orders.length === 0 ? (
          <EmptyState body="No orders yet." />
        ) : (
          <DataTable
            columns={[
              { header: "Customer", render: (r) => r.customer },
              { header: "Items", render: (r) => r.items },
              { header: "Status", render: (r) => <StatusBadge label={r.status} color={r.statusColor} /> },
            ]}
            rows={orders}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/orders/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/orders/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 4: Manual verification** — visit `/dashboard/admin/orders`, confirm the seeded order (Marcus Reid, gloves, SHIPPED) renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin orders dashboard page"
```

---

## Task 27: Admin — Content & Gallery

**Files:**
- Create: `src/features/content/schemas.ts`
- Create: `src/features/content/queries.ts`
- Create: `src/features/content/actions.ts`
- Test: `src/features/content/actions.test.ts`
- Create: `src/app/(dashboard)/dashboard/admin/content/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/content/PublishButton.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/content/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/content/error.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/gallery/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/gallery/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/gallery/error.tsx`

**Interfaces:**
- Produces: `publishPostSchema`, `publishPost(input): Promise<{ok:true}>`, `getAllPosts()`, `getGalleryImages()`

- [ ] **Step 1: Write the schema**

```ts
// src/features/content/schemas.ts
import { z } from "zod";

export const publishPostSchema = z.object({ postId: z.string().min(1) });
export type PublishPostInput = z.infer<typeof publishPostSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// src/features/content/actions.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { post: { update: vi.fn() } } }));
vi.mock("@/lib/rbac", () => ({ getSession: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { publishPost } from "./actions";

describe("publishPost", () => {
  it("rejects non-admins", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });
    await expect(publishPost({ postId: "p1" })).rejects.toThrow("Forbidden");
  });

  it("publishes for admins", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.post.update as any).mockResolvedValue({ id: "p1", status: "PUBLISHED" });
    const result = await publishPost({ postId: "p1" });
    expect(result).toEqual({ ok: true });
    expect(db.post.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "PUBLISHED" } });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/content/actions.test.ts`
Expected: FAIL — `./actions` module not found.

- [ ] **Step 4: Implement query + action**

```ts
// src/features/content/queries.ts
import { db } from "@/lib/db";

export async function getAllPosts() {
  const posts = await db.post.findMany({ orderBy: { createdAt: "desc" } });
  return posts.map((p) => ({
    id: p.id, title: p.title, tag: p.tag, views: p.views, status: p.status,
    statusColor: p.status === "DRAFT" ? "var(--red)" : "var(--mut)",
  }));
}

export async function getGalleryImages() {
  const images = await db.galleryImage.findMany();
  return images.map((i) => ({ id: i.id, url: i.url, caption: i.caption }));
}
```

```ts
// src/features/content/actions.ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { publishPostSchema, type PublishPostInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function publishPost(rawInput: PublishPostInput) {
  const input = publishPostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.post.update({ where: { id: input.postId }, data: { status: "PUBLISHED" } });
  revalidatePath("/dashboard/admin/content");
  return { ok: true as const };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/content/actions.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the publish button**

```tsx
// src/app/(dashboard)/dashboard/admin/content/PublishButton.tsx
"use client";
import { useTransition } from "react";
import { publishPost } from "@/features/content/actions";

export function PublishButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button disabled={isPending} onClick={() => startTransition(() => { publishPost({ postId }); })}
      className="border border-[var(--line2)] px-4 py-2 text-xs uppercase tracking-widest">
      {isPending ? "Publishing…" : "Publish"}
    </button>
  );
}
```

- [ ] **Step 7: Write the content page**

```tsx
// src/app/(dashboard)/dashboard/admin/content/page.tsx
import { getAllPosts } from "@/features/content/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PublishButton } from "./PublishButton";

export default async function AdminContentPage() {
  const posts = await getAllPosts();

  return (
    <>
      <Topbar title="Content" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {posts.length === 0 ? (
          <EmptyState body="No posts yet." />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4 border-b border-[var(--line)] last:border-0">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-[var(--dim)] text-xs">{p.tag} · {p.views} views</div>
                </div>
                <StatusBadge label={p.status} color={p.statusColor} />
                {p.status === "DRAFT" && <PublishButton postId={p.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 8: Content loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/content/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/content/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 9: Write the gallery page**

```tsx
// src/app/(dashboard)/dashboard/admin/gallery/page.tsx
import { getGalleryImages } from "@/features/content/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function AdminGalleryPage() {
  const images = await getGalleryImages();

  return (
    <>
      <Topbar title="Gallery" />
      <div className="p-7 max-w-[1200px]">
        {images.length === 0 ? (
          <EmptyState body="No gallery images yet." />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="border border-[var(--line)]">
                <img src={img.url} alt={img.caption} className="w-full h-[150px] object-cover block" />
                <div className="p-2 text-[var(--dim)] text-xs">{img.caption}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 10: Gallery loading/error boundaries**

```tsx
// src/app/(dashboard)/dashboard/admin/gallery/loading.tsx
import { ChartSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><ChartSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/gallery/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 11: Manual verification** — visit `/dashboard/admin/content`, click Publish on the draft post, confirm it flips to PUBLISHED; visit `/dashboard/admin/gallery`, confirm the seeded image renders.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add admin content and gallery dashboard pages"
```

---

## Task 28: Admin — Settings & Roles

**Files:**
- Create: `src/features/analytics/schemas.ts` (role-change schema — lives here since it's the only admin-wide settings feature; no dedicated "settings" feature folder needed per YAGNI)
- Modify: `src/features/memberships/actions.ts` (new file — role update action)
- Test: `src/features/memberships/actions.test.ts`
- Create: `src/app/(dashboard)/dashboard/admin/settings/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/roles/page.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/roles/RoleSelect.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/settings/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/settings/error.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/roles/loading.tsx`
- Create: `src/app/(dashboard)/dashboard/admin/roles/error.tsx`

**Interfaces:**
- Produces: `updateUserRoleSchema`, `updateUserRole(input): Promise<{ok:true}>`

- [ ] **Step 1: Write the schema**

```ts
// src/features/analytics/schemas.ts
import { z } from "zod";

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["MEMBER", "TRAINER", "ADMIN"]),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
```

- [ ] **Step 2: Write the failing test**

```ts
// src/features/memberships/actions.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { user: { update: vi.fn() } } }));
vi.mock("@/lib/rbac", () => ({ getSession: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { updateUserRole } from "./actions";

describe("updateUserRole", () => {
  it("rejects non-admins", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });
    await expect(updateUserRole({ userId: "u2", role: "ADMIN" })).rejects.toThrow("Forbidden");
  });

  it("updates the role for admins", async () => {
    (getSession as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    (db.user.update as any).mockResolvedValue({ id: "u2", role: "TRAINER" });
    const result = await updateUserRole({ userId: "u2", role: "TRAINER" });
    expect(result).toEqual({ ok: true });
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "u2" }, data: { role: "TRAINER" } });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/memberships/actions.test.ts`
Expected: FAIL — `./actions` module not found.

- [ ] **Step 4: Implement the action**

```ts
// src/features/memberships/actions.ts
"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { updateUserRoleSchema, type UpdateUserRoleInput } from "@/features/analytics/schemas";
import { revalidatePath } from "next/cache";

export async function updateUserRole(rawInput: UpdateUserRoleInput) {
  const input = updateUserRoleSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.user.update({ where: { id: input.userId }, data: { role: input.role } });
  revalidatePath("/dashboard/admin/roles");
  return { ok: true as const };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/memberships/actions.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the RoleSelect client component**

```tsx
// src/app/(dashboard)/dashboard/admin/roles/RoleSelect.tsx
"use client";
import { useTransition } from "react";
import { updateUserRole } from "@/features/memberships/actions";

const ROLES = ["MEMBER", "TRAINER", "ADMIN"] as const;

export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      disabled={isPending}
      defaultValue={currentRole}
      onChange={(e) => startTransition(() => { updateUserRole({ userId, role: e.target.value as typeof ROLES[number] }); })}
      className="border border-[var(--line2)] bg-transparent p-2 text-[var(--txt)] text-xs uppercase tracking-widest"
    >
      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
    </select>
  );
}
```

- [ ] **Step 7: Write the roles page**

```tsx
// src/app/(dashboard)/dashboard/admin/roles/page.tsx
import { db } from "@/lib/db";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { RoleSelect } from "./RoleSelect";

export default async function AdminRolesPage() {
  const users = await db.user.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <Topbar title="Roles" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {users.length === 0 ? (
          <EmptyState body="No users yet." />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--line)]">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4 border-b border-[var(--line)] last:border-0">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{u.name}</div>
                  <div className="text-[var(--dim)] text-xs">{u.email}</div>
                </div>
                <RoleSelect userId={u.id} currentRole={u.role} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 8: Write the settings page (permission matrix, read-only display per handoff §5)**

```tsx
// src/app/(dashboard)/dashboard/admin/settings/page.tsx
import { Topbar } from "@/components/shared/Topbar";

const PERMS = [
  ["Book classes", true, true, true],
  ["View own training data", true, true, true],
  ["Manage client programs", false, true, true],
  ["Mark attendance", false, true, true],
  ["Manage members & billing", false, false, true],
  ["Edit plans & pricing", false, false, true],
  ["Publish content", false, false, true],
  ["Manage roles & settings", false, false, true],
] as const;

export default function AdminSettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <div className="p-7 max-w-[1200px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="text-left p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">Permission</th>
              <th className="p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">Member</th>
              <th className="p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">Trainer</th>
              <th className="p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">Admin</th>
            </tr>
          </thead>
          <tbody>
            {PERMS.map(([name, m, t, a]) => (
              <tr key={name as string} className="border-b border-[var(--line)]">
                <td className="p-3 text-sm">{name}</td>
                <td className="p-3 text-center" style={{ color: m ? "var(--red)" : "var(--dim)" }}>{m ? "✓" : "—"}</td>
                <td className="p-3 text-center" style={{ color: t ? "var(--red)" : "var(--dim)" }}>{t ? "✓" : "—"}</td>
                <td className="p-3 text-center" style={{ color: a ? "var(--red)" : "var(--dim)" }}>{a ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 9: Loading/error boundaries for both routes**

```tsx
// src/app/(dashboard)/dashboard/admin/settings/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/settings/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

```tsx
// src/app/(dashboard)/dashboard/admin/roles/loading.tsx
import { TableSkeleton } from "@/components/shared/Skeletons";
export default function Loading() { return <div className="p-7"><TableSkeleton /></div>; }
```

```tsx
// src/app/(dashboard)/dashboard/admin/roles/error.tsx
"use client";
import { ErrorState } from "@/components/shared/ErrorState";
export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-7"><ErrorState onRetry={reset} /></div>;
}
```

- [ ] **Step 10: Manual verification** — visit `/dashboard/admin/settings`, confirm permission matrix renders; visit `/dashboard/admin/roles`, change a user's role via the select, reload, confirm it persisted.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add admin settings and roles dashboard pages"
```

---

## Task 29: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Full lint**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 3: Full production build**

Run: `npm run build`
Expected: zero errors, all `(dashboard)` routes listed in the route summary.

- [ ] **Step 4: Full test suite**

Run: `npx vitest run`
Expected: all tests pass (rbac, bookings, workouts, shop, content, memberships).

- [ ] **Step 5: Manual walkthrough**

Run: `npm run dev`. Log in as each seeded user and click through every tab in their sidebar:
- `marcus@fightclub.gym` / `password123` → all 6 member tabs
- `ana@fightclub.gym` / `password123` → all 4 trainer tabs (including a client detail page)
- `danny@fightclub.gym` / `password123` → all 10 admin tabs

Confirm no console errors in the browser dev tools on any page, and that a role that isn't ADMIN gets redirected away from `/dashboard/admin/*` if visited directly by URL.

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification pass for Phase 1 foundation + dashboards"
```
