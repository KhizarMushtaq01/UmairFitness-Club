import Stripe from "stripe";

/**
 * Real Stripe checkout when STRIPE_SECRET_KEY is set, otherwise a logged stub.
 * Dev leaves the key unset, so the stub path is what normally runs.
 */
export async function createInvoiceCheckout(input: {
  userId: string;
  amountCents: number;
  description: string;
}) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("[stub:payments] createInvoiceCheckout", input);
    return { url: `https://stub-checkout.local/session/${crypto.randomUUID()}` };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: { name: input.description },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.BETTER_AUTH_URL}/dashboard/member/payments?success=1`,
    cancel_url: `${process.env.BETTER_AUTH_URL}/dashboard/member/payments`,
    client_reference_id: input.userId,
  });
  if (!session.url) throw new Error("Stripe returned a checkout session with no URL");
  return { url: session.url };
}
