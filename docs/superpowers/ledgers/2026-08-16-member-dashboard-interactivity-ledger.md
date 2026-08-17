# SDD ledger — plan: docs/superpowers/plans/2026-08-16-member-dashboard-interactivity.md

Spec: docs/superpowers/specs/2026-08-16-dashboard-interactivity-design.md (read — binding authority)
Worktree: .claude/worktrees/phase4-member-dashboard on branch `phase4-member-dashboard`, branched from master @74bf428
  (both removed after the merge — the commit range 74bf428..da85c8e is now on master; see POST-MERGE FOLLOW-UP below)
Baseline: 12 test files, 60 tests passing, 0 failures.
Note: the worktree has its own copy of `dev.db` and `.env` (DATABASE_URL is `file:./dev.db`, relative),
so Task 1's `prisma db push` cannot touch the user's main database.

## Pre-flight conflict scan

### Cross-task pairs (shared file or interface)

| Pair | Produced → Consumed | Finding |
|---|---|---|
| T2 → T3 | `computeStreak(dates, today?)` → called with one arg in `getAttendanceSummary` | Clean |
| T3 → T8 | overview CTA `href="/dashboard/member/classes"` → route created in T8 | **Dead link between T3 and T8.** Plan states this explicitly. Ruled below. |
| T4 → T5 | `getNotifications` returns `{items, unread}` → `NotificationState = {items, unread}` | Clean — shapes identical |
| T4 → T6, T7, T10 | `notify(userId, title, body)` → all three call it with 3 args | Clean |
| T4 → T10 | `features/profile/{actions,schemas}.ts` created in T4, appended in T10 | Clean — T10 appends, does not rewrite |
| T4 → T11 | `updateProfile` moves path; `ProfileForm` import updated | Clean — verified only `ProfileForm.tsx:3` imports `features/notifications` |
| T6 → T7 | `db` mock shape (`__tx`, `mockedNotify`) established in T6 → reused in T7 | Clean, but strictly ordered: T7 cannot run before T6 |
| T6 → T7 | `cancelBooking` still uses top-level `db.booking.*` at end of T6 | Clean — T6's replacement mock keeps `booking: {findUnique, update}` at top level, so existing tests pass until T7 moves them to `tx` |
| T6, T7 → T8 | `bookClass` returns `{ok, status}` → `ClassCard` awaits, ignores value | Clean |
| T1 → T9 | `MembershipFreeze {from, to}` → `computeFreezeAllowance` param shape | Clean |
| T1 → T10 | `cancelRequestedAt`, `freezes` relation → used in actions and query | Clean |
| T9 → T10 | `computeFreezeAllowance`, `MAX_FREEZE_WEEKS_PER_YEAR` → schemas, actions, memberships/queries | Clean |
| T10 → T11 | `getMembershipStatus` `frozenUntil`/`cancelEffectiveAt` as `Date \| null` → `MembershipControls` props as `string \| null` | Clean — page converts via `?.toLocaleDateString() ?? null` |
| T8 → Sidebar | `NAV_BY_ROLE.MEMBER` gains an entry | Clean — verified sole consumer is `Sidebar.tsx:26`, which maps generically; no test asserts on nav contents |

### Per-task self-consistency

| Task | Own text agrees with itself? |
|---|---|
| T1 | Yes — schema additions are optional, seed left unmodified and re-run as proof |
| T2 | Yes — 6 test cases map 1:1 onto the two stated rules |
| T3 | Yes — query and page imports match what T2 produced |
| T4 | Yes — 5 files; import fan-out verified as one line |
| T5 | Yes — `notifications` crosses the server→client boundary as plain JSON (`createdAt` already a string) |
| T6 | Yes — `vi.clearAllMocks()` clears calls but preserves the `$transaction` implementation (clear ≠ reset), so the inline-transaction mock survives every test |
| T7 | Yes — rewrites the three existing `cancelBooking` tests onto `tx`; ownership guard unchanged |
| T8 | Yes — route, query, nav entry and both page states all present |
| T9 | Yes — 4 test cases, including the negative-clamp case |
| T10 | Yes — test mocks `db.user.update` because `updateProfile` shares `actions.ts` |
| T11 | Yes — `remainingWeeks: 0` disables the select and renders no options |

