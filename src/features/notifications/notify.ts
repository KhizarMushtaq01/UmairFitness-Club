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
 * The in-app row is the source of truth; email is best-effort. A Resend
 * outage must not lose a waitlist promotion, so a failed send is logged and
 * swallowed rather than thrown.
 */
export async function notify(userId: string, title: string, body: string): Promise<void> {
  await db.notification.create({ data: { userId, title, body } });

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await sendEmail({ to: user.email, subject: title, html: `<p>${escapeHtml(body)}</p>` });
  } catch (err) {
    console.error("[notify] email delivery failed", err);
  }
}
