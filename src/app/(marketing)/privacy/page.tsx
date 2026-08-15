// src/app/(marketing)/privacy/page.tsx
import { PolicyPage } from "@/components/marketing/PolicyPage";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[24px] tracking-[.06em] text-[var(--txt)]">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <PolicyPage title="PRIVACY POLICY" updated="14 August 2026">
      <p>
        This policy explains what personal information Umair Fitness Club
        collects when you use this website or hold a membership, why we collect
        it, and what choices you have.
      </p>

      <H>What we collect</H>
      <p>
        When you create an account we store your name, email address, and a
        hashed form of your password — we never store the password itself. If
        you hold a membership we also store your plan, its status, your class
        bookings, attendance records, and any training or nutrition programme a
        coach assigns you. If you contact us through the enquiry form we keep
        the name, email, and message you send.
      </p>

      <H>Why we collect it</H>
      <p>
        To run your membership: to let you sign in, book and cancel classes,
        show you your programme, and take payment for your plan. Coaches see
        the training data of members assigned to them so they can do their job.
        We do not sell your information, and we do not use it for advertising.
      </p>

      <H>Who can see it</H>
      <p>
        Members see only their own data. Coaches see the members assigned to
        them. Administrators can see membership and billing records because
        those are needed to run the club. Beyond that we share data only with
        the services we use to operate — payment processing, email delivery,
        and image hosting — and only what each needs to perform its function.
      </p>

      <H>How long we keep it</H>
      <p>
        While you hold an account, and for as long afterwards as we are
        required to keep financial records. You may ask us to delete your
        account at any time; we will do so except where we are legally obliged
        to retain a record.
      </p>

      <H>Your rights</H>
      <p>
        You may ask for a copy of the data we hold about you, ask us to correct
        it, or ask us to delete it. Write to us at the address on the contact
        page and we will respond within one month.
      </p>

      <H>Contact</H>
      <p>
        Questions about this policy can go to hello@umairfitness.gym or to the
        address listed on our contact page.
      </p>
    </PolicyPage>
  );
}
