import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCostPlusMarkup, calculateCostPlusProfit, calculateWorkflowQuote, type WorkflowPricingInput } from '../lib/pricing-workflow.ts';

const base: WorkflowPricingInput = {
  acquisitionCostCents: 1000, packagingCostCents: 200, depreciationCostCents: 100,
  targetMarginBps: 2000, manualPriceCents: null,
};

test('margem alvo usa somente joia, embalagem e depreciação', () => {
  const result = calculateWorkflowQuote(base);
  assert.equal(result.fixedCostCents, 1300);
  assert.equal(result.priceCents, 1625);
  assert.ok(result.estimatedMarginBps >= 2000);
});

test('preço manual recalcula margem inclusive quando há prejuízo', () => {
  assert.equal(calculateWorkflowQuote({ ...base, manualPriceCents: 3000 }).estimatedMarginBps, 5666);
  assert.ok(calculateWorkflowQuote({ ...base, manualPriceCents: 1000 }).estimatedMarginBps < 0);
});

test('rejeita percentuais impossíveis e preço sem custo', () => {
  assert.throws(() => calculateWorkflowQuote({ ...base, targetMarginBps: 10000 }), /100%/);
  assert.throws(() => calculateWorkflowQuote({ ...base, acquisitionCostCents: 0, packagingCostCents: 0, depreciationCostCents: 0 }), /custo/i);
});

test('exemplo real: custo-base de R$ 76,24 e margem de 52%', () => {
  const result = calculateWorkflowQuote({ acquisitionCostCents: 7600, packagingCostCents: 10, depreciationCostCents: 14, targetMarginBps: 5200, manualPriceCents: null });
  assert.equal(result.fixedCostCents, 7624);
  assert.equal(result.priceCents, 15884);
});

test('acréscimo de 150% resulta em lucro de 60% sobre cada venda', () => {
  const result = calculateWorkflowQuote({ ...base, markupBps: 15000 });
  assert.equal(result.priceCents, 3250);
  assert.equal(result.profitCents, 1950);
  assert.equal(result.estimatedMarginBps, 6000);
});

test('preço é custo mais lucro desejado em reais', () => {
  const result = calculateCostPlusProfit({ acquisitionCostCents: 7600, packagingCostCents: 10, depreciationCostCents: 14 }, 5000);
  assert.equal(result.fixedCostCents, 7624);
  assert.equal(result.profitCents, 5000);
  assert.equal(result.priceCents, 12624);
  assert.equal(result.estimatedMarginBps, 3960);
});

test('lucro desejado não pode ser negativo e preço não pode exceder limite', () => {
  const costs = { acquisitionCostCents: 7600, packagingCostCents: 10, depreciationCostCents: 14 };
  assert.throws(() => calculateCostPlusProfit(costs, -1), /lucro/i);
  assert.throws(() => calculateCostPlusProfit(costs, 2147483647), /limite/i);
});

test('padrão de 50% sobre custo: R$ 100 de custo vira R$ 150 de venda', () => {
  const costs = { acquisitionCostCents: 9000, packagingCostCents: 800, depreciationCostCents: 200 };
  const result = calculateCostPlusMarkup(costs, 5000);
  assert.equal(result.fixedCostCents, 10000);
  assert.equal(result.profitCents, 5000);
  assert.equal(result.priceCents, 15000);
  assert.equal(result.estimatedMarginBps, 3333);
  assert.equal(calculateCostPlusProfit(costs, 7000).priceCents, 17000);
  assert.equal(calculateCostPlusProfit(costs, 8000).profitCents, 8000);
});
