import { requireSession } from "@/lib/rbac";
import { getBookableClasses } from "@/features/bookings/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { ClassCard } from "./ClassCard";

export default async function MemberClassesPage() {
  const session = await requireSession();
  const classes = await getBookableClasses(session.user.id);

  return (
    <>
      <Topbar title="Book a class" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {classes.length === 0 ? (
          <EmptyState body="No upcoming classes on the timetable right now. Check back soon." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <ClassCard key={c.id} {...c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
