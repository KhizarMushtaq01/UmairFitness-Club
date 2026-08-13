export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[11px] font-semibold" style={{ color }}>
      {label}
    </span>
  );
}
