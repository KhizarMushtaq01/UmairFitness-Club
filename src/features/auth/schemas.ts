import { z } from "zod";

// Zod 4 moved the string formats to top-level factories; `z.string().email()`
// still works but is deprecated.
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});
export type SignupInput = z.infer<typeof signupSchema>;
