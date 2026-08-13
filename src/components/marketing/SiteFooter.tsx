// src/components/marketing/SiteFooter.tsx
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] mt-20">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-10 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div>
          <div
            style={{ fontFamily: "var(--font-heading)" }}
            className="text-[19px] tracking-[.14em]"
          >
            UMAIR FITNESS CLUB
          </div>
          <p className="text-[var(--dim)] text-xs mt-1">
            Boxing · Muay Thai · Strength — coached, not guessed.
          </p>
        </div>
        <div className="flex gap-6">
          <Link href="/classes" className="text-[var(--mut)] text-xs uppercase tracking-widest no-underline">
            Classes
          </Link>
          <Link href="/pricing" className="text-[var(--mut)] text-xs uppercase tracking-widest no-underline">
            Pricing
          </Link>
          <Link href="/contact" className="text-[var(--mut)] text-xs uppercase tracking-widest no-underline">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
