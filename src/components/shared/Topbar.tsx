export function Topbar({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md border-b border-[var(--line)] flex items-center gap-5 px-7 h-16">
      <div style={{ fontFamily: "var(--font-heading)" }} className="text-[26px] tracking-[.06em]">
        {title}
      </div>
    </div>
  );
}
