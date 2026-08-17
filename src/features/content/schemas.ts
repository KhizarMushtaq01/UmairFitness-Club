import { z } from "zod";

export const publishPostSchema = z.object({ postId: z.string().min(1) });
export type PublishPostInput = z.infer<typeof publishPostSchema>;

export const createPostSchema = z.object({
  title: z.string().min(2),
  tag: z.string().min(2),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const unpublishPostSchema = z.object({ postId: z.string().min(1) });
export type UnpublishPostInput = z.infer<typeof unpublishPostSchema>;

export const deletePostSchema = z.object({ postId: z.string().min(1) });
export type DeletePostInput = z.infer<typeof deletePostSchema>;
