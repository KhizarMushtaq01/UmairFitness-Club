import { z } from "zod";

export const updatePlanSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(2),
  // Zero is allowed — a free introductory tier is a real thing. Negative is
  // not.
  priceCents: z.number().int().min(0),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
