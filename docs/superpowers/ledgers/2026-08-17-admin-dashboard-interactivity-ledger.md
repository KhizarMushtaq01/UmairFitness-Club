# SDD ledger — plan: docs/superpowers/plans/2026-08-17-admin-dashboard-interactivity.md

Spec: docs/superpowers/specs/2026-08-16-dashboard-interactivity-design.md, §§5-8 (read — binding authority)
Prior phase ledger: docs/superpowers/ledgers/2026-08-16-member-dashboard-interactivity-ledger.md
Worktree: .claude/worktrees/phase5-admin-dashboard on branch `worktree-phase5-admin-dashboard`,
  branched from master @6f6be36.
Baseline at branch point: 20 test files, 127 tests passing, 0 failures. `npx tsc --noEmit` clean,
  `npm run lint` clean.
Note: the worktree has its own copy of `dev.db` and `.env` (DATABASE_URL is `file:./dev.db`,
  relative), so Task 1's `prisma db push` cannot touch the user's main database.

Execution mode: superpowers:executing-plans (single session, no implementer subagents — the user's
  standing instruction in this repo is not to dispatch agents unless asked). So there is no
  implementer/reviewer split in this ledger; each task is implemented and verified in-session, and
  the per-task verification evidence is recorded here in place of a reviewer report.

## Standing rulings

Ruling (inherited from Phase 4, restated): the plan asks for a live browser read at 320 / 768 /
  1280px inside every UI task. Doing that per task means ~8 separate dev-server + login cycles.
  Instead each UI task is verified statically against the responsive brief (classes, 44px targets,
  overflow wrappers) plus `tsc`/`lint`/`build`, and ONE consolidated live viewport pass runs at
  Final Verification across every surface this phase touches. Cost if wrong: a layout defect that
  only shows in a real browser survives to that final pass instead of being caught in its own task
  — cheap to fix then, since all surfaces get looked at together anyway.

## Progress

Task 1: complete (commit 154163e). `Plan` model added with `key @unique`, seed writes the three
  tiers. No FK to `Membership.plan`, per the plan's own instruction.

Task 2: complete (commit 5cc8a4e). Net deletion as Ruling 1 predicted: -128/+58 lines across six
  files. The guard now wraps `notify`'s whole body, including the `db.notification.create` row
  write — this deliberately reverses the Phase 4 arrangement, where the row write sat OUTSIDE the
  try so a failing create would propagate. Ruling 1 accepted that trade; recorded here because it
  is a behaviour change, not just a refactor: a failed notification-row insert is now swallowed and
  logged rather than surfaced to the caller.
  The Phase 4 HTML-escaping fix survived the rewrite — `escapeHtml` still funnels `body`.

Task 3: complete (commit 5aae9d9). `getMemberDetail(id)` returns `null` for a non-MEMBER (Ruling 6).
  History lists capped at 20 rows each while the headline counts come from `_count`, so the numbers
  stay accurate for a long-tenured member whose tables only show a recent window.

Task 4: complete. Files were already written when this session resumed; verified against the plan's
  prescribed code line by line before committing.
Task 4: DELIBERATE DEVIATION from the plan's literal code — the Status `StatCard` does NOT receive
  `deltaColor={detail.statusColor}`. Reason: `StatCard` only renders `deltaColor` inside the
  `{delta && ...}` branch, and this card passes no `delta`, so the prop is inert — it would ship a
  dead attribute that reads as if AT_RISK members are visually flagged when nothing is coloured.
  The query still returns `statusColor`; Task 5's members table is where it actually renders.
  Cost if wrong: an admin gets no colour cue for AT_RISK on the detail page's stat row, the same as
  with the plan's own code. Worth a look in the final review if a real highlight is wanted — that
  needs a `value` colour on `StatCard`, which is out of this phase's scope.
Task 4: verification — `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` 20 files /
  131 tests / 0 failures. Live read deferred to the consolidated pass per the standing ruling.

