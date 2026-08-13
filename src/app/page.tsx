import { redirect } from "next/navigation";

/**
 * Root route. Phase 1 has no public marketing page, so `/` hands the visitor
 * straight to the app: /dashboard resolves the session and sends signed-in
 * users to their role's home tab, and everyone else to /login.
 */
export default function RootPage() {
  redirect("/dashboard");
}
