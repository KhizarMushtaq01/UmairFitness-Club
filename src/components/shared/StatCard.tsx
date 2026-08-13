export function StatCard({
  label,
  value,
  delta,
  deltaColor,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--line)] p-5">
      <div className="text-[10.5px] font-semibold tracking-[.18em] uppercase text-[var(--dim)]">
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[42px] leading-[1.05] mt-2">
        {value}
      </div>
      {delta && (
        <div className="text-[11.5px] font-semibold mt-1" style={{ color: deltaColor ?? "var(--mut)" }}>
          {delta}
        </div>
      )}
    </div>
  );
}
