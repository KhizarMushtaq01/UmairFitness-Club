import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Fallback must match the port in package.json's dev script, or a missing
  // NEXT_PUBLIC_BETTER_AUTH_URL sends auth calls to a port nothing serves.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3200",
});
