import { db } from "@/lib/db";

export async function getMemberNutritionPlan(userId: string) {
  const plan = await db.nutritionPlan.findFirst({
    where: { memberId: userId },
    include: { meals: true },
  });
  if (!plan) return null;
  return {
    kcal: plan.kcal,
    protein: plan.protein,
    carbs: plan.carbs,
    fat: plan.fat,
    meals: plan.meals.map((m) => ({
      time: m.time,
      name: m.name,
      detail: m.detail,
      kcal: m.kcal,
    })),
  };
}
