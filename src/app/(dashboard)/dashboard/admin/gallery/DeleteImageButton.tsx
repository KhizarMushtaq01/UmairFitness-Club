"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGalleryImage } from "@/features/content/actions";

export function DeleteImageButton({ imageId }: { imageId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const button =
    "w-full border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  return (
    <div className="p-2 pt-0 flex flex-col gap-1">
      {confirming ? (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await deleteGalleryImage({ imageId });
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
      {error && (
        <p role="alert" className="text-[var(--red)] text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
