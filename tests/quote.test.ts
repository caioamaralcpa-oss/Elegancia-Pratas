import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { cartInput, calculateQuote } from '../lib/quote.ts';

const id = '11111111-1111-4111-8111-111111111111';
test('ignora preços enviados pelo navegador e usa os valores do banco', () => {
  const input = cartInput.parse({ items: [{ productId: id, quantity: 2, priceCents: 1 }] });
  assert.equal(calculateQuote(input, [{ id, name: 'Anel', price_cents: 2500, stock: 3 }]).subtotalCents, 5000);
});
test('rejeita quantidade acima do estoque', () => {
  const input = cartInput.parse({ items: [{ productId: id, quantity: 2 }] });
  assert.throws(() => calculateQuote(input, [{ id, name: 'Anel', price_cents: 2500, stock: 1 }]));
});
test('rejeita IDs repetidos e quantidades fora do limite', () => {
  assert.equal(cartInput.safeParse({ items: [{ productId: id, quantity: 11 }] }).success, false);
  const input = cartInput.parse({ items: [{ productId: id, quantity: 1 }, { productId: id, quantity: 1 }] });
  assert.throws(() => calculateQuote(input, [{ id, name: 'Anel', price_cents: 2500, stock: 3 }]));
});
