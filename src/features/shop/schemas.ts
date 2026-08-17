import { z } from "zod";

export const addProductSchema = z.object({
  name: z.string().min(2),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  category: z.string().min(2),
});
export type AddProductInput = z.infer<typeof addProductSchema>;

export const advanceOrderStatusSchema = z.object({ orderId: z.string().min(1) });
export type AdvanceOrderStatusInput = z.infer<typeof advanceOrderStatusSchema>;

// Restocking is just a stock edit — there is no separate restock action.
export const updateProductSchema = addProductSchema.extend({
  productId: z.string().min(1),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const deleteProductSchema = z.object({ productId: z.string().min(1) });
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
