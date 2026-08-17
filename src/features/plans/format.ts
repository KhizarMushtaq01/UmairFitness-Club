/**
 * The one place a plan price becomes display text.
 *
 * Whole-dollar amounts render without cents ("$89 / mo") because that is
 * exactly what the PLAN_PRICES consts produced before prices moved into the
 * database — formatting everything at two decimals would silently rewrite the
 * live pricing page to "$89.00 / mo". Prices an admin types with cents keep
 * them.
 */
export function formatPlanPrice(priceCents: number): string {
  const dollars = priceCents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)} / mo`;
}
