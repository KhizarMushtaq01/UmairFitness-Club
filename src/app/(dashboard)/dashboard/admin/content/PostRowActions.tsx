"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unpublishPost, deletePost } from "@/features/content/actions";

export function PostRowActions({ postId, status }: { postId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const button =
    "border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <div className="flex flex-col sm:flex-row gap-2">
        {status === "PUBLISHED" && (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await unpublishPost({ postId });
                  router.refresh();
                } catch {
                  setError("Couldn't unpublish.");
                }
              })
            }
            className={button}
          >
            {isPending ? "Working…" : "Unpublish"}
          </button>
        )}
        {confirming ? (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await deletePost({ postId });
                  router.refresh();
                } catch {
                  setError("Couldn't delete.");
                  setConfirming(false);
                }
              })
            }
            className={`${button} text-[var(--red)]`}
          >
            {isPending ? "Deleting…" : "Confirm"}
          </button>
        ) : (
          <button onClick={() => setConfirming(true)} className={button}>
            Delete
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
