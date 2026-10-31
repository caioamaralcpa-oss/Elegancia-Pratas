export type StockCost = { id: string; unit_cost_cents: number; quantity_on_hand: number };
export type ModelComponent = { item_id: string; quantity: number };

export function correctedInitialBalance(currentBalance: number, previousInitial: number, newInitial: number) {
  if ([currentBalance, previousInitial, newInitial].some(value => !Number.isSafeInteger(value) || value < 0 || value > 1000000))
    throw new Error('Quantidade fora do limite.');
  const nextBalance = currentBalance + newInitial - previousInitial;
  if (nextBalance < 0 || nextBalance > 1000000) throw new Error('A correção deixaria o saldo fora do limite.');
  return nextBalance;
}

export function packagingModelSummary(components: ModelComponent[], items: StockCost[]) {
  if (components.length === 0) return { costCents: 0, availableSets: 0 };
  const byId = new Map(items.map(item => [item.id, item]));
  let costCents = 0;
  let availableSets = Number.MAX_SAFE_INTEGER;
  for (const component of components) {
    const item = byId.get(component.item_id);
    if (!item || !Number.isSafeInteger(component.quantity) || component.quantity <= 0) throw new Error('Componente de embalagem inválido.');
    costCents += item.unit_cost_cents * component.quantity;
    availableSets = Math.min(availableSets, Math.floor(item.quantity_on_hand / component.quantity));
  }
  if (!Number.isSafeInteger(costCents)) throw new Error('Custo do modelo fora do limite.');
  return { costCents, availableSets };
}

// Divide o custo integral entre 12 meses sem perder centavos por arredondamento.
export function monthlyDepreciationCents(totalCostCents: number, acquiredOn: string, now = new Date()) {
  if (!Number.isSafeInteger(totalCostCents) || totalCostCents < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(acquiredOn)) throw new Error('Dados de depreciação inválidos.');
  const [year, month] = acquiredOn.split('-').map(Number);
  if (month < 1 || month > 12) throw new Error('Data de aquisição inválida.');
  const elapsed = (now.getUTCFullYear() - year) * 12 + now.getUTCMonth() - (month - 1);
  if (elapsed < 0 || elapsed >= 12) return 0;
  return Math.floor(totalCostCents / 12) + (elapsed < totalCostCents % 12 ? 1 : 0);
}
