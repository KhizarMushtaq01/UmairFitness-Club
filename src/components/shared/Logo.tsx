// src/components/shared/Logo.tsx
export function Logo() {
  return (
    <div className="flex items-center gap-[11px]">
      <div
        className="w-11 h-8 bg-[var(--txt)] text-[var(--inv)] grid place-items-center font-[var(--font-heading)] text-[15px] tracking-[.04em]"
        style={{ clipPath: "polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)" }}
      >
        UFC
      </div>
      <div className="font-[var(--font-heading)] text-[16px] tracking-[.08em] whitespace-nowrap">
        UMAIR FITNESS CLUB
      </div>
    </div>
  );
}
