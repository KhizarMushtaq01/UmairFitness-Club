import { Topbar } from "@/components/shared/Topbar";

// Read-only reference matrix; the enforcement itself lives in assertRole and
// the per-role layouts, not here.
const PERMS = [
  ["Book classes", true, true, true],
  ["View own training data", true, true, true],
  ["Manage client programs", false, true, true],
  ["Mark attendance", false, true, true],
  ["Manage members & billing", false, false, true],
  ["Edit plans & pricing", false, false, true],
  ["Publish content", false, false, true],
  ["Manage roles & settings", false, false, true],
] as const;

export default function AdminSettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <div className="p-4 md:p-7 max-w-[1200px]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="text-left p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">
                  Permission
                </th>
                <th className="p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">
                  Member
                </th>
                <th className="p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">
                  Trainer
                </th>
                <th className="p-3 text-[10.5px] uppercase tracking-[.16em] text-[var(--dim)]">
                  Admin
                </th>
              </tr>
            </thead>
            <tbody>
              {PERMS.map(([name, m, t, a]) => (
                <tr key={name} className="border-b border-[var(--line)]">
                  <td className="p-3 text-sm">{name}</td>
                  <td className="p-3 text-center" style={{ color: m ? "var(--red)" : "var(--dim)" }}>
                    {m ? "✓" : "—"}
                  </td>
                  <td className="p-3 text-center" style={{ color: t ? "var(--red)" : "var(--dim)" }}>
                    {t ? "✓" : "—"}
                  </td>
                  <td className="p-3 text-center" style={{ color: a ? "var(--red)" : "var(--dim)" }}>
                    {a ? "✓" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
