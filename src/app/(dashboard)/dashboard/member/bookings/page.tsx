import { requireSession } from "@/lib/rbac";
import { getMemberBookings } from "@/features/bookings/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";
import { BookingsList } from "./BookingsList";

export default async function MemberBookingsPage() {
  const session = await requireSession();
  const bookings = await getMemberBookings(session.user.id);

  return (
    <>
      <Topbar title="Bookings" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        {bookings.length === 0 ? (
          <EmptyState body="No upcoming bookings. Book a class to see it here." />
        ) : (
          <BookingsList bookings={bookings} />
        )}
      </div>
    </>
  );
}
