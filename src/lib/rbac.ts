import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type Role = "MEMBER" | "TRAINER" | "ADMIN";

/**
 * Better Auth types additional fields as plain `string`, so a live session
 * arrives with `role: string`. Accepting that and narrowing it to `Role` is
 * precisely what assertRole is for — the generic keeps the caller's own
 * session type (and its `session` property) intact through the assertion.
 */
type SessionLike = { user: { id: string; role: string } };

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Session or bust, for page bodies.
 *
 * Next renders a layout and its page in parallel, so the session guard in
 * (dashboard)/layout.tsx does NOT stop a page body from running for an
 * anonymous request. Pages that reached for `session!.user` therefore threw
 * a TypeError on every logged-out hit. Redirecting here ends rendering the
 * same way the layout does, and hands callers a non-null session.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function assertRole<T extends SessionLike>(
  session: T | null,
  allowed: Role[]
): asserts session is T & { user: { role: Role } } {
  if (!session) throw new Error("Unauthorized: no active session");
  if (!(allowed as string[]).includes(session.user.role)) {
    throw new Error(`Forbidden: requires role ${allowed.join(" or ")}`);
  }
}
