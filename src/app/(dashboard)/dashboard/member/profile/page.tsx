import { requireSession } from "@/lib/rbac";
import { getMembershipStatus } from "@/features/memberships/queries";
import { Topbar } from "@/components/shared/Topbar";
import { ProfileForm } from "./ProfileForm";
import { MembershipControls } from "./MembershipControls";

export default async function MemberProfilePage() {
  const session = await requireSession();
  const membership = await getMembershipStatus(session.user.id);

  return (
    <>
      <Topbar title="Profile & settings" />
      <div className="p-4 md:p-7 flex flex-col gap-6 max-w-[1200px]">
        <ProfileForm initialName={session.user.name} />
        {membership && (
          <MembershipControls
            plan={membership.plan}
            displayStatus={membership.displayStatus}
            frozenUntil={membership.frozenUntil?.toLocaleDateString() ?? null}
            cancelEffectiveAt={membership.cancelEffectiveAt?.toLocaleDateString() ?? null}
            remainingWeeks={membership.remainingWeeks}
          />
        )}
      </div>
    </>
  );
}
