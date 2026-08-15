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

export const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/classes", label: "Classes" },
  { href: "/trainers", label: "Trainers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;