Task 5: complete (commit 1e2a927). TDD red step confirmed genuine — the `where` came back as
  `{ role: "MEMBER" }` with the OR absent, i.e. the parameter was ignored, not an assertion typo.
  Note on the plan's prediction: it said TWO query-filter tests would fail. Only ONE did. The
  "keeps the role filter when searching" test asserts only `where.role`, which already held before
  the change, so it is a regression guard rather than a red test. The plan's own text allows for
  this ("the other two pass already"); recording the discrepancy so the arithmetic reconciles.
  Suite after: 135 tests.

Task 6: complete (commit c90f895). All 7 tests red at the import level first (`updateMembership is
  not a function`). Ruling 5 honoured — the plan key is checked against `db.plan`, not a Zod enum.
  Note on ordering: `schema.parse` runs BEFORE `assertRole`, matching the sibling `updateUserRole`.
  So a non-admin sending malformed input gets a validation error rather than "Forbidden". No
  information leak (the schema shape is public in the client bundle anyway) and it is the
  established repo pattern, but it does mean the RBAC guard is not literally the outermost check.
  Suite after: 142 tests.

Task 7: complete (commit 44c4cf1). The plan's warning about `plan.findMany` needing a default in
  `beforeEach` was load-bearing exactly as written — `getMemberDetail` became a `Promise.all` that
  maps the result, so without the default every Task 3 test would have died on `undefined.map`.
  Added it before the implementation, so that failure never materialised.
  Suite after: 143 tests.

