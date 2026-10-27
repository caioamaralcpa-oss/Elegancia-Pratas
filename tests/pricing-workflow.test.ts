import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateWorkflowQuote, type WorkflowPricingInput } from '../lib/pricing-workflow.ts';

const base: WorkflowPricingInput = {
  acquisitionCostCents: 1000, packagingCostCents: 200, depreciationCostCents: 100,
  laborCostCents: 100, shippingSubsidyCents: 100, otherCostCents: 0,
  paymentFeeBps: 500, taxBps: 500, overheadBps: 0,
  targetMarginBps: 2000, manualPriceCents: null,
};

test('margem alvo calcula preço com custos, taxas e depreciação', () => {
  const result = calculateWorkflowQuote(base);
  assert.equal(result.fixedCostCents, 1500);
  assert.equal(result.priceCents, 2143);
  assert.ok(result.estimatedMarginBps >= 2000);
});

test('preço manual recalcula margem inclusive quando há prejuízo', () => {
  assert.equal(calculateWorkflowQuote({ ...base, manualPriceCents: 3000 }).estimatedMarginBps, 4000);
  assert.ok(calculateWorkflowQuote({ ...base, manualPriceCents: 1000 }).estimatedMarginBps < 0);
});

test('rejeita percentuais impossíveis e preço sem custo', () => {
  assert.throws(() => calculateWorkflowQuote({ ...base, targetMarginBps: 9000 }), /100%/);
  assert.throws(() => calculateWorkflowQuote({ ...base, acquisitionCostCents: 0, packagingCostCents: 0, depreciationCostCents: 0, laborCostCents: 0, shippingSubsidyCents: 0 }), /custo/i);
});
