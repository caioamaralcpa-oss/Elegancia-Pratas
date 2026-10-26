export type CartItem = { productId: string; slug: string; name: string; priceCents: number; imageUrl: string | null; quantity: number };
const key = 'elegancia-cart-v1';
export function readCart(): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CartItem => typeof item.productId === 'string' && typeof item.slug === 'string' && typeof item.name === 'string' && Number.isInteger(item.priceCents) && Number.isInteger(item.quantity) && item.quantity > 0);
  } catch { return []; }
}
export function writeCart(items: CartItem[]) { localStorage.setItem(key, JSON.stringify(items)); window.dispatchEvent(new Event('elegancia-cart-change')); }
export function addToCart(item: Omit<CartItem, 'quantity'>) {
  const items = readCart();
  const found = items.find(p => p.productId === item.productId);
  if (found) found.quantity += 1;
  else items.push({ ...item, quantity: 1 });
  writeCart(items);
}
