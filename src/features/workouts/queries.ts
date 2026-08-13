import { db } from "@/lib/db";

export async function getMemberWorkoutPlan(userId: string) {
  const assignment = await db.programAssignment.findFirst({
    where: { memberId: userId },
    orderBy: { startedAt: "desc" },
    include: {
      program: { include: { days: { include: { exercises: true }, orderBy: { dayIndex: "asc" } } } },
    },
  });
  if (!assignment) return null;
  return {
    programName: assignment.program.name,
    days: assignment.program.days.map((d) => ({
      day: `DAY ${d.dayIndex}`,
      focus: d.focus,
      exercises: d.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        load: e.load,
        tempo: e.tempo,
      })),
    })),
  };
}
