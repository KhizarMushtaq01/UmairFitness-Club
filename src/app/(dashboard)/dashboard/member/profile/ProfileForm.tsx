"use client";
import { useState, useTransition } from "react";
import { updateProfile } from "@/features/profile/actions";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]">
      <label
        htmlFor="profile-name"
        className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]"
      >
        Full name
      </label>
      <input
        id="profile-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
          setError(null);
        }}
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {error && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {error}
        </p>
      )}
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await updateProfile({ name });
              setSaved(true);
            } catch {
              setError("Couldn't save. Name must be at least 2 characters.");
            }
          })
        }
        className="bg-[var(--red)] text-white p-3 min-h-[44px] inline-flex items-center justify-center font-bold uppercase tracking-widest text-xs"
      >
        {isPending ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
