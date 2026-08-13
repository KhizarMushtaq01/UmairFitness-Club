import { headers } from "next/headers";
import { auth } from "./auth";

export type Role = "MEMBER" | "TRAINER" | "ADMIN";

type SessionLike = { user: { id: string; role: Role } } | null;

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export function assertRole(
  session: SessionLike,
  allowed: Role[]
): asserts session is { user: { id: string; role: Role } } {
  if (!session) throw new Error("Unauthorized: no active session");
  if (!allowed.includes(session.user.role)) {
    throw new Error(`Forbidden: requires role ${allowed.join(" or ")}`);
  }
}
