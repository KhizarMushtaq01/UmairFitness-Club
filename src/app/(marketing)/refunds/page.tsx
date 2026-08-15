// src/app/(marketing)/refunds/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function RefundsPage() {
  return (
    <PolicyPage title="REFUNDS & CANCELLATION" updated="14 August 2026">
      <p>
        This page explains how to cancel a membership, when a refund is due,
        and how class cancellations work.
      </p>

      <H>Cancelling a membership</H>
      <p>
        You may cancel at any time. Cancellation takes effect at the end of the
        period you have already paid for, and you keep access until then. We do
        not part-refund an unused portion of a period except in the cases
        below.
      </p>

      <H>When we do refund</H>
      <p>
        In full, if you cancel within fourteen days of first joining and have
        not used the facilities. Pro rata, if we close for an extended period,
        or if a medical condition evidenced by a doctor&apos;s note prevents you
        from training for a month or more.
      </p>

      <H>Freezing instead of cancelling</H>
      <p>
        Any plan can be frozen for up to one month per year at no charge, which
        pauses billing and keeps your place. Ask at the front desk or through
        the contact form.
      </p>

      <H>Classes</H>
      <p>
        Cancel a class booking through your member dashboard and the place
        returns to the pool for other members. If we cancel a class, it does
        not count against any allowance on your plan.
      </p>

      <H>Shop orders</H>
      <p>
        Unopened gear may be returned within fourteen days of delivery for a
        refund of the item price. Supplements cannot be returned once opened,
        for hygiene reasons.
      </p>

      <H>How to ask</H>
      <p>
        Write to hello@umairfitness.gym with your name and what you would like
        cancelled or refunded. We aim to respond within two working days.
      </p>
    </PolicyPage>
  );
}