Task 8: complete (commit 6c4bff7). Ruling 7 honoured — read and write share one `db.$transaction`,
  and the test that pins it (`$transaction` called once) is the one that would stay green if the
  wrapper were deleted, so it is doing real work. `notify` is called with the ORDER's userId, not
  the session's, and the test asserts the exact recipient rather than merely that notify ran.
  NAMED GAP (inherited, same as Phase 4's Task 6): the transaction mock runs its callback inline,
  so deleting `db.$transaction` and calling `db.order.*` directly would still pass everything
  except the call-count assertion. Real atomicity has no automated evidence; proving it needs an
  integration test against a live SQLite file, which this plan did not scope.
  Suite after: 151 tests.

Task 9: complete (commit c140159). Static responsive check done in place of the live read:
  confirmed by reading `DataTable.tsx` that it really does supply `overflow-x-auto` on the wrapper
  and `min-w-[640px]` on the table, so the plan's claim that the TABLE scrolls at 320px while the
  page does not is structurally true rather than assumed. Button is `min-h-[44px] inline-flex`.
Task 9: latent constraint worth knowing — `DataTable` keys both its `<th>` and each `<td>` by
  `c.header`. The new action column uses `header: ""`, which is unique within the orders table but
  would collide with any SECOND empty-header column added to the same table. Tasks 11 and 13 each
  add one such column to a DIFFERENT table, so nothing collides in this phase. A third action
  column on any one table would need a non-empty header or a key change in `DataTable`.

Task 10: complete (commit a50b4e7). The delete guard checks `orderItem.findFirst` BEFORE deleting
  and the test asserts both calls, so the order of operations is pinned rather than incidental —
  which matters because on a database that did cascade, delete-then-catch would silently destroy
  order history. `updateProduct` destructures `productId` out of the payload, so the id can never
  reach the `data` object; the whole-object `toHaveBeenCalledWith` is what bites there.
  Suite after: 159 tests.

Task 11: complete (commit 3c4df56). No new tests — client component, and the vitest environment is
  `node`, so it is not renderable here. Verified statically: fields `w-full` inside a
  `max-w-[420px]` column, both button pairs `flex-col sm:flex-row`, every target `min-h-[44px]`.
  Delete is two-step (Delete → Confirm) so a mis-click cannot destroy a row.
Task 11: minor (deferred): the edit form's price field is labelled "Price in cents" and takes the
  raw integer, so an admin types 12000 to mean $120.00. Correct and unambiguous given the label,
  but it is the only place in the admin UI that asks for cents — `AddProductForm` has the same
  shape, so this is consistent with what already shipped rather than new.
Task 11: minor (deferred): `form` state initialises from props and is never resynced, so if another
  admin edits the same product while this row sits open, Save writes the stale values it was opened
  with. Last-write-wins on a single-admin gym; noted rather than fixed.

Task 12: complete (commit 1dd8a20). `createPost` writes `status: "DRAFT"` unconditionally and the
  test asserts the whole `data` object, so a default of PUBLISHED could not survive. Author comes
  from `session.user.id`, pinned by a second test using a different admin id — a hardcoded id would
  pass the first test and fail the second.
  Unprompted addition, recorded as a deliberate deviation: the plan's Step 4 says to add
  `revalidatePath("/")` to the existing `publishPost` "for the same reason", and I did. Without it,
  publishing a post would not appear on the homepage until the next deploy — the exact bug the plan
  names for unpublish, in the opposite direction.
  Suite after: 167 tests.

Task 13: complete (commit 98e7648). Row is now `flex-col sm:flex-row`, so on a phone the title,
  badge, Publish and Delete stack instead of crowding. `CreatePostForm` renders ABOVE the
  empty-state branch, so a gym with no posts can still create the first one.

Task 14: complete (commit 5984a2c). Ruling 2 implemented and then verified, not assumed.
  The stub's path handling is security-relevant and has no unit test, so it was exercised directly
  (throwaway script, deleted): `../../escape.png`, `..\..\escape.png`,
  `C:\Windows\System32\evil name?.png` and `/etc/passwd` all collapse to a bare filename with no
  path separator surviving, and the uuid prefix means the result can never itself be `.` or `..`.
  Nothing was written outside `public/uploads`.
  Note for anyone repeating that check: this shell strips one level of backslash escaping, so a
  literal `\` must be built in code (`String.fromCharCode(92)`) or the Windows-separator case
  silently tests the wrong string. My first two attempts did exactly that and looked like passes.
  Order of operations matters and is deliberate: role check, then caption/file validation, then
  upload, then row write. Rejecting after the upload would leave an orphan file on disk or a
  paid-for Cloudinary asset with no row pointing at it.
Task 14: minor (deferred): `deleteGalleryImage` removes the row but leaves the stored file. Named in
  the code comment; deleting the asset needs a second adapter method plus a Cloudinary destroy call,
  which the spec did not scope.
Task 14: minor (deferred): stub uploads land in `public/uploads/`, which is a TRACKED directory (it
  already holds `pasted-1783022551988-0.png`). So every local upload shows up as an untracked file
  in `git status` and could be committed by a careless `git add -A`. Not gitignored here precisely
  because of that pre-existing tracked file — an ignore rule interacting with it is a judgement the
  repo owner should make, not a side effect of this phase.
  Suite after: 175 tests.

Task 15: complete (commit c05ec17). Upload form renders above the empty-state branch for the same
  reason as Task 13 — otherwise a gallery with no images has no way to get its first one.

Task 16: complete (commit f8553c4). Both `PLAN_PRICES` consts deleted.
  Ruling 3 verified against the real seeded database rather than only through unit tests: the live
  `getPublicPlans()` returns `$89 / mo`, `$149 / mo`, `$249 / mo` — byte-identical to the strings
  the consts produced, so the public pricing copy did not change when the numbers moved.
  Ruling 4 discharged: the `"does not touch the database"` test is deleted, and the guarantee worth
  keeping is now carried by `"returns every tier from the Plan table, regardless of who is
  enrolled"`. Confirmed the substance live too — `getPlanBreakdown()` returns all three tiers with
  CONTENDER and CHAMPION at `memberCount: 0`, which the old membership-`groupBy` version could not
  produce at all (it would have returned only FIGHTER).
Task 16: DELIBERATE DEVIATION — the plan's Step 12 says `grep -rn "PLAN_PRICES" src/` must return
  nothing. It returns two hits, both COMMENTS the plan itself authored (in `plans/format.ts` and
  `plans/format.test.ts`) explaining what the consts used to render. No const remains. Recorded
  because the Final Verification repeats that grep and will show the same two lines.
Task 16: DELIBERATE DEVIATION on commit boundaries — the plan's Step 13 requires `tsc` clean before
  committing Task 16, but Task 16's row-shape change (`{plan,price,memberCount}` ->
  `{id,key,name,priceCents,price,memberCount}`) necessarily breaks `admin/plans/page.tsx`, which the
  plan does not rewrite until Task 17. Rather than commit a tree that does not compile, Task 16's
  commit carries the forced page migration to the new shape, and Task 17's commit adds the editor on
  top. Every commit on this branch compiles and has a green suite. Cost if wrong: `page.tsx` appears
  in two commits instead of one.
  Suite after: 22 files / 187 tests.

