"use server";
import { db } from "@/lib/db";
import { getSession, assertRole } from "@/lib/rbac";
import { addProductSchema, type AddProductInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function addProduct(rawInput: AddProductInput) {
  const input = addProductSchema.parse(rawInput);
  const session = await getSession();
  assertRole(session, ["ADMIN"]);

  await db.product.create({ data: input });
  revalidatePath("/dashboard/admin/shop");
  return { ok: true as const };
}
