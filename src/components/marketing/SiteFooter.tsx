// src/components/marketing/SiteFooter.tsx
import Link from "next/link";
import { NAV_LINKS, POLICY_LINKS, SOCIAL_LINKS } from "@/lib/site-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] mt-20">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-2">
          <div style={{ fontFamily: "var(--font-heading)" }} className="text-[19px] tracking-[.14em]">
            UMAIR FITNESS CLUB
          </div>
          <p className="text-[var(--dim)] text-xs mt-2 max-w-[280px]">
            Boxing · Muay Thai · Strength — coached, not guessed.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Explore
          </div>
          <div className="flex flex-col mt-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
            Legal
          </div>
          <div className="flex flex-col mt-3">
            {POLICY_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="min-h-[44px] inline-flex items-center text-[var(--mut)] text-xs uppercase tracking-widest no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-6 text-[var(--dim)] text-xs">
          © {new Date().getFullYear()} Umair Fitness Club. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
