// src/app/(marketing)/terms/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <PolicyPage title="TERMS OF SERVICE" updated="14 August 2026">
      <p>
        These terms govern your use of the Umair Fitness Club website and your
        membership of the club. By creating an account you agree to them.
      </p>

      <H>Membership</H>
      <p>
        A membership is personal to you and may not be transferred or shared.
        You are responsible for keeping your account password secure and for
        anything done through your account. Tell us immediately if you think
        someone else has access to it.
      </p>

      <H>Using the gym</H>
      <p>
        You agree to follow the instructions of coaches and staff, to use
        equipment as it is intended, and to train within your ability. Combat
        disciplines carry inherent risk of injury; you take part voluntarily
        and accept that risk. Tell us before you start about any medical
        condition or injury that affects your training.
      </p>

      <H>Classes and bookings</H>
      <p>
        Class places are limited and allocated on booking. You may cancel a
        booking through your member dashboard. We may change or cancel a class
        where we need to — for example if a coach is unavailable — and will
        tell you as early as we can.
      </p>

      <H>Payment</H>
      <p>
        Plan fees are payable in advance for each period. If a payment fails we
        may suspend access until it is settled. Prices may change; we will give
        you notice before a change affects your plan.
      </p>

      <H>Conduct</H>
      <p>
        We may suspend or end a membership without refund for behaviour that
        endangers or harasses other members or staff, for damage to equipment,
        or for repeated breach of these terms.
      </p>

      <H>Changes to these terms</H>
      <p>
        We may update these terms. The date at the top shows when they last
        changed, and continued use of your membership after a change means you
        accept the updated version.
      </p>
    </PolicyPage>
  );
}
