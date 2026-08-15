// src/lib/site-links.ts

/**
 * Social hrefs are "#" placeholders. The club's real handles are not known
 * here, and guessing URLs would ship dead links. Replace these four values
 * and the footer picks them up — this is the only place to edit.
 */
export const SOCIAL_LINKS = [
  { href: "#", label: "Instagram" },
  { href: "#", label: "Facebook" },
  { href: "#", label: "YouTube" },
  { href: "#", label: "WhatsApp" },
] as const;

export const POLICY_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/cookies", label: "Cookies" },
] as const;

/**
 * Where a public "book this class" link sends a visitor. Booking lives behind
 * auth, so the honest path is sign-in first and the member's bookings page
 * after — see safeRedirect(), which is what keeps `next` from becoming an
 * open redirect.
 */
export const BOOKINGS_SIGN_IN_HREF = "/login?next=%2Fdashboard%2Fmember%2Fbookings";

export const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/classes", label: "Classes" },
  { href: "/trainers", label: "Trainers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;
