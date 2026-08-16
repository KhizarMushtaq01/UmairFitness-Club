"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "./DashboardShell";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";

export function NotificationBell() {
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // App Router does not re-render a layout on client navigation, and the
  // notifications are fetched in the layout — without an explicit refresh the
  // unread count stays stale after marking anything read.
  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch {
        /* the count simply stays as it was; nothing destructive happened */
      }
    });

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="w-11 h-11 grid place-items-center border border-[var(--line2)] text-[var(--txt)] relative"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          🔔
        </span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 w-2 h-2 bg-[var(--red)]"
          />
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer. Sits below the panel, above the page. */}
          <button
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className="fixed z-50 left-0 right-0 top-16 max-h-[70vh] overflow-y-auto bg-[var(--panel)] border-y border-[var(--line)]
                       sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[360px] sm:border sm:max-h-[420px]"
          >
            <div className="flex items-center gap-3 p-4 border-b border-[var(--line)]">
              <span className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                Notifications
              </span>
              {unread > 0 && (
                <button
                  disabled={isPending}
                  onClick={() => run(() => markAllNotificationsRead())}
                  className="ml-auto text-[11px] uppercase tracking-widest text-[var(--red)] min-h-[44px] px-2"
                >
                  Mark all read
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="p-4 text-[var(--mut)] text-sm">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  disabled={isPending || n.read}
                  onClick={() => run(() => markNotificationRead({ notificationId: n.id }))}
                  className="w-full text-left p-4 border-b border-[var(--line)] last:border-0 min-h-[44px] block"
                >
                  <span className="flex items-center gap-2">
                    {!n.read && <span aria-hidden="true" className="w-1.5 h-1.5 bg-[var(--red)] shrink-0" />}
                    <span className="font-semibold text-sm">{n.title}</span>
                    <span className="ml-auto text-[var(--dim)] text-xs shrink-0">{n.createdAt}</span>
                  </span>
                  <span className="block text-[var(--dim)] text-xs mt-1">{n.body}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
