"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createPostSchema, type CreatePostInput } from "@/features/content/schemas";
import { createPost } from "@/features/content/actions";

export function CreatePostForm() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePostInput>({ resolver: zodResolver(createPostSchema) });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[var(--red)] text-white px-5 py-3 min-h-[44px] font-bold uppercase tracking-widest text-xs w-fit"
      >
        New post
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) =>
        startTransition(async () => {
          setServerError(null);
          try {
            await createPost(data);
            reset();
            setOpen(false);
            router.refresh();
          } catch {
            setServerError("Couldn't create that post. Check the fields and try again.");
          }
        })
      )}
      className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]"
    >
      <input
        {...register("title")}
        placeholder="Post title"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.title && <p className="text-[var(--red)] text-sm">{errors.title.message}</p>}
      <input
        {...register("tag")}
        placeholder="Tag"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.tag && <p className="text-[var(--red)] text-sm">{errors.tag.message}</p>}
      <p className="text-[var(--dim)] text-xs">
        New posts start as drafts. Publish them when they are ready.
      </p>
      {serverError && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {serverError}
        </p>
      )}
      <button
        disabled={isPending}
        className="bg-[var(--red)] text-white p-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
      >
        {isPending ? "Creating…" : "Create draft"}
      </button>
    </form>
  );
}
