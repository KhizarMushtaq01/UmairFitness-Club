"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import type { Role } from "@/lib/dashboard-nav";

type SidebarState = { open: boolean; setOpen: (v: boolean) => void };

const SidebarContext = createContext<SidebarState>({ open: false, setOpen: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function DashboardShell({
  role,
  userName,
  userPlan,
  children,
}: {
  role: Role;
  userName: string;
  userPlan: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation, so tapping a nav item does not leave the drawer
  // sitting open over the page it just opened.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="grid grid-cols-1 md:grid-cols-[248px_1fr] min-h-screen items-start">
        {/* Permanent sidebar, tablet and up */}
        <div className="hidden md:block">
          <Sidebar role={role} userName={userName} userPlan={userPlan} />
        </div>

        {/* Drawer, phones only */}
        {open && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              id="dashboard-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="w-[248px] max-w-[80%] h-full overflow-y-auto"
            >
              <Sidebar role={role} userName={userName} userPlan={userPlan} />
            </div>
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="flex-1 h-full bg-black/60"
            />
          </div>
        )}

        <div className="min-w-0">{children}</div>
      </div>
    </SidebarContext.Provider>
  );
}
