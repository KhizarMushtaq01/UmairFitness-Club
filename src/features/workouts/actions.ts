"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const markAttendanceSchema = z.object({ memberId: z.string().min(1) });
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export async function markAttendance(rawInput: MarkAttendanceInput) {
  const input = markAttendanceSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["TRAINER", "ADMIN"]);

  await db.attendanceLog.create({ data: { userId: input.memberId } });
  revalidatePath("/dashboard/trainer/clients");
  return { ok: true as const };
}