### Pre-flight rulings

Ruling: T3's overview CTA may point at the not-yet-existing `/dashboard/member/classes` — the plan
creates that route in T8 within the same branch, and splitting T3 to avoid a transient dead link would
mean editing the same file twice. Cost if wrong: a broken link on the overview page for the span of
tasks 4-7, visible only to someone running the branch mid-plan.

## Progress

Task 1: complete (commits 74bf428..d5270fe, review clean)
Task 1: ⚠️ resolved by controller — reviewer could not verify tooling ran from a schema-only diff.
  Verified directly: `npx prisma validate` passes and the generated client exposes MembershipFreeze
  (483 refs in node_modules/.prisma/client/index.d.ts). Not a gap; tasks 9-11 can rely on it.
Task 1: minor (deferred): no `@@index` on MembershipFreeze.membershipId — forward-looking only,
  freeze lookups arrive in Task 10.

Task 2: complete (commits d5270fe..f8d8aba, review clean)
  Reviewer hand-traced all 6 cases against the implementation; both load-bearing behaviours
  (same-day dedup, forgiving a missing check-in today) are genuinely covered.

Ruling: the plan requires a live 320/768/1280px browser check inside every UI task (3, 5, 8, 11),
  but implementer subagents here have no browser tooling. Splitting the difference: each UI
  implementer verifies the responsive classes statically against the brief and confirms the route
  compiles and serves, and I run ONE consolidated live viewport pass after Task 11 covering every
  new surface at all three widths. Cost if wrong: a layout defect that only shows in a real
  browser survives until that final pass instead of being caught in its own task — cheap to fix
  then, since all four surfaces get looked at together anyway.

Task 3: complete (commits f8d8aba..4e2abfb, review clean)
Task 3: minor (deferred): the streak StatCard always passes a truthy `delta` ("day"/"days") while
  every other card on that row passes `delta: ""`, so it is the only card in the grid row with a
  rendered delta line. Cosmetic only (grid stretch keeps borders aligned). Inherited from the
  plan's own prescribed code, not implementer error. Worth a look in the final review.
Task 3: minor (deferred): `getAttendanceSummary` loads a member's entire AttendanceLog history
  with no take/date bound before slicing to 8. Correct — the streak needs full history — but
  unbounded for a long-tenured member.
Task 3: minor (deferred): `total` is returned by `getAttendanceSummary` and not consumed by the
  overview page.

Task 4: complete (commits 4e2abfb..0da4c1b, review clean)
  Reviewer verified the two load-bearing behaviours are real, not tautological: the row write sits
  OUTSIDE the try/catch (so a failing create propagates) while only lookup+send are wrapped; and
  deleting the ownership check in markNotificationRead would actually fail its test.
Task 4: ⚠️ both resolved by controller — (1) `notify()` has no caller in this diff: by design,
  Tasks 6, 7 and 10 all invoke it, so it is not dead code. (2) `getNotifications` has no page
  consumer yet: Task 5 wires it into all three role layouts.
Task 4: minor (deferred): no test asserts that a failing `db.notification.create` propagates
  rather than being swallowed. Code is structurally correct; only the sendEmail direction is tested.
Task 4: minor (deferred) — CARRY INTO TASK 6: `notify.ts` interpolates `body` into email HTML
  unescaped (`html: \`<p>${body}</p>\``). Harmless while every caller passes server-authored
  literals, but Task 6 starts passing `class.title` — admin-controlled DB data — through it.
  Not fixed now because it is genuinely low severity (the email goes to the member themselves);
  flagged to Task 6's implementer and to the final review.

