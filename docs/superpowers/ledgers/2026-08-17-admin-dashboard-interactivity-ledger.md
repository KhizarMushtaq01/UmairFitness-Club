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
