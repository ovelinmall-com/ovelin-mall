import { db, productsTable } from "@workspace/db";
import { and, eq, ilike } from "drizzle-orm";

export function productQuantity(value: unknown): number {
  const match = String(value ?? "").match(/\d[\d,]*/);
  return match ? Number(match[0].replace(/,/g, "")) : 0;
}

export async function getPubgCodePriceMap(): Promise<Map<number, string>> {
  const codeProducts = await db
    .select({
      price: productsTable.price,
      name: productsTable.name,
      quantity: productsTable.quantity,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.platform, "PUBG Codes"),
        ilike(productsTable.category, "pubg-codes-%"),
        eq(productsTable.active, true),
      ),
    );

  return new Map(
    codeProducts
      .map((product) => [
        productQuantity(product.quantity ?? product.name),
        product.price,
      ] as const)
      .filter(([quantity]) => quantity > 0),
  );
}

export async function getEffectivePubgRechargePrice(product: {
  platform?: string | null;
  category?: string | null;
  name?: string | null;
  quantity?: string | null;
  price: string | number;
}): Promise<string> {
  if (product.platform !== "PUBG Mobile" || product.category !== "pubg-uc") {
    return String(product.price);
  }

  const codePrices = await getPubgCodePriceMap();
  return codePrices.get(productQuantity(product.quantity ?? product.name)) ?? String(product.price);
}