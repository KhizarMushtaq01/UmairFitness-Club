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

export async function getTrainerClients(coachId: string) {
  const assignments = await db.programAssignment.findMany({
    where: { program: { coachId } },
    include: { member: true, program: true },
  });
  return assignments.map((a) => ({
    id: a.member.id,
    name: a.member.name,
    program: a.program.name,
    adherencePct: a.adherencePct,
  }));
}

export async function getClientDetail(coachId: string, memberId: string) {
  const assignment = await db.programAssignment.findFirst({
    where: { memberId, program: { coachId } },
    include: {
      member: true,
      program: { include: { days: { include: { exercises: true }, orderBy: { dayIndex: "asc" } } } },
    },
  });
  if (!assignment) return null;
  return {
    memberName: assignment.member.name,
    adherencePct: assignment.adherencePct,
    programName: assignment.program.name,
    days: assignment.program.days.map((d) => ({
      day: `DAY ${d.dayIndex}`,
      focus: d.focus,
      exerciseCount: d.exercises.length,
    })),
  };
}

export async function getTrainerPrograms(coachId: string) {
  const programs = await db.workoutProgram.findMany({
    where: { coachId },
    include: { _count: { select: { assignments: true } } },
  });
  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    weeks: p.weeks,
    assignedCount: p._count.assignments,
  }));
}
