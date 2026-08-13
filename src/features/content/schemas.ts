import { z } from "zod";

export const publishPostSchema = z.object({ postId: z.string().min(1) });
export type PublishPostInput = z.infer<typeof publishPostSchema>;
