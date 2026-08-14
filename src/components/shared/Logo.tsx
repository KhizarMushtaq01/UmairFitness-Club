// src/components/shared/Logo.tsx
export function Logo() {
  return (
    <div className="flex items-center gap-[11px]">
      {/*
        The clip cuts the bottom-right triangle (44,22.4)-(44,32)-(30.8,32) out
        of this 44x32 box, so ink is safe wherever x <= 30.8 OR y <= 22.4. The
        old two-glyph "FC" cleared it on the x rule alone; three glyphs are wide
        enough to cross 30.8 and deep enough to cross 22.4, which clipped the C.
        pr/pb shrink the centring box to 40x23 so the glyphs clear BOTH bounds:
        x 9.5-30.5, y 4.5-18.5. leading-none keeps the line box at the font size
        so that vertical figure stays predictable.
      */}
      <div
        className="w-11 h-8 pr-[4px] pb-[9px] bg-[var(--txt)] text-[var(--inv)] grid place-items-center font-[var(--font-heading)] text-[14px] leading-none tracking-[.04em]"
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
