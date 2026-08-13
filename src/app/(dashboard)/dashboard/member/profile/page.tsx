import { requireSession } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Topbar } from "@/components/shared/Topbar";
import { ProfileForm } from "./ProfileForm";

export default async function MemberProfilePage() {
  const session = await requireSession();
  const membership = await db.membership.findFirst({ where: { userId: session.user.id } });

  return (
    <>
      <Topbar title="Profile & settings" />
      <div className="p-7 flex flex-col gap-6 max-w-[1200px]">
        <ProfileForm initialName={session.user.name} />
        {membership && (
          <div className="bg-[var(--card)] border border-[var(--line)] p-5 max-w-[420px]">
            <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
              Plan
            </div>
            <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-2">
              {membership.plan}
            </div>
            <div className="text-[var(--dim)] text-xs mt-1">Status: {membership.status}</div>
          </div>
        )}
      </div>
    </>
  );
}