Task 5: complete (commits 0da4c1b..f1a178c, review clean)
  Note: this implementer's first run died to an API connection error immediately before writing its
  report; the commit had already landed clean. Resumed the agent for the report only, with explicit
  instructions not to touch the implementation. Reviewer judged the test evidence credible
  (incidental detail — PIDs, timestamps — reads as captured, not reconstructed).
  Reviewer confirmed the sidebar grid/drawer/Escape logic is byte-identical, only re-indented, and
  that all three layouts kept their own userPlan ("Owner · Admin" / "Coach" / membership?.plan).
Task 5: side effect worth surfacing — the implementer killed a stray process holding port 3200
  during verification. If that was the user's own dev server, it is now stopped. No data affected.
Task 5: minor (deferred): notification panel has no Escape-to-close, though the sibling sidebar
  drawer in the same file does. Inconsistent for keyboard-only users.
Task 5: minor (deferred): panel uses `role="dialog"` without `aria-modal` or focus management,
  unlike the drawer. Lifted verbatim from the plan's own code — a spec-authoring nit, not an
  implementer deviation.
Task 5: minor (deferred): mark-read failures are swallowed with no user feedback. Consistent with
  the codebase (no toast infrastructure exists anywhere) and defensible for a retryable,
  non-destructive action.

Task 6: review returned Approved WITH an Important finding (plan-mandated). Rulings:

Ruling: fix the Important finding rather than accept it. The reviewer showed that three named
  behaviours would survive deletion with all six tests still green — most damningly the
  cancelled-rebook rule, which the SPEC itself states outright ("a member who cancelled may book
  that class again"). The plan prescribed the six tests, so this is my authoring gap, not the
  implementer's; but the spec is the binding authority and it names the behaviour, so untested is
  not good enough. Cost if wrong: one extra fix round on a task already shipping correct code.

Ruling: pull Minor #4 (a `notify` failure rejects an already-committed booking) into the same fix
  round despite being rated Minor. Reason: it is load-bearing for the NEXT task — Task 7 adds a
  second `notify` call to `cancelBooking` and would replicate the same bug. Fixing the pattern now
  costs two lines; fixing it after Task 7 costs two tasks. Cost if wrong: a try/catch around a
  best-effort call that was already documented as best-effort.

Ruling: pull Minor #5 (capacity is hardcoded 2 in every test, so `confirmed < 2` would also pass)
  into the same round. It is the same defect class as the Important finding — a test that does not
  pin what it claims to pin — and the implementer is already editing that file. Cost if wrong:
  one extra test case.

Task 6: minor (deferred): SQLite/Prisma deferred transactions mean the losing racer likely gets
  SQLITE_BUSY rather than a WAITLIST row. Safety half holds (never over-confirmed), liveness half
  does not. Fix is app-wide (busy_timeout / BEGIN IMMEDIATE / retry), not task-scoped. The code
  comment claims more than the engine delivers — carry to final review.
Task 6: minor (deferred): no `@@unique([userId, classId])` on Booking, so findFirst-then-create is
  an unbacked check-then-act. Correct today (a plain unique index would break the cancelled-rebook
  rule) and masked by SQLite's write lock, but would double-book on a future Postgres migration.
Task 6: minor (deferred): redundant `as "CONFIRMED" | "WAITLIST"` cast; the ternary already infers it.
Task 6: minor (deferred): WAITLIST notification copy never asserted; only the CONFIRMED branch is.
Task 6: NAMED GAP (accepted, not fixable here): the atomicity guarantee has zero automated evidence.
  `$transaction: vi.fn(async (fn) => fn(tx))` runs the callback inline — deleting `db.$transaction`
  entirely would leave all tests green. Proving it needs an integration test against a live SQLite
  file, which the plan did not scope. Named here rather than glossed.
Task 6: fix round 1/5 (5 addressed, 0 open — 1a cancelled-rebook coverage, 1b CONFIRMED-only count
  coverage, 1c notify ordering, 2 notify-failure swallowing, 3 capacity variety; commits
  8cb49a1..efbd089)
  Re-reviewer applied the deletion test to each and named the biting assertion: findFirst/count
  `toHaveBeenCalledWith` deep-equality, an ordering array asserting `["transaction", "notify"]`,
  and a rejected-notify test that would throw without the try/catch. All bite.
Task 6: complete (commits f1a178c..efbd089, review clean after 1 fix round)

Ruling: Task 7's brief predates finding 2, so its prescribed `cancelBooking` code calls `notify`
  unguarded — exactly the bug just fixed in `bookClass`. Carrying the try/catch pattern into Task 7
  rather than letting it land and be re-found. This deviates from the brief's literal text, which
  the implementer is told to follow verbatim, so the instruction is explicit in the dispatch.
  Cost if wrong: `cancelBooking` swallows a notification-write failure — the same trade already
  accepted for `bookClass`.

Task 7: complete (commits efbd089..41e00ce, review clean)
  All five rules deletion-tested by the reviewer with the biting assertion named: ownership guard
  survived the move into the transaction (rebound db->tx, logic verbatim); waitlist-cancel
  short-circuits BEFORE querying the waitlist and the test asserts findFirst was never called;
  oldest-wins pinned by exact `orderBy: { createdAt: "asc" }`; notify ordering pinned by the
  shared order array. Reviewer also established that self-promotion is structurally impossible,
  not merely untested — bookClass's conflict guard prevents a user holding CONFIRMED and WAITLIST
  on the same class at once.
  The implementer's unprompted addition (ordering assertion on the promotion path) was judged
  justified, not scope creep — it closes a gap the brief's literal test block left open.
Task 7: minor (deferred): the notify try/catch-and-log block is now near-verbatim duplicated
  between `cancelBooking` and `bookClass`. Two call sites is a defensible place not to abstract,
  but a `notifyBestEffort` helper would remove it.
Task 7: minor (deferred, pre-existing): `cancelBooking` does not guard against cancelling an
  already-CANCELLED booking. Harmless (promotion correctly skips) and unchanged by this diff.

Task 8: complete (commits 41e00ce..382048a, review clean)
  Pre-flight dead-link ruling is now DISCHARGED: reviewer verified the overview CTA's href and the
  created route path match exactly, so the transient dead link is closed as predicted.
  Reviewer also confirmed the UI's "full" definition matches `bookClass`'s own atomic seat check
  (both count only CONFIRMED against capacity), so the button state cannot drift from what the
  server will actually decide.
  Implementer respected the port instruction — found 3200 occupied, used 3201, left the other
  process alone.
Task 8: minor (deferred): `loading.tsx` uses the generic single-bar `TableSkeleton` for what
  renders as a card grid — shape mismatch. It is the plan's own instruction and matches every
  sibling route, so it is a convention question for the final review, not a defect here.
Task 8: minor (deferred): the book button is `w-full` at every breakpoint, not just mobile.

Task 9: complete (commits 382048a..8a8d33a, review clean)
  TDD red step confirmed genuine — failed with "Cannot find module './freeze-allowance'", i.e. a
  module-not-found, not an assertion failure. The implementer's ambiguous "passed on first run"
  phrasing did not reflect a skipped red step.
Task 9: ⚠️ resolved by controller — report claimed 17 test files, which reconciled with nothing.
  Ran `npm test` directly: 16 files / 91 tests passing, exactly the brief's predicted arithmetic.
  The 17 was prose error in the report, not baseline drift.
Task 9: minor (deferred): no guard for a freeze whose `to` precedes `from` — would subtract from
  the total and could push remainingWeeks above the cap. Not reachable from Task 10's action,
  which always computes `to = from + weeks*WEEK` from `now`, so this is a data-integrity note
  about hand-edited rows rather than a live path.
Task 9: minor (deferred): `Math.round` on the ms->weeks conversion is untested at non-integer
  boundaries; every test uses exact week multiples, so round/floor/ceil are indistinguishable.
  Inherited from the plan's fixed test list.

Task 10: review returned NEEDS FIXES — two Important findings, both real. Rulings:

Ruling: fix the repeat-freeze bug by starting a new freeze at `max(now, frozenUntil)` rather than
  always `now`. The current code truncates: a member frozen through day 29 who freezes 2 more weeks
  on day 10 gets `frozenUntil` overwritten to day 24 — losing five days already granted — and the
  overlapping days are charged twice against the 8-week cap because each call inserts an unrelated
  MembershipFreeze row. Extending from `frozenUntil` makes the windows non-overlapping, so the
  allowance sum stays correct and no freeze is ever shortened. I chose extend over reject-while-
  frozen because a member asking for two more weeks means two MORE weeks, and rejecting forces
  them to wait until they are unfrozen to ask. Cost if wrong: freezes stack where the business
  might have wanted them to require a fresh request.

Ruling: fix the unguarded `cancelSubscription` by REORDERING rather than by wrapping it. The
  reviewer is right that it sits where `notify` was guarded, but wrong that the fix is symmetric:
  `notify` is genuinely best-effort, whereas a failed Stripe cancellation must NOT be swallowed —
  telling a member "cancelled" while billing silently continues is the worse outcome of the two.
  So the call moves BEFORE the `cancelRequestedAt` write and stays unguarded, with a comment
  saying why it differs from `notify`. Ordering matters: Stripe-fails-then-no-record leaves the
  member still billed and still with access (consistent, recoverable); record-written-then-Stripe-
  fails leaves them believing they cancelled while being charged (consumer harm). Cost if wrong:
  a Stripe success followed by a DB failure cancels billing without recording it — the member
  keeps access we no longer charge for, which a Stripe webhook can reconcile.

Task 10: minor (deferred): `CANCELLATION_NOTICE_DAYS = 30` exists in actions.ts but queries.ts
  hardcodes `30 * DAY` inline; they agree today, nothing enforces they stay in sync. Also `DAY_MS`
  and `DAY` are the same constant defined in both files.
Task 10: minor (deferred): no "no membership" test for `cancelMembership`, unlike freezeMembership.
  The guard exists and mirrors the tested one.
Task 10: minor (deferred): repeated `cancelMembership` calls silently reset the notice clock,
  pushing `effectiveAt` further out rather than being a no-op. Unspecified by the plan; needs a
  product decision, not a code fix.
Task 10: fix round 1/5 (2 addressed, 0 open — freeze now extends from frozenUntil instead of
  truncating; cancelSubscription moved before the DB write and left deliberately unguarded;
  commits 2ad2e4d..a272552)
  Re-reviewer confirmed the implementer did NOT wrap cancelSubscription in a try/catch — it
  correctly avoided generalising the earlier `notify` fix to a case where swallowing is wrong.
  The unrequested mock-leakage fix was judged genuine and correctly scoped: `vi.clearAllMocks()`
  clears call history but not configured rejections, so a rejection could leak between tests.
  It does not mask or fabricate either finding's result.
Task 10: complete (commits 8a8d33a..a272552, review clean after 1 fix round)

Task 11: review returned NEEDS FIXES — two Important findings, both plan-mandated. Rulings:

Ruling: fix finding 1 (stale `weeks` selection) by CLAMPING the value the component uses, not by
  resetting state on success. `router.refresh()` updates props without remounting the component, so
  local `weeks` survives while `remainingWeeks` shrinks — the select then holds a value with no
  matching option and the button still submits it. Clamping (`Math.min(weeks, remainingWeeks)`) for
  both the select's value and the action argument makes the mismatch unrepresentable rather than
  merely corrected after the fact. Cost if wrong: a member who picked 5 weeks and had their
  allowance drop silently gets the smaller number instead of an error.

Ruling: fix finding 2 only PARTLY, and not the way the reviewer proposed. The reviewer wants the
  server's specific message ("Freeze allowance exceeded: N week(s) left") surfaced from the catch.
  That does not work in production: Next.js redacts Server Action error messages to a generic
  string plus a digest, so `err.message` would show the real reason in dev and something useless
  in prod — the worst kind of fix, one that tests well locally and fails where it matters.
  Instead: clamping (above) makes the allowance-exceeded path unreachable through the UI, and the
  message gets a concrete recovery hint without depending on the thrown text. Cost if wrong: a
  member hitting a genuine allowance rejection through some path I have not foreseen still sees a
  generic message.

Task 11: minor (deferred): nothing visually distinguishes "0 weeks left, select disabled and empty"
  from a broken or loading control. Matches the plan's spec exactly; flagged for the live pass.
Task 11: fix round 1/5 (2 addressed, 0 open — selectedWeeks clamp; non-server-text error hint;
  commits 5ddff2d..da85c8e)
  Re-reviewer confirmed the implementer did NOT surface `err.message`, and independently verified
  the next.config.ts claim by reading the file — only `images.remotePatterns`, nothing touching
  Server Action error serialization. My redaction reasoning stands.
  Clamp edge case checked: remainingWeeks=0 gives selectedWeeks=0, but both select and button are
  disabled in that state so 0 can never be submitted.
Task 11: complete (commits a272552..da85c8e, review clean after 1 fix round)

ALL 11 TASKS COMPLETE. Proceeding to final whole-branch review + the consolidated live viewport
pass promised in the responsive ruling above.

FINAL WHOLE-BRANCH REVIEW: "Merge after fixing 5 items". No Critical. Rulings on the wave:

Ruling: fix all 5 Important findings plus 3 of the triaged known issues, in ONE fix wave.
  The five: (1) `freezeMembership` is read-check-write with two unwrapped dependent writes — two
  concurrent requests both read 8 weeks remaining and both write, bypassing the very cap
  MembershipFreeze exists to enforce, and a failed second write spends allowance without freezing;
  (2) spec §2 lists "cancelled" among notify callers and nothing notifies the canceller — the only
  member-phase spec requirement with no implementation, silently dropped by my plan; (3)
  `getBookableClasses` has zero tests and two mutations survive green, one of which (dropping the
  userId predicate) would show a member "Booked" on someone else's booking; (4) cancellation is
  recorded but never executed and the UI promises otherwise forever, plus freezeMembership has no
  server-side guard against a pending cancellation while the UI merely hides the control; (5)
  `revalidatePath("/dashboard")` targets a redirect-only page and never reaches the layouts where
  getNotifications runs — the bell works only because of client-side router.refresh().
  Cost if wrong: a larger final diff than a pure "ship it" call would produce.

Ruling: also fix notify.ts HTML escaping, the CANCELLATION_NOTICE_DAYS/DAY_MS duplication, and
  trim the transaction comment that over-claims what SQLite delivers. The reviewer marked the
  first two FIX BEFORE MERGE and I agree: the escaping fix is three lines at the funnel every
  future caller inherits (the admin phase routes admin-typed product names through it), and the
  30-day constant has a correctness contract with no test behind it — if the two copies drift, the
  profile card shows a different date than the action computed, silently.

Ruling: pull in two Minors the reviewer rated below the bar — the missing "class already started"
  check in `bookClass`, and using `from.getFullYear()` rather than `new Date().getFullYear()` for
  the allowance year. Both are inside functions the wave already rewrites, both are two-line
  changes, and the first is a genuine hole: server actions are public endpoints, so a direct call
  books a member into a class that already happened. Cost if wrong: marginally more surface in an
  already-large wave.

Ruling: do NOT build the cancellation scheduler on this branch. It is real infrastructure (a cron
  or a lazy status check) that the spec never scoped, and inventing it here would be the largest
  unreviewed change in the branch. Record the gap in the spec's own out-of-scope section and add
  the cheap server-side guard instead. Cost if wrong: a member who cancels sees "active until
  <date>" indefinitely past that date until the admin phase or a follow-up addresses it — visible,
  non-destructive, and now written down rather than discovered.

FIX WAVE RE-REVIEW: all 9 addressed, no new Critical/Important breakage. All three unprompted
  implementer decisions judged sound — notably putting the shared constants in a new
  `profile/constants.ts` because `actions.ts` is `"use server"` and Next forbids non-async exports
  from such a file (a build error, not a style choice), with no import cycle created.

Ruling: PARK the one real regression the wave introduced rather than opening a second fix wave.
  FIX 2 made the canceller's notify call #1, so the pre-existing `mockRejectedValueOnce` test now
  fails call 1 instead of the promotion notify — meaning nothing covers the promotion notify's
  try/catch any more, and deleting it would leave the suite green. It is a one-line test fix
  (`mockResolvedValueOnce().mockRejectedValueOnce()`), but the process allows exactly one fix wave
  after the final review and this is Minor: the guard itself is present and correct, only its
  coverage lapsed. Cost if wrong: an untested error path that is currently written correctly.

LIVE VIEWPORT PASS (the consolidated pass promised in the responsive ruling) — RUN AND PASSED.
  Method: Playwright driving the installed Chrome against a dev server on port 3250, logged in as
  the seeded member, measuring documentElement scrollWidth vs clientWidth, every element's right
  edge, and every interactive element's height at 320 / 768 / 1280px.
  Two obstacles worth recording: (1) `BETTER_AUTH_URL` is pinned to port 3200 in .env, so login
  silently hung until the server was restarted with the var overridden — any future browser check
  on a non-3200 port must do the same; (2) the repo seed's classes are dated 2026-08-08, in the
  past, so the classes grid renders empty. A throwaway fixture added future classes (one open, one
  full, one already booked) and was deleted afterwards; the worktree's dev.db is a copy, so the
  user's database was never touched.
  Results — horizontal overflow: 0 at every width on every surface. Elements painting outside the
  viewport: 0. Notification panel: full-width sheet at 320 (x=0, w=320); right-anchored 360px
  popover at 768 (x=380) and 1280 (x=892) — exactly the designed breakpoint switch. Classes grid:
  1 column at 320 with all three button states rendering correctly. Profile: select and button
  stack vertically at 320 as specified.
  One sub-44px target found, and it is PRE-EXISTING, not from this branch: the "Save" button in
  `ProfileForm.tsx` measures 40px (`p-3` + `text-xs`). That file's only change in this branch was
  its import path.
  One copy bug spotted visually that no reviewer caught: `ClassCard` renders "Full · 1 seats" for a
  capacity-1 class — `${c.capacity} seats` is unconditionally plural.

POST-MERGE FOLLOW-UP (branch already merged to master, worktree removed). Both items the
  branch closed out with rather than fixing are now done, on master, TDD'd:
  - The PARKED regression above is CLOSED (commit f7fe20c). The gap was verified before fixing,
    not assumed: deleting `cancelBooking`'s promotion try/catch left all 19 tests green. The
    corrected test resolves notify call 1 so the rejection reaches call 2, and asserts
    `toHaveBeenCalledTimes(2)` so a future reordering cannot make the rejection silently miss its
    target again. Red step confirmed genuine — failed with the unguarded "notify boom" escaping
    the action, not an assertion mismatch. `actions.ts` byte-identical to HEAD afterwards.
  - The "Full · 1 seats" copy bug found in the live viewport pass is CLOSED (commit a083d63).
    Pluralisation follows capacity in both phrasings; extracted to `features/bookings/seat-label.ts`
    with 5 tests, since the vitest environment is `node` and ClassCard is not renderable here.
    Fixed the second, unreported instance too: "1 of 1 seats left" for a capacity-1 class.
  Suite after: 20 files / 127 tests passing (from 19/122). tsc --noEmit clean, eslint clean.

Deferred by the final review, unchanged: SQLITE_BUSY liveness, @@unique on Booking, @@index on
  MembershipFreeze, the four-copy notify try/catch (right fix is guarding inside notify itself),
  streak delta styling, unbounded AttendanceLog load (note: `take: 8` is NOT the fix — computeStreak
  needs full history; a ~400 bound is the right shape), unused `total`, panel Escape/aria-modal,
  swallowed mark-read failures, card-grid skeleton shape (logged as a real spec deviation), w-full
  button, computeFreezeAllowance guards, missing cancelMembership no-membership test, repeated
  cancel resetting the clock, select value={0}, bare status strings, admin-side derived-FROZEN
  blindness (belongs in the admin plan).

