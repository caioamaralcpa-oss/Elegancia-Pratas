import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calculateSuggestedPrice, emptyPricing } from '../lib/pricing.ts';

test('calcula margem sobre o preço de venda, não markup sobre custo', () => {
  const result = calculateSuggestedPrice({ ...emptyPricing, acquisition_cost_cents: 10000, packaging_cost_cents: 1000, payment_fee_bps: 300, tax_bps: 1000, target_margin_bps: 3000 });
  assert.equal(result.fixedCostCents, 11000);
  assert.equal(result.suggestedPriceCents, 19299);
  assert.ok(result.estimatedMarginBps >= 3000);
});
test('não calcula preço sem custo ou com taxas e margem de 100%', () => {
  assert.throws(() => calculateSuggestedPrice(emptyPricing));
  assert.throws(() => calculateSuggestedPrice({ ...emptyPricing, acquisition_cost_cents: 1000, tax_bps: 6000, target_margin_bps: 4000 }));
});
test('arredonda para cima e protege contra estouro de preço', () => {
  assert.equal(calculateSuggestedPrice({ ...emptyPricing, acquisition_cost_cents: 101, target_margin_bps: 5000 }).suggestedPriceCents, 202);
  assert.throws(() => calculateSuggestedPrice({ ...emptyPricing, acquisition_cost_cents: 2147483647, target_margin_bps: 5000 }));
});
