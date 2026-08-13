"use server";
import { sendEmail } from "@/lib/email";
import { contactSchema, type ContactInput } from "./schemas";

const INBOX = "hello@umairfitness.gym";

/**
 * Public — a visitor is not signed in, so there is deliberately no
 * assertRole here. Input is parsed first so a malformed submission never
 * reaches the mail adapter.
 */
export async function sendContactMessage(rawInput: ContactInput) {
  const input = contactSchema.parse(rawInput);

  await sendEmail({
    to: INBOX,
    subject: `Website enquiry from ${input.name}`,
    html: `<p><strong>From:</strong> ${input.name} (${input.email})</p><p>${input.message}</p>`,
  });

  return { ok: true as const };
}
