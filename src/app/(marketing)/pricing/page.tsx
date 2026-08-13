import Link from "next/link";
import { getPublicPlans } from "@/features/marketing/queries";

const PLAN_BLURB: Record<string, string> = {
  CONTENDER: "Open gym, two classes a week, group programming.",
  FIGHTER: "Unlimited classes, a written block, monthly coach review.",
  CHAMPION: "Everything in Fighter plus 1-to-1 sessions and nutrition.",
};

export default async function PricingPage() {
  const plans = await getPublicPlans();

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        MEMBERSHIP
      </h1>
      <p className="text-[var(--mut)] mt-6 max-w-[520px]">
        No joining fee. Freeze any plan for up to a month a year.
      </p>
      {plans.length === 0 ? (
        <p className="text-[var(--mut)] mt-6">Plans are being finalised.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {plans.map((p) => (
            <div key={p.plan} className="bg-[var(--card)] border border-[var(--line)] p-6 flex flex-col">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-[32px]">
                {p.plan}
              </div>
              <div className="text-[var(--red)] text-xl font-semibold mt-2">{p.price}</div>
              <p className="text-[var(--mut)] text-sm mt-4 flex-1">
                {PLAN_BLURB[p.plan] ?? "Ask us about this plan."}
              </p>
              <Link
                href="/contact"
                className="mt-6 bg-[var(--red)] text-white px-5 py-3 font-bold uppercase tracking-widest text-xs no-underline text-center"
              >
                Enquire
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
