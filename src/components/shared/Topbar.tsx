"use client";
import { useSidebar } from "./DashboardShell";

export function Topbar({ title }: { title: string }) {
  const { open, setOpen } = useSidebar();

  return (
    <div className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md border-b border-[var(--line)] flex items-center gap-4 px-4 md:px-7 h-16">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="dashboard-nav-drawer"
        className="md:hidden w-11 h-11 grid place-items-center border border-[var(--line2)] text-[var(--txt)] shrink-0"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ☰
        </span>
      </button>
      <div
        style={{ fontFamily: "var(--font-heading)" }}
        className="text-[20px] md:text-[26px] tracking-[.06em] truncate"
      >
        {title}
      </div>
    </div>
  );
}
