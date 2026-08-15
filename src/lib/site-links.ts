// src/lib/site-links.ts

export type SocialLink = { href: string | null; label: string };

/**
 * The club's real handles are not known here.
 *
 * `null` means "not configured yet" and the footer renders nothing for it.
 * That is deliberate: the earlier "#" placeholder produced an anchor that
 * invited a click and answered by jumping to the top of the page, which reads
 * as a broken site. Guessing a url is worse still — an invented handle either
 * 404s or, if it happens to exist, points members at a stranger's account.
 *
 * To switch one on, replace its null with the full https url. This is the
 * only place to edit; the footer picks it up with no other change.
 *
 *   { href: "https://instagram.com/<handle>", label: "Instagram" }
 *
 * WhatsApp uses the wa.me form with the number in international digits and no
 * punctuation: https://wa.me/923000000000
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  { href: null, label: "Instagram" },
  { href: null, label: "Facebook" },
  { href: null, label: "YouTube" },
  { href: null, label: "WhatsApp" },
];

/** The subset that has a real destination — the only ones safe to render. */
export function configuredSocialLinks(): { href: string; label: string }[] {
  return SOCIAL_LINKS.filter(
    (s): s is { href: string; label: string } => typeof s.href === "string" && s.href.length > 0,
  );
}

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
