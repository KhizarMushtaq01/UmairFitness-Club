"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * A photograph that drifts against the scroll.
 *
 * The image is inset past every edge so the drift never exposes a gap. That
 * inset is in the markup rather than the animation, which is why reduced
 * motion needs no special case here: the effect of doing nothing is a
 * correctly framed, fully visible, static photo.
 *
 * Only transform is animated. `scrub` ties progress to scroll position, so
 * there is no timeline still running after the section leaves the viewport.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  sizes = "100vw",
  priority = false,
  strength = 6,
  overlay = 0,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Drift in percent of the image's own height, each way. */
  strength?: number;
  /** Black scrim opacity, 0-1. Raise it when text sits on top. */
  overlay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -strength },
        {
          yPercent: strength,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [strength]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Inset by more than the drift so no edge can slide into view. */}
      <div ref={ref} className="absolute inset-[-10%]">
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
      {overlay > 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black"
          style={{ opacity: overlay }}
        />
      )}
    </div>
  );
}
