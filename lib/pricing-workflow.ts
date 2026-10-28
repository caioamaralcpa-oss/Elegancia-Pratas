export type WorkflowPricingInput = {
  acquisitionCostCents: number;
  packagingCostCents: number;
  depreciationCostCents: number;
  targetMarginBps: number;
  manualPriceCents: number | null;
};

export function calculateWorkflowQuote(input: WorkflowPricingInput) {
  const fixedParts = [input.acquisitionCostCents, input.packagingCostCents, input.depreciationCostCents];
  if ([...fixedParts, input.targetMarginBps].some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Confira custos e margem.');
  const fixedCostCents = fixedParts.reduce((sum, value) => sum + value, 0);
  if (fixedCostCents <= 0 || fixedCostCents > 2147483647) throw new Error('O custo por peça deve ser maior que zero e estar dentro do limite.');
  if (input.targetMarginBps > 9999) throw new Error('A margem deve ser menor que 100%.');
  let priceCents: number;
  if (input.manualPriceCents === null) {
    priceCents = Math.ceil(fixedCostCents * 10000 / (10000 - input.targetMarginBps));
  } else {
    priceCents = input.manualPriceCents;
  }
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 || priceCents > 2147483647) throw new Error('Preço de venda inválido ou fora do limite.');
  const estimatedMarginBps = Math.floor((priceCents - fixedCostCents) * 10000 / priceCents);
  return { fixedCostCents, priceCents, estimatedMarginBps };
}
