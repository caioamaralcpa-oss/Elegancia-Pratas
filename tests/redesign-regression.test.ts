import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCostPlusProfit, calculateCostPlusMarkup } from '../lib/pricing-workflow.ts';
import { monthlyDepreciationCents, packagingModelSummary, packagingUnitCostCents } from '../lib/inventory.ts';

test('redesign preserva preço, lucro e margem do cenário de referência', () => {
 const costs={acquisitionCostCents:1000,packagingCostCents:200,depreciationCostCents:50};
 const expected={fixedCostCents:1250,priceCents:1875,profitCents:625,estimatedMarginBps:3333};
 assert.deepEqual(calculateCostPlusMarkup(costs,5000),expected);
 assert.deepEqual(calculateCostPlusProfit(costs,625),expected);
});
test('redesign preserva arredondamento e rateio de centavos', () => {
 assert.equal(packagingUnitCostCents(1000,3),333);
 assert.equal(monthlyDepreciationCents(1201,'2026-01-01',new Date('2026-01-15T12:00:00Z')),101);
 assert.equal(monthlyDepreciationCents(1201,'2026-01-01',new Date('2026-02-15T12:00:00Z')),100);
 assert.deepEqual(packagingModelSummary([{item_id:'a',quantity:2},{item_id:'b',quantity:1}],[{id:'a',unit_cost_cents:333,quantity_on_hand:10},{id:'b',unit_cost_cents:100,quantity_on_hand:3}]),{costCents:766,availableSets:3});
});
