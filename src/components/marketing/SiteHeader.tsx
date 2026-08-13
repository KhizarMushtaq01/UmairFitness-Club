"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";

const NAV = [
  ["/about", "About"],
  ["/classes", "Classes"],
  ["/trainers", "Trainers"],
  ["/pricing", "Pricing"],
  ["/contact", "Contact"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md border-b border-[var(--line)]">
      <div className="max-w-[1200px] mx-auto flex items-center gap-4 px-4 md:px-7 h-16">
        <Link href="/" className="no-underline text-[var(--txt)] shrink-0">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-auto">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-[12.5px] font-semibold tracking-[.08em] uppercase no-underline"
              style={{ color: pathname === href ? "var(--txt)" : "var(--mut)" }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            className="bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs no-underline"
          >
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="md:hidden ml-auto w-11 h-11 grid place-items-center border border-[var(--line2)] shrink-0"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ☰
          </span>
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-[var(--line)] flex flex-col px-4 pb-4">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="min-h-[44px] flex items-center text-[12.5px] font-semibold tracking-[.08em] uppercase no-underline border-b border-[var(--line)]"
              style={{ color: pathname === href ? "var(--txt)" : "var(--mut)" }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-4 min-h-[44px] flex items-center justify-center bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs no-underline text-center"
          >
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
