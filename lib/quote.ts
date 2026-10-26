import { z } from 'zod';

export const cartInput = z.object({ items: z.array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(10) })).min(1).max(20) });
export type CartInput = z.infer<typeof cartInput>;
export type PricedProduct = { id: string; name: string; price_cents: number; stock: number };

export function calculateQuote(input: CartInput, products: PricedProduct[]) {
  const byId = new Map(products.map(product => [product.id, product]));
  const seen = new Set<string>();
  const items = input.items.map(item => {
    if (seen.has(item.productId)) throw new Error('Produto repetido');
    seen.add(item.productId);
    const product = byId.get(item.productId);
    if (!product || !Number.isSafeInteger(product.price_cents) || product.price_cents < 0 || item.quantity > product.stock) throw new Error('Produto indisponível');
    return { productId: product.id, name: product.name, quantity: item.quantity, unitPriceCents: product.price_cents, totalCents: product.price_cents * item.quantity };
  });
  const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
  if (!Number.isSafeInteger(subtotalCents)) throw new Error('Total inválido');
  return { items, subtotalCents };
}
