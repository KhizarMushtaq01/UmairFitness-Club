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

export const galleryCaptionSchema = z.object({ caption: z.string().min(2) });

export const deleteGalleryImageSchema = z.object({ imageId: z.string().min(1) });
export type DeleteGalleryImageInput = z.infer<typeof deleteGalleryImageSchema>;

/** 5 MB. Large enough for a phone photo, small enough not to stall the action. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
