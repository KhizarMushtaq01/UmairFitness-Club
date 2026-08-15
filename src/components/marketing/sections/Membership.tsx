// src/components/marketing/sections/Membership.tsx
import { Reveal } from "@/components/marketing/Reveal";

export function Membership({ plans }: { plans: { plan: string; price: string }[] }) {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 pb-20">
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          MEMBERSHIP
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {plans.map((p, i) => (
          <Reveal key={p.plan} delay={i * 0.1}>
            <div className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl">
                {p.plan}
              </div>
              <div className="text-[var(--red)] text-lg font-semibold mt-2">{p.price}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
