export type PricingInput = {
  acquisition_cost_cents: number;
  packaging_cost_cents: number;
  labor_cost_cents: number;
  shipping_subsidy_cents: number;
  other_cost_cents: number;
  payment_fee_bps: number;
  tax_bps: number;
  overhead_bps: number;
  target_margin_bps: number;
};

export const emptyPricing: PricingInput = {
  acquisition_cost_cents: 0, packaging_cost_cents: 0, labor_cost_cents: 0,
  shipping_subsidy_cents: 0, other_cost_cents: 0, payment_fee_bps: 0,
  tax_bps: 0, overhead_bps: 0, target_margin_bps: 0,
};

export function calculateSuggestedPrice(input: PricingInput) {
  const fixedKeys: (keyof PricingInput)[] = ['acquisition_cost_cents', 'packaging_cost_cents', 'labor_cost_cents', 'shipping_subsidy_cents', 'other_cost_cents'];
  const rateKeys: (keyof PricingInput)[] = ['payment_fee_bps', 'tax_bps', 'overhead_bps', 'target_margin_bps'];
  for (const key of [...fixedKeys, ...rateKeys]) {
    const value = input[key];
    if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) throw new Error('Preencha custos e percentuais válidos.');
  }
  const fixedCostCents = fixedKeys.reduce((sum, key) => sum + input[key], 0);
  const rateBps = rateKeys.reduce((sum, key) => sum + input[key], 0);
  if (fixedCostCents <= 0) throw new Error('Informe ao menos um custo.');
  if (rateBps >= 10000) throw new Error('A soma das taxas e margem deve ser menor que 100%.');
  const suggestedPriceCents = Math.ceil(fixedCostCents * 10000 / (10000 - rateBps));
  if (!Number.isSafeInteger(suggestedPriceCents) || suggestedPriceCents > 2147483647) throw new Error('O preço calculado ultrapassa o limite permitido.');
  const variableCostBps = input.payment_fee_bps + input.tax_bps + input.overhead_bps;
  const estimatedMarginBps = Math.floor((suggestedPriceCents - fixedCostCents - suggestedPriceCents * variableCostBps / 10000) * 10000 / suggestedPriceCents);
  return { fixedCostCents, suggestedPriceCents, estimatedMarginBps };
}