Task 17: complete (commit eed6c45). Suite unchanged at 187 — client component, not renderable in
  this `node` vitest environment.

ALL 17 TASKS COMPLETE.

## Final Verification

- Full suite: 22 files / 187 tests / 0 failures. The plan predicted "roughly 24 files and ~185
  tests"; the arithmetic reconciles (Task 2 deleted caller tests rather than adding files, and the
  two new `plans/` test files landed as predicted).
- `npx tsc --noEmit` clean. `npm run lint` clean (bare `eslint`, not `next lint`).
- `npm run build` succeeds and the route list includes `/dashboard/admin/members/[id]`.
- No leftover consts: see the Task 16 deviation above — two comment hits, zero consts.
- Seed from empty: PASSED. `prisma db push --force-reset` then `prisma db seed` on the worktree's own
  `dev.db`. Two notes for whoever repeats this: (1) `--skip-generate` does NOT exist in Prisma 7 and
  makes the whole command abort with usage help — my first attempt did that, so the reset never ran
  and the seed then collided on the unique email index, which looked like a seed bug and was not;
  (2) Prisma 7 refuses a destructive reset from an AI agent without explicit user consent passed
  through `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`. The user was asked and consented.

### Consolidated live viewport pass — RUN AND PASSED

Method: Playwright + Chromium against a dev server on port 3250, logged in as the seeded admin,
measuring `documentElement.scrollWidth` vs `clientWidth`, every element's right edge, and every
interactive element's height at 320 / 768 / 1280px. Elements inside a deliberate `.overflow-x-auto`
scroller are excluded from the right-edge check, since `DataTable` is designed to scroll internally.
Collapsed AND expanded states were both measured — the row editors and the create/upload forms are
hidden behind a button, so a collapsed-only pass would never have measured them.

Result for every surface this phase touched — `admin/members`, `admin/members/[id]`, `admin/orders`,
`admin/shop`, `admin/content`, `admin/gallery`, `admin/plans` — at all three widths: no page-level
horizontal overflow, no element painting outside the viewport, and (after the one fix below) no
interactive target under 44px. Expanded states at 320px also clean for the plans editor, the content
create form and the shop row editor.

ONE DEFECT FOUND AND FIXED, and it was this phase's: the member-name `<Link>` added in Task 5
measured 17px tall at every width — bare underlined text in a table cell, and the only route into
the detail page. Fixed with `inline-flex items-center min-h-[44px]`. The static per-task review had
missed it because the plan's global constraint is worded around "row-level action buttons" and a
text link did not read as one; the live measurement is what caught it. This is the concrete cost of
the standing ruling above, and it came due exactly as predicted — cheaply.

Two sub-44px targets remain and are PRE-EXISTING, in files this branch never touched (verified with
`git diff master..HEAD --name-only`):
  - `AddProductForm.tsx` "Add product" button, 40px (`p-3` + `text-xs`) — on `admin/shop`, a page
    this phase modified heavily, but the button itself is untouched.
  - The public marketing chrome: header nav links at 18.8px, the wordmark at 32px, "Sign in" at
    40px, "All coaches →" at 41.5px, plus 4px of page overflow at 320px and 29px at 768px on `/`
    and `/pricing`, and the hero's deliberate `inset-[-10%]` image bleed.
  Left alone on purpose, following the Phase 4 precedent that recorded `ProfileForm`'s 40px Save
  button as pre-existing rather than fixing it. Together these now form a standing accessibility
  item spanning three phases: it wants one deliberate sweep, not opportunistic edits from whichever
  phase happens to be measuring.

