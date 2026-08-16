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
