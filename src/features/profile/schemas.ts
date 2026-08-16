import { z } from "zod";
import { MAX_FREEZE_WEEKS_PER_YEAR } from "./freeze-allowance";

export const updateProfileSchema = z.object({ name: z.string().min(2) });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const freezeMembershipSchema = z.object({
  weeks: z.number().int().min(1).max(MAX_FREEZE_WEEKS_PER_YEAR),
});
export type FreezeMembershipInput = z.infer<typeof freezeMembershipSchema>;
