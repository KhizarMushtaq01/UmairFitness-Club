"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { safeRedirect } from "@/features/auth/safe-redirect";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    const { error } = await authClient.signIn.email(data);
    if (error) {
      setServerError(error.message ?? "Login failed");
      return;
    }
    // ?next= lets a public "Book this class" link land the member on their
    // bookings instead of the dashboard root. safeRedirect is what stops that
    // parameter from becoming an open redirect.
    router.push(safeRedirect(searchParams.get("next")));
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30 }}>Sign in</h1>
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
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-[var(--mut)] text-sm">
        No account?{" "}
        <Link href="/signup" className="text-[var(--txt)] underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  // useSearchParams() opts a component into client-side rendering, so it needs
  // a Suspense boundary above it or this statically rendered route fails the
  // build.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
