import { Resend } from "resend";

/**
 * Real Resend send when RESEND_API_KEY is set, otherwise a logged stub.
 */
export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[stub:email] sendEmail", input.to, input.subject);
    return { id: `stub-${crypto.randomUUID()}` };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: "Fight Club <noreply@fightclub.gym>",
    ...input,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Resend returned no data");
  return { id: data.id };
}
