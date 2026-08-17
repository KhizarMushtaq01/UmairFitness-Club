"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadGalleryImage } from "@/features/content/actions";

export function GalleryUploadForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          setError(null);
          try {
            await uploadGalleryImage(data);
            formRef.current?.reset();
            router.refresh();
          } catch {
            setError("Couldn't upload that image. Use an image file under 5 MB and add a caption.");
          }
        });
      }}
      className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]"
    >
      <label
        htmlFor="gallery-file"
        className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]"
      >
        Image
      </label>
      <input
        id="gallery-file"
        name="file"
        type="file"
        accept="image/*"
        className="w-full border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] text-sm"
      />
      <input
        name="caption"
        placeholder="Caption"
        aria-label="Caption"
        className="w-full border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {error && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {error}
        </p>
      )}
      <button
        disabled={isPending}
        className="bg-[var(--red)] text-white p-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
      >
        {isPending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
