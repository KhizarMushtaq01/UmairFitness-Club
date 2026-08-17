"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, deleteProduct } from "@/features/shop/actions";

export function ProductRowActions({
  productId,
  name,
  priceCents,
  stockCount,
  category,
}: {
  productId: string;
  name: string;
  priceCents: number;
  stockCount: number;
  category: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name, priceCents, stockCount, category });
  const router = useRouter();

  const field =
    "border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)] w-full";
  const button =
    "border border-[var(--line2)] px-4 py-2 min-h-[44px] inline-flex items-center justify-center text-xs uppercase tracking-widest disabled:text-[var(--dim)]";

  if (editing) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-[420px]">
        <input
          aria-label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={field}
        />
        <input
          aria-label="Price in cents"
          type="number"
          value={form.priceCents}
          onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
          className={field}
        />
        <input
          aria-label="Stock"
          type="number"
          value={form.stockCount}
          onChange={(e) => setForm({ ...form, stockCount: Number(e.target.value) })}
          className={field}
        />
        <input
          aria-label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className={field}
        />
        {error && (
          <p role="alert" className="text-[var(--red)] text-xs">
            {error}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await updateProduct({
                    productId,
                    name: form.name,
                    price: form.priceCents,
                    stock: form.stockCount,
                    category: form.category,
                  });
                  setEditing(false);
                  router.refresh();
                } catch {
                  setError("Couldn't save. Check the price and stock are whole numbers.");
                }
              })
            }
            className={button}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className={button}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => setEditing(true)} className={button}>
          Edit
        </button>
        {confirming ? (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await deleteProduct({ productId });
                  router.refresh();
                } catch {
                  // The action's own reason is redacted in production, so the
                  // copy names the one case that actually blocks a delete.
                  setError("Couldn't delete. Products with order history can't be removed.");
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
