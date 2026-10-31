import assert from 'node:assert/strict';
import test from 'node:test';
import { correctedInitialBalance, monthlyDepreciationCents, packagingModelSummary, packagingUnitCostCents } from '../lib/inventory.ts';

test('custo unitário da embalagem vem do custo total dividido pela quantidade', () => {
  assert.equal(packagingUnitCostCents(3030, 50), 61);
  assert.equal(packagingUnitCostCents(2483, 500), 5);
  assert.throws(() => packagingUnitCostCents(100, 0), /quantidade/i);
});

test('corrigir a quantidade inicial preserva movimentações posteriores', () => {
  assert.equal(correctedInitialBalance(70, 100, 120), 90);
  assert.equal(correctedInitialBalance(70, 100, 80), 50);
  assert.throws(() => correctedInitialBalance(10, 100, 80), /saldo/i);
});

test('modelo soma os custos e calcula quantos conjuntos o estoque permite', () => {
  assert.deepEqual(packagingModelSummary([
    { item_id: 'saco', quantity: 1 }, { item_id: 'flanela', quantity: 2 },
  ], [
    { id: 'saco', unit_cost_cents: 80, quantity_on_hand: 10 },
    { id: 'flanela', unit_cost_cents: 125, quantity_on_hand: 7 },
  ]), { costCents: 330, availableSets: 3 });
});

test('depreciação em 12 meses distribui todos os centavos e termina', () => {
  const months = Array.from({ length: 12 }, (_, index) => monthlyDepreciationCents(1001, '2026-01-15', new Date(Date.UTC(2026, index, 1))));
  assert.equal(months.reduce((sum, value) => sum + value, 0), 1001);
  assert.equal(monthlyDepreciationCents(1001, '2026-01-15', new Date(Date.UTC(2027, 0, 1))), 0);
});
