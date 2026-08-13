import { getPublicTrainers } from "@/features/marketing/queries";

export default async function TrainersPage() {
  const trainers = await getPublicTrainers();

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-16 md:py-24">
      <h1 style={{ fontFamily: "var(--font-display)" }} className="text-[40px] sm:text-[64px] leading-[0.95]">
        COACHES
      </h1>
      {trainers.length === 0 ? (
        <p className="text-[var(--mut)] mt-6">Coach profiles going up soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {trainers.map((t) => (
            <div key={t.id} className="bg-[var(--card)] border border-[var(--line)] p-5">
              <div className="w-14 h-14 bg-[var(--red)] text-white grid place-items-center text-lg font-bold">
                {t.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-4">
                {t.name}
              </div>
              <div className="text-[var(--mut)] text-xs mt-2">
                {t.classCount} classes · {t.programCount} programmes
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
