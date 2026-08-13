"use client";
import { useState, useTransition } from "react";
import { updateUserRole } from "@/features/memberships/actions";

const ROLES = ["MEMBER", "TRAINER", "ADMIN"] as const;

export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        aria-label="Role"
        disabled={isPending}
        defaultValue={currentRole}
        onChange={(e) => {
          const role = e.target.value as (typeof ROLES)[number];
          startTransition(async () => {
            setError(null);
            try {
              await updateUserRole({ userId, role });
            } catch {
              setError("Couldn't change role.");
            }
          });
        }}
        className="border border-[var(--line2)] bg-transparent p-2 text-[var(--txt)] text-xs uppercase tracking-widest"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
