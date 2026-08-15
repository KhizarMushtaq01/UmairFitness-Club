// src/components/marketing/sections/GalleryStrip.tsx
import Image from "next/image";
import { Reveal } from "@/components/marketing/Reveal";

export function GalleryStrip({
  images,
}: {
  images: { id: string; url: string; caption: string }[];
}) {
  if (images.length === 0) return null;

  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-4 md:px-7">
        <Reveal>
          <h2 style={{ fontFamily: "var(--font-heading)" }} className="text-[30px] tracking-[.06em]">
            INSIDE THE GYM
          </h2>
        </Reveal>
      </div>
      <div className="mt-8 overflow-x-auto">
        <div className="flex gap-4 px-4 md:px-7 max-w-[1200px] mx-auto min-w-fit">
          {images.map((img) => (
            <figure key={img.id} className="border border-[var(--line)] shrink-0 w-[260px]">
              <Image
                src={img.url}
                alt={img.caption}
                width={520}
                height={340}
                className="w-full h-[170px] object-cover block"
              />
              <figcaption className="p-3 text-[var(--dim)] text-xs">{img.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
