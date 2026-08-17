import { z } from "zod";

// `plan` is a free string here on purpose: the valid keys live in the Plan
// table, which an admin can add to. The action checks the key exists before
// writing — an enum would have to be edited every time a tier is added, and
// would reintroduce the very const the Plan model replaced.
export const updateMembershipSchema = z.object({
  userId: z.string().min(1),
  plan: z.string().min(1),
  status: z.enum(["ACTIVE", "TRIAL", "AT_RISK", "CANCELLED"]),
});
export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
