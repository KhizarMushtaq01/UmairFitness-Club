// src/components/marketing/sections/LatestPosts.tsx
import { Reveal } from "@/components/marketing/Reveal";
import { TiltCard } from "@/components/marketing/TiltCard";

export function LatestPosts({
  posts,
}: {
  posts: { id: string; title: string; tag: string; date: string }[];
}) {
  if (posts.length === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-7 py-20" style={{ perspective: "1000px" }}>
      <Reveal>
        <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
          FROM THE GYM FLOOR
        </h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {posts.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <TiltCard className="bg-[var(--card)] border border-[var(--line)] p-6 h-full">
              <div className="text-[var(--red)] text-[10.5px] font-semibold tracking-[.18em] uppercase">
                {p.tag}
              </div>
              <div style={{ fontFamily: "var(--font-heading)" }} className="text-2xl mt-3">
                {p.title}
              </div>
              <div className="text-[var(--dim)] text-xs mt-3">{p.date}</div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
