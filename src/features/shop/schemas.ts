import { z } from "zod";

export const addProductSchema = z.object({
  name: z.string().min(2),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  category: z.string().min(2),
});
export type AddProductInput = z.infer<typeof addProductSchema>;
