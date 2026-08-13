import { notFound } from "next/navigation";
import { requireSession } from "@/lib/rbac";
import { getClientDetail } from "@/features/workouts/queries";
import { Topbar } from "@/components/shared/Topbar";
import { MarkAttendanceButton } from "./MarkAttendanceButton";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  // Scoped by coachId, so a coach can only open their own clients — an
  // unrelated member id 404s rather than leaking another coach's client.
  const detail = await getClientDetail(session.user.id, id);
  if (!detail) notFound();

  return (
    <>
      <Topbar title={detail.memberName} />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <div className="bg-[var(--card)] border border-[var(--line)] p-5 flex justify-between items-center">
          <div>
            <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl">
              {detail.programName}
            </div>
            <div className="text-[var(--dim)] text-xs mt-1">
              Adherence: {detail.adherencePct}%
            </div>
          </div>
          <MarkAttendanceButton memberId={id} />
        </div>
        <div className="bg-[var(--card)] border border-[var(--line)]">
          {detail.days.map((d) => (
            <div key={d.day} className="flex gap-4 p-4 border-b border-[var(--line)] last:border-0">
              <div style={{ fontFamily: "var(--font-heading)" }}>{d.day}</div>
              <div className="text-[var(--dim)] text-xs">
                {d.focus} · {d.exerciseCount} exercises
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
