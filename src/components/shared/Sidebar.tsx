"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { NAV_BY_ROLE, ROLE_BASE_PATH, type Role } from "@/lib/dashboard-nav";

const ROLE_TITLE: Record<Role, string> = {
  ADMIN: "Admin console",
  TRAINER: "Coach portal",
  MEMBER: "Member area",
};

export function Sidebar({
  role,
  userName,
  userPlan,
}: {
  role: Role;
  userName: string;
  userPlan: string;
}) {
  // Server Components can't read the current pathname, so active-tab
  // detection lives here rather than in the role layouts.
  const pathname = usePathname();
  const base = ROLE_BASE_PATH[role];
  const items = NAV_BY_ROLE[role];
  const activeTab = pathname.split("/")[3] ?? "";

  return (
    <aside className="md:sticky md:top-0 h-full md:h-screen bg-[var(--panel)] border-r border-[var(--line)] flex flex-col">
      <div className="flex items-center gap-[11px] px-[22px] pt-[22px] pb-5 border-b border-[var(--line)]">
        <Logo />
      </div>
      <div className="px-[22px] pt-4 pb-2 text-[10px] font-bold tracking-[.26em] uppercase text-[var(--dim)]">
        {ROLE_TITLE[role]}
      </div>
      <nav className="flex flex-col px-3 py-1.5 gap-0.5">
        {items.map(([id, label], i) => {
          const active = id === activeTab;
          return (
            <Link
              key={id}
              href={`/dashboard/${base}/${id}`}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3.5 px-3 py-3 min-h-[44px] no-underline"
              style={{
                background: active ? "var(--card)" : "transparent",
                borderLeft: `2px solid ${active ? "var(--red)" : "transparent"}`,
              }}
            >
              <span
                style={{ fontFamily: "var(--font-heading)" }}
                className="text-[13px] tracking-[.1em] text-[var(--dim)] w-[18px]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="text-[12.5px] font-semibold tracking-[.08em] uppercase"
                style={{ color: active ? "var(--txt)" : "var(--mut)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--line)] px-[22px] py-4 flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-[34px] h-[34px] bg-[var(--red)] text-white grid place-items-center text-xs font-bold">
            {userName
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">
              {userName}
            </div>
            <div className="text-[var(--dim)] text-[11px]">{userPlan}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
