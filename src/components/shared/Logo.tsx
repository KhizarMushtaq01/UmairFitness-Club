// src/components/shared/Logo.tsx
export function Logo() {
  return (
    <div className="flex items-center gap-[11px]">
      <div
        className="w-8 h-8 bg-[var(--txt)] text-[var(--inv)] grid place-items-center font-[var(--font-heading)] text-[17px]"
        style={{ clipPath: "polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)" }}
      >
        FC
      </div>
      <div className="font-[var(--font-heading)] text-[19px] tracking-[.14em]">
        FIGHT CLUB
      </div>
    </div>
  );
}
