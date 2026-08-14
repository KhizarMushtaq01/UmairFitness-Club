/**
 * True when the visitor has asked their OS for less motion.
 *
 * Returns false during SSR, where no media query exists. Callers must still
 * land on the final visual state when this is true — see Reveal.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
