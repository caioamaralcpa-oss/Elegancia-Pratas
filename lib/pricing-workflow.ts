export type WorkflowPricingInput = {
  acquisitionCostCents: number;
  packagingCostCents: number;
  depreciationCostCents: number;
  laborCostCents: number;
  shippingSubsidyCents: number;
  otherCostCents: number;
  paymentFeeBps: number;
  taxBps: number;
  overheadBps: number;
  targetMarginBps: number;
  manualPriceCents: number | null;
};

export function calculateWorkflowQuote(input: WorkflowPricingInput) {
  const fixedParts = [input.acquisitionCostCents, input.packagingCostCents, input.depreciationCostCents,
    input.laborCostCents, input.shippingSubsidyCents, input.otherCostCents];
  const rates = [input.paymentFeeBps, input.taxBps, input.overheadBps, input.targetMarginBps];
  if ([...fixedParts, ...rates].some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Confira custos e percentuais.');
  const fixedCostCents = fixedParts.reduce((sum, value) => sum + value, 0);
  const variableBps = input.paymentFeeBps + input.taxBps + input.overheadBps;
  if (fixedCostCents <= 0 || fixedCostCents > 2147483647) throw new Error('O custo por peça deve ser maior que zero e estar dentro do limite.');
  if (rates.some(value => value > 9999) || variableBps >= 10000) throw new Error('A soma das taxas deve ser menor que 100%.');
  let priceCents: number;
  if (input.manualPriceCents === null) {
    if (variableBps + input.targetMarginBps >= 10000) throw new Error('A soma das taxas e margem deve ser menor que 100%.');
    priceCents = Math.ceil(fixedCostCents * 10000 / (10000 - variableBps - input.targetMarginBps));
  } else {
    priceCents = input.manualPriceCents;
  }
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 || priceCents > 2147483647) throw new Error('Preço de venda inválido ou fora do limite.');
  const estimatedMarginBps = Math.floor((priceCents - fixedCostCents - priceCents * variableBps / 10000) * 10000 / priceCents);
  return { fixedCostCents, priceCents, estimatedMarginBps, variableBps };
}
