"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/features/auth/schemas";
import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupInput) => {
    setServerError(null);
    const { error } = await authClient.signUp.email(data);
    if (error) {
      setServerError(error.message ?? "Signup failed");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>Create account</h1>
      <input
        {...register("name")}
        placeholder="Full name"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.name && <p className="text-[var(--red)] text-sm">{errors.name.message}</p>}
      <input
        {...register("email")}
        placeholder="Email"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.email && <p className="text-[var(--red)] text-sm">{errors.email.message}</p>}
      <input
        {...register("password")}
        type="password"
        placeholder="Password"
        className="border border-[var(--line2)] bg-transparent p-3 text-[var(--txt)]"
      />
      {errors.password && <p className="text-[var(--red)] text-sm">{errors.password.message}</p>}
      {serverError && (
        <p role="alert" className="text-[var(--red)] text-sm">
          {serverError}
        </p>
      )}
      <button
        disabled={isSubmitting}
        className="bg-[var(--red)] text-white p-3 font-bold uppercase tracking-widest text-xs"
      >
        {isSubmitting ? "Creating…" : "Create account"}
      </button>
      <p className="text-[var(--mut)] text-sm">
        Already a member?{" "}
        <Link href="/login" className="text-[var(--txt)] underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
