import { ContactForm } from "./ContactForm";

export default function ContactPage() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        GET IN TOUCH
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-10">
        <ContactForm />
        <div className="flex flex-col gap-6">
          {[
            ["Address", "Plot 12, Shahrah-e-Faisal, Karachi"],
            ["Phone", "+92 300 0000000"],
            ["Email", "hello@umairfitness.gym"],
            ["Hours", "Mon–Sat 06:00–23:00 · Sun 08:00–20:00"],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-[var(--line)] pb-4">
              <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                {label}
              </div>
              <div className="text-sm mt-1">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
