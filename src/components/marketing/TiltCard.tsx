"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/use-reduced-motion";

export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Pointer-driven tilt is meaningless on touch, and attaching the handlers
    // there burns battery for nothing.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setEnabled(finePointer && !prefersReducedMotion());
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !enabled) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${px * max * 2}deg) rotateX(${-py * max * 2}deg)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={enabled ? onMove : undefined}
      onPointerLeave={enabled ? reset : undefined}
      className={className}
      style={{ transition: "transform 200ms ease-out", willChange: enabled ? "transform" : undefined }}
    >
      {children}
    </div>
  );
}
