import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

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
    await sendEmail({ to: user.email, subject: title, html: `<p>${body}</p>` });
  } catch (err) {
    console.error("[notify] email delivery failed", err);
  }
}
