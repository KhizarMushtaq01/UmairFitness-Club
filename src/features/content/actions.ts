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
} from "./schemas";
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
