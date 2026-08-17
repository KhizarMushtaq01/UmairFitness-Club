/**
 * FROZEN is derived, never stored: a membership is frozen for as long as
 * `frozenUntil` is in the future. Putting FROZEN in the stored column would
 * mean updating the seed and every status map to say what `frozenUntil`
 * already says.
 *
 * This lives in one place because three surfaces need the same answer — the
 * member's own profile, the admin members table, and the admin member detail
 * page. Phase 4 derived it for the member only, so a frozen member read as
 * ACTIVE to an admin, who is exactly the person who needs to know.
 */
export function deriveDisplayStatus(
  status: string,
  frozenUntil: Date | null | undefined,
  now: Date = new Date()
): string {
  return frozenUntil != null && frozenUntil > now ? "FROZEN" : status;
}

/** The badge colour for an already-derived display status. */
export function displayStatusColor(displayStatus: string): string {
  if (displayStatus === "AT_RISK") return "var(--red)";
  // Dim rather than muted: a frozen membership is deliberately paused, so it
  // should read as inactive next to the active rows, not as a problem.
  if (displayStatus === "FROZEN") return "var(--dim)";
  return "var(--mut)";
}
