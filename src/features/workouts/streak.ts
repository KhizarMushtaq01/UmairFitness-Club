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
