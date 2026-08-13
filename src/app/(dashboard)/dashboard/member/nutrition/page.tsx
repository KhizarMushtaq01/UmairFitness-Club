import { requireSession } from "@/lib/rbac";
import { getMemberNutritionPlan } from "@/features/nutrition/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function MemberNutritionPage() {
  const session = await requireSession();
  const plan = await getMemberNutritionPlan(session.user.id);

  return (
    <>
      <Topbar title="Nutrition" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        {!plan ? (
          <EmptyState body="No nutrition plan yet. Ask your coach to set your macro targets." />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Calories", value: `${plan.kcal}` },
                { label: "Protein", value: `${plan.protein}g` },
                { label: "Carbs", value: `${plan.carbs}g` },
                { label: "Fat", value: `${plan.fat}g` },
              ].map((s) => (
                <div key={s.label} className="bg-[var(--card)] border border-[var(--line)] p-5">
                  <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
                    {s.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)" }} className="text-[32px] mt-2">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[var(--card)] border border-[var(--line)]">
              {plan.meals.map((m, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0"
                >
                  <div style={{ fontFamily: "var(--font-heading)" }} className="text-lg w-16">
                    {m.time}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">
                      {m.name} — {m.kcal} kcal
                    </div>
                    <div className="text-[var(--dim)] text-xs">{m.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
