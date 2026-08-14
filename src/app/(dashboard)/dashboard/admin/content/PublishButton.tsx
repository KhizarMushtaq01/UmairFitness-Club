"use client";
import { useState, useTransition } from "react";
import { publishPost } from "@/features/content/actions";

export function PublishButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await publishPost({ postId });
            } catch {
              setError("Couldn't publish.");
            }
          })
        }
        className="border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest"
      >
        {isPending ? "Publishing…" : "Publish"}
      </button>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
