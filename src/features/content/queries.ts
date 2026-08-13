import { db } from "@/lib/db";

export async function getAllPosts() {
  const posts = await db.post.findMany({ orderBy: { createdAt: "desc" } });
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    tag: p.tag,
    views: p.views,
    status: p.status,
    statusColor: p.status === "DRAFT" ? "var(--red)" : "var(--mut)",
  }));
}

export async function getGalleryImages() {
  const images = await db.galleryImage.findMany();
  return images.map((i) => ({ id: i.id, url: i.url, caption: i.caption }));
}
