"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addProductSchema, type AddProductInput } from "@/features/shop/schemas";
import { addProduct } from "@/features/shop/actions";

export function AddProductForm() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddProductInput>({ resolver: zodResolver(addProductSchema) });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[var(--red)] text-white px-5 py-3 min-h-[44px] inline-flex items-center justify-center font-bold uppercase tracking-widest text-xs w-fit"
      >
        Add product
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) =>
        startTransition(async () => {
          setServerError(null);
          try {
            await addProduct(data);
            reset();
            setOpen(false);
          } catch {
            setServerError("Couldn't add that product. Check the fields and try again.");
          }
        })
      )}
      className="bg-[var(--card)] border border-[var(--line)] p-5 flex flex-col gap-3 w-full max-w-[420px]"
    >
      <input
        {...register("name")}
        placeholder="Product name"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.name && <p className="text-[var(--red)] text-sm">{errors.name.message}</p>}
      <input
        {...register("price", { valueAsNumber: true })}
        type="number"
        placeholder="Price (cents)"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.price && <p className="text-[var(--red)] text-sm">{errors.price.message}</p>}
      <input
        {...register("stock", { valueAsNumber: true })}
        type="number"
        placeholder="Stock"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.stock && <p className="text-[var(--red)] text-sm">{errors.stock.message}</p>}
      <input
        {...register("category")}
        placeholder="Category"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.category && <p className="text-[var(--red)] text-sm">{errors.category.message}</p>}
      {serverError && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {serverError}
        </p>
      )}
      <button
        disabled={isPending}
        className="bg-[var(--red)] text-white p-3 min-h-[44px] inline-flex items-center justify-center font-bold uppercase tracking-widest text-xs"
      >
        {isPending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
