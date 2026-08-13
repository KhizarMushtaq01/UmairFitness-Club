import Image from "next/image";
import { getGalleryImages } from "@/features/content/queries";
import { EmptyState } from "@/components/shared/EmptyState";
import { Topbar } from "@/components/shared/Topbar";

export default async function AdminGalleryPage() {
  const images = await getGalleryImages();

  return (
    <>
      <Topbar title="Gallery" />
      <div className="p-7 max-w-[1200px]">
        {images.length === 0 ? (
          <EmptyState body="No gallery images yet." />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="border border-[var(--line)]">
                {/* next/image rather than a bare <img>: next lint's
                    no-img-element rule fails the build otherwise. */}
                <Image
                  src={img.url}
                  alt={img.caption}
                  width={300}
                  height={150}
                  className="w-full h-[150px] object-cover block"
                />
                <div className="p-2 text-[var(--dim)] text-xs">{img.caption}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
