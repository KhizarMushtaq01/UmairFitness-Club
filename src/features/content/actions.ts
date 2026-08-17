"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import {
  publishPostSchema,
  type PublishPostInput,
  createPostSchema,
  type CreatePostInput,
  unpublishPostSchema,
  type UnpublishPostInput,
  deletePostSchema,
  type DeletePostInput,
  galleryCaptionSchema,
  deleteGalleryImageSchema,
  type DeleteGalleryImageInput,
  MAX_UPLOAD_BYTES,
} from "./schemas";
import { uploadImage } from "@/lib/uploads";
import { revalidatePath } from "next/cache";

export async function publishPost(rawInput: PublishPostInput) {
  const input = publishPostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.post.update({ where: { id: input.postId }, data: { status: "PUBLISHED" } });
  revalidatePath("/dashboard/admin/content");
  // The homepage's LatestPosts reads getPublicPosts, so the public site needs
  // revalidating too or a newly published post stays invisible there.
  revalidatePath("/");
  return { ok: true as const };
}

export async function createPost(rawInput: CreatePostInput) {
  const input = createPostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // DRAFT, always. getPublicPosts filters on PUBLISHED, so publishing is a
  // second, deliberate step — a post is never on the homepage the moment it
  // is typed. Title and tag only: Post has no body column and no blog route
  // exists to render one.
  await db.post.create({
    data: { title: input.title, tag: input.tag, status: "DRAFT", authorId: session.user.id },
  });

  revalidatePath("/dashboard/admin/content");
  return { ok: true as const };
}

export async function unpublishPost(rawInput: UnpublishPostInput) {
  const input = unpublishPostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.post.update({ where: { id: input.postId }, data: { status: "DRAFT" } });

  revalidatePath("/dashboard/admin/content");
  // The homepage's LatestPosts reads getPublicPosts, so an unpublish that did
  // not revalidate here would leave the post visible to the public until the
  // next deploy.
  revalidatePath("/");
  return { ok: true as const };
}

export async function deletePost(rawInput: DeletePostInput) {
  const input = deletePostSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.post.delete({ where: { id: input.postId } });

  revalidatePath("/dashboard/admin/content");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Takes FormData rather than a typed object: a file cannot cross the server
 * action boundary any other way. The caption goes through Zod; the file is
 * checked by hand, since Zod has no useful File schema here.
 */
export async function uploadGalleryImage(formData: FormData) {
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  const { caption } = galleryCaptionSchema.parse({ caption: formData.get("caption") });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Validation: no file uploaded");
  // The gallery renders every row through next/image, so a non-image would
  // upload cleanly and then break the page it appears on.
  if (!file.type.startsWith("image/")) throw new Error("Validation: only image files are allowed");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Validation: image is larger than 5 MB");

  // Checks first, upload second: rejecting after writing the file would leave
  // an orphan on disk (or a paid-for Cloudinary asset) with no row pointing
  // at it.
  const { url } = await uploadImage(Buffer.from(await file.arrayBuffer()), file.name);
  await db.galleryImage.create({ data: { url, caption } });

  revalidatePath("/dashboard/admin/gallery");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteGalleryImage(rawInput: DeleteGalleryImageInput) {
  const input = deleteGalleryImageSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  // The row goes; the uploaded file itself is left in place. Deleting the
  // stored asset means a second adapter method and a Cloudinary destroy call,
  // which the spec did not scope.
  await db.galleryImage.delete({ where: { id: input.imageId } });

  revalidatePath("/dashboard/admin/gallery");
  revalidatePath("/");
  return { ok: true as const };
}
