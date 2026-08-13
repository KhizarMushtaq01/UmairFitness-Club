import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  message: z.string().min(10),
});
export type ContactInput = z.infer<typeof contactSchema>;
