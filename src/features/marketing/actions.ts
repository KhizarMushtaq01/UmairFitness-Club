"use server";
import { sendEmail } from "@/lib/email";
import { contactSchema, type ContactInput } from "./schemas";

const INBOX = "hello@umairfitness.gym";

// This endpoint is public and unauthenticated, so any visitor can put
// arbitrary text in name/email/message. Escape before interpolating into
// the HTML email so a submission can't inject markup, spoofed links, or
// tracking pixels into the mail the gym owner opens and trusts.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Public — a visitor is not signed in, so there is deliberately no
 * assertRole here. Input is parsed first so a malformed submission never
 * reaches the mail adapter.
 */
export async function sendContactMessage(rawInput: ContactInput) {
  const input = contactSchema.parse(rawInput);

  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const message = escapeHtml(input.message);

  await sendEmail({
    to: INBOX,
    subject: `Website enquiry from ${input.name}`,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
  });

  return { ok: true as const };
}
