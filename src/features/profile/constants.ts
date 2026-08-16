// Shared between profile/actions.ts (which computes cancelEffectiveAt when a
// cancellation is recorded) and memberships/queries.ts (which recomputes the
// same effective date for display). A "use server" file may only export
// async functions, so these constants live here rather than in actions.ts —
// this is a plain module, and memberships/queries.ts already depends on
// features/profile (see freeze-allowance.ts), so this keeps the dependency
// direction it already has instead of introducing a new one.
export const DAY_MS = 24 * 60 * 60 * 1000;
export const CANCELLATION_NOTICE_DAYS = 30;