### Functional end-to-end pass — 17/19, both non-failures explained

Beyond layout, the behaviours the plan asks for were driven for real in a browser:
  - member search narrows on `?q=`, and searching the trainer's name returns the empty state rather
    than a staff row (the RBAC-adjacent guarantee from Task 5's third test, confirmed live);
  - the plan select offers all three seeded tiers;
  - advancing an order moves it forward and the button disappears at DELIVERED;
  - **RULING 2 CONFIRMED**: an uploaded PNG renders — `naturalWidth > 0`, served through
    `/_next/image?url=%2Fuploads%2F<uuid>-live-pass-probe.png`. This is the whole justification for
    changing the stub, and it is now evidence rather than reasoning. It also appears on the public
    homepage gallery, and the two-step delete removes the card;
  - a price edit to 9900 shows `$99 / mo` on the admin table AND on `/pricing` AND on `/` with no
    restart — the Task 16 revalidation path working end to end. Restored to 8900 afterwards;
  - a created post appears as a DRAFT and does NOT appear on the public homepage — the "never
    appears in getPublicPosts" guarantee the plan decomposed into two unit tests, confirmed as one
    real behaviour;
  - RBAC: the trainer hitting `/dashboard/admin/members` lands on `/dashboard/trainer/overview`.

The two non-passes were both harness artefacts, not product defects:
  1. "an unknown member id 404s" — the route renders Next's genuine 404 page ("This page could not
     be found"), which is exactly what the plan's Task 4 Step 4 asks for, but the HTTP status is 200
     rather than 404. Investigated on the PRODUCTION build, not just dev. This is app-wide, not
     Task 4's doing: the pre-existing `dashboard/trainer/clients/[id]` route, untouched by this
     branch, returns 200 with the same 404 body for a bogus id when hit by the trainer. Cause is the
     dashboard layout's shell streaming before the page resolves, which locks the status. Low impact
     on an authenticated admin route; recorded as a pre-existing app-wide item.
  2. "the probe post was deleted" — my locator for the post row was too loose and never found the
     Delete control. The delete ACTION is covered by unit tests and the gallery equivalent passed
     live. The probe row was removed directly afterwards; the database is back to seeded contents
     (2 posts, 4 gallery rows).

Cleanup after the passes: both throwaway harness scripts, the uploaded probe file, the probe post
and the temporary member-id file are gone. Playwright was installed to run the pass and then
REVERTED from `package.json` / `package-lock.json`, matching Phase 4 (which also used Playwright
without adding it as a dependency) — reinstall with `npm i -D playwright && npx playwright install
chromium` to repeat any of this. The two servers I started (3250 dev, 3260 prod) were stopped; the
pre-existing node process on port 3200 was deliberately left running, since the Phase 4 ledger warns
it may be the user's own dev server.

### Known gaps carried forward

- Nothing executes a cancellation once `cancelEffectiveAt` passes (Ruling 8, and the spec's own
  "Known gap"). `updateMembership` gives an admin a manual route to CANCELLED; the scheduler is
  still unbuilt.
- `advanceOrderStatus`'s atomicity has no automated evidence, for the same reason as Phase 4's
  `bookClass`: the `$transaction` mock runs its callback inline, so only the call-count assertion
  would notice the wrapper's removal. Proving it needs an integration test against a live SQLite
  file.
- Everything in Phase 4's deferred list that this phase did not touch remains open. Phase 4's
  four-copy `notify` try/catch IS now closed (Task 2), and the admin-side derived-FROZEN blindness
  it assigned to "the admin plan" is NOT addressed: `getAllMembers` and `getMemberDetail` still
  report the stored `status`, so a frozen member reads as ACTIVE on the admin screens even though
  the member's own profile derives FROZEN. `updateMembership` cannot express FROZEN either, since
  freezing is `frozenUntil`, not a status value. Named here because Phase 4 explicitly handed it
  forward and this plan did not pick it up.
- `DataTable` keys columns by `c.header`, so a second empty-header column in any one table would
  collide. Three tables now use exactly one each.
