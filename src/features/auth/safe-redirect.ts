// src/features/auth/safe-redirect.ts

/** Where a signed-in user goes when no valid destination was requested. */
const DEFAULT_DESTINATION = "/dashboard";

/**
 * Drop leading whitespace and control characters.
 *
 * Every C0 control character sorts below the space, so one comparison covers
 * the whole set without writing a control character into this file — a
 * literal one makes git treat the source as binary and its diffs unreadable.
 */
function stripLeadingBlanks(value: string): string {
  let i = 0;
  while (i < value.length && value[i] <= " ") i++;
  return value.slice(i);
}

/**
 * Reduce a caller-supplied `?next=` value to a path we are willing to send a
 * freshly signed-in user to.
 *
 * Anything that could leave this origin is discarded rather than repaired.
 * The dangerous shapes are off-origin absolute urls, protocol-relative urls
 * (`//host`, which a browser reads as "same scheme, different host"), the
 * backslash spellings some browsers normalise into those, and `javascript:`.
 * Blanks come off first, because a browser ignores them when resolving a url
 * — so a check that kept them would be inspecting a different string than the
 * one actually navigated to.
 */
export function safeRedirect(next: string | null | undefined): string {
  if (!next) return DEFAULT_DESTINATION;

  const cleaned = stripLeadingBlanks(next);

  if (!cleaned.startsWith("/")) return DEFAULT_DESTINATION;

  // "//host" and "/\host" both leave the origin.
  if (cleaned.startsWith("//") || cleaned.startsWith("/\\")) return DEFAULT_DESTINATION;

  return cleaned;
}
