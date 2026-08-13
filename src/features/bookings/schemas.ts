import { z } from "zod";

export const cancelBookingSchema = z.object({ bookingId: z.string().min(1) });
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
