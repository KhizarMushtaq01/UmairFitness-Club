"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/features/marketing/schemas";
import { sendContactMessage } from "@/features/marketing/actions";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  if (sent) {
    return (
      <div className="border border-[var(--line2)] p-6">
        <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl">
          Message sent
        </div>
        <p className="text-[var(--mut)] text-sm mt-2">
          We&apos;ll come back to you within one working day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        setServerError(null);
        try {
          await sendContactMessage(data);
          reset();
          setSent(true);
        } catch {
          setServerError("Couldn't send that. Please try again.");
        }
      })}
      className="flex flex-col gap-3 w-full max-w-[520px]"
    >
      <input
        {...register("name")}
        placeholder="Your name"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.name && <p className="text-[var(--red)] text-sm">{errors.name.message}</p>}

      <input
        {...register("email")}
        placeholder="Email"
        className="border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      {errors.email && <p className="text-[var(--red)] text-sm">{errors.email.message}</p>}

      <textarea
        {...register("message")}
        rows={5}
        placeholder="What would you like to know?"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.message && <p className="text-[var(--red)] text-sm">{errors.message.message}</p>}

      {serverError && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {serverError}
        </p>
      )}

      <button
        disabled={isSubmitting}
        className="bg-[var(--red)] text-white p-4 font-bold uppercase tracking-widest text-xs"
      >
        {isSubmitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
