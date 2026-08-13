import { headers } from "next/headers";
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

export function assertRole<T extends SessionLike>(
  session: T | null,
  allowed: Role[]
): asserts session is T & { user: { role: Role } } {
  if (!session) throw new Error("Unauthorized: no active session");
  if (!(allowed as string[]).includes(session.user.role)) {
    throw new Error(`Forbidden: requires role ${allowed.join(" or ")}`);
  }
}
