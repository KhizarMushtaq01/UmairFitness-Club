import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// Callers pass free-text strings that can originate from admin-controlled
// database data (e.g. bookClass interpolates class.title into body) rather
// than from a fixed set of app-authored copy. Escaping here is the single
// funnel every future caller inherits, so nobody has to remember to escape
// at each call site.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The single funnel for member-facing notifications.
 *
 * Best-effort in full: this never rejects. Callers are actions that have
 * already committed their real work (a booking, an order advance), and none
 * of them should turn a delivery failure into a failure the user sees. The
 * guard lives here rather than at each call site because there are now six of
 * them and every future one inherits it for free.
 */
export async function notify(userId: string, title: string, body: string): Promise<void> {
  try {
    await db.notification.create({ data: { userId, title, body } });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await sendEmail({ to: user.email, subject: title, html: `<p>${escapeHtml(body)}</p>` });
  } catch (err) {
    console.error("[notify] delivery failed", err);
  }
}
