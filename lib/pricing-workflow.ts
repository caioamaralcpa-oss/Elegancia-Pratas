export type WorkflowPricingInput = {
  acquisitionCostCents: number;
  packagingCostCents: number;
  depreciationCostCents: number;
  targetMarginBps: number;
  manualPriceCents: number | null;
  markupBps?: number | null;
};

export function calculateWorkflowQuote(input: WorkflowPricingInput) {
  const fixedParts = [input.acquisitionCostCents, input.packagingCostCents, input.depreciationCostCents];
  if ([...fixedParts, input.targetMarginBps, input.markupBps ?? 0].some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Confira custos e percentual.');
  const fixedCostCents = fixedParts.reduce((sum, value) => sum + value, 0);
  if (fixedCostCents <= 0 || fixedCostCents > 2147483647) throw new Error('O custo por peça deve ser maior que zero e estar dentro do limite.');
  if (input.targetMarginBps > 9999) throw new Error('A margem deve ser menor que 100%.');
  let priceCents: number;
  if (input.markupBps != null) {
    priceCents = Math.ceil(fixedCostCents * (10000 + input.markupBps) / 10000);
  } else if (input.manualPriceCents === null) {
    priceCents = Math.ceil(fixedCostCents * 10000 / (10000 - input.targetMarginBps));
  } else {
    priceCents = input.manualPriceCents;
  }
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 || priceCents > 2147483647) throw new Error('Preço de venda inválido ou fora do limite.');
  const estimatedMarginBps = Math.floor((priceCents - fixedCostCents) * 10000 / priceCents);
  return { fixedCostCents, priceCents, profitCents: priceCents - fixedCostCents, estimatedMarginBps };
}

export function calculateCostPlusProfit(costs: Pick<WorkflowPricingInput, 'acquisitionCostCents' | 'packagingCostCents' | 'depreciationCostCents'>, desiredProfitCents: number) {
  if (!Number.isSafeInteger(desiredProfitCents) || desiredProfitCents < 0) throw new Error('Informe um lucro desejado válido.');
  const fixedParts = [costs.acquisitionCostCents, costs.packagingCostCents, costs.depreciationCostCents];
  if (fixedParts.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Confira os custos.');
  const fixedCostCents = fixedParts.reduce((sum, value) => sum + value, 0);
  const priceCents = fixedCostCents + desiredProfitCents;
  if (fixedCostCents <= 0 || priceCents > 2147483647) throw new Error('Custo ou preço fora do limite.');
  return { fixedCostCents, priceCents, profitCents: desiredProfitCents, estimatedMarginBps: Math.floor(desiredProfitCents * 10000 / priceCents) };
}

export function calculateCostPlusMarkup(costs: Pick<WorkflowPricingInput, 'acquisitionCostCents' | 'packagingCostCents' | 'depreciationCostCents'>, markupBps: number) {
  if (!Number.isSafeInteger(markupBps) || markupBps < 0 || markupBps > 1000000) throw new Error('Informe um percentual de lucro válido (até 10.000%).');
  const base = calculateCostPlusProfit(costs, 0);
  return calculateCostPlusProfit(costs, Math.round(base.fixedCostCents * markupBps / 10000));
}
