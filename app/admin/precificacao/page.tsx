'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { brl } from '@/lib/products';
import { monthlyDepreciationCents, packagingModelSummary, type ModelComponent } from '@/lib/inventory';
import { calculateCostPlusMarkup, calculateCostPlusProfit } from '@/lib/pricing-workflow';
import { useManagement } from '../layout';

type Jewelry = { id: string; registration_code: string; name: string; model: string | null; stock: number; price_cents: number; workflow_stage: string; active: boolean; jewelry_intake: { acquisition_cost_cents: number } | null };
type StockItem = { id: string; kind: 'embalagem' | 'insumo'; unit_cost_cents: number; quantity_on_hand: number; acquired_quantity: number; acquired_on: string | null };
type PackagingModel = { id: string; name: string; channel: 'local' | 'envio'; packaging_model_components: ModelComponent[] };
type SavedPricing = { product_id: string; packaging_model_id: string | null; monthly_sales_estimate: number; approved_price_cents: number; acquisition_cost_cents: number; packaging_cost_cents: number; depreciation_cost_cents: number };
type Draft = { modelId: string; monthlySales: string; profitPercent: string; desiredProfit: string; sellingPrice: string; pricingBasis: 'percent' | 'profit' | 'price' };

const emptyDraft: Draft = { modelId: '', monthlySales: '', profitPercent: '50,00', desiredProfit: '', sellingPrice: '', pricingBasis: 'percent' };
const displayMoney = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const displayPercent = (bps: number) => (bps / 100).toFixed(2).replace('.', ',');

function parseDecimal(value: string, label: string, optional = false) {
  const raw = value.trim();
  if (optional && !raw) return 0;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) throw new Error(`Confira o campo ${label}.`);
  const result = Math.round(Number(raw.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(result) || result > 2147483647) throw new Error(`${label} fora do limite.`);
  return result;
}

export default function PricingPage() {
  const { db } = useManagement();
  const [jewelry, setJewelry] = useState<Jewelry[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [models, setModels] = useState<PackagingModel[]>([]);
  const [saved, setSaved] = useState<SavedPricing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [jewelryResult, stockResult, modelResult, pricingResult] = await Promise.all([
      db.from('products').select('id,registration_code,name,model,stock,price_cents,workflow_stage,active,jewelry_intake(acquisition_cost_cents)').order('created_at', { ascending: false }),
      db.from('stock_items').select('id,kind,unit_cost_cents,quantity_on_hand,acquired_quantity,acquired_on'),
      db.from('packaging_models').select('id,name,channel,packaging_model_components(item_id,quantity)').order('name'),
      db.from('product_pricing').select('product_id,packaging_model_id,monthly_sales_estimate,approved_price_cents,acquisition_cost_cents,packaging_cost_cents,depreciation_cost_cents'),
    ]);
    if (jewelryResult.error || stockResult.error || modelResult.error || pricingResult.error) {
      setMessage('Não foi possível carregar os dados de precificação. Confira sua sessão.');
    } else {
      setJewelry((jewelryResult.data ?? []).map(row => ({ ...row,
        jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
      })).filter(row => row.jewelry_intake) as Jewelry[]);
      setItems((stockResult.data ?? []) as StockItem[]);
      setModels((modelResult.data ?? []).map(row => ({ ...row,
        packaging_model_components: Array.isArray(row.packaging_model_components) ? row.packaging_model_components : [],
      })) as PackagingModel[]);
      setSaved((pricingResult.data ?? []) as SavedPricing[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  function select(item: Jewelry) {
    setSelectedId(item.id); setMessage('');
    const previous = saved.find(record => record.product_id === item.id);
    setDraft(previous ? {
      modelId: previous.packaging_model_id ?? '', monthlySales: String(previous.monthly_sales_estimate),
      profitPercent: '', desiredProfit: '', sellingPrice: displayMoney(previous.approved_price_cents), pricingBasis: 'price',
    } : { ...emptyDraft });
    document.getElementById('pricing-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const selected = jewelry.find(item => item.id === selectedId);
  const selectedModel = models.find(model => model.id === draft.modelId);
  const packaging = items.filter(item => item.kind === 'embalagem');
  const assets = items.filter(item => item.kind === 'insumo');
  const monthlyDepreciation = assets.reduce((sum, item) => sum + (item.acquired_on ? monthlyDepreciationCents(item.unit_cost_cents * item.acquired_quantity, item.acquired_on) : 0), 0);
  const previewSales = Number(draft.monthlySales);
  const depreciationPerPiece = Number.isSafeInteger(previewSales) && previewSales > 0 ? Math.ceil(monthlyDepreciation / previewSales) : null;
  const packagingSummary = selectedModel ? packagingModelSummary(selectedModel.packaging_model_components, packaging) : null;

  let quote: ReturnType<typeof calculateCostPlusProfit> | null = null;
  let previewError = '';
  if (selected) {
    try {
      if (!packagingSummary || !selectedModel) throw new Error('Selecione um modelo de embalagem cadastrado.');
      const monthlySales = Number(draft.monthlySales);
      if (!Number.isSafeInteger(monthlySales) || monthlySales < 1 || monthlySales > 1000000) throw new Error('Informe a estimativa de joias vendidas por mês.');
      const costs = {
        acquisitionCostCents: selected.jewelry_intake?.acquisition_cost_cents ?? 0,
        packagingCostCents: packagingSummary.costCents,
        depreciationCostCents: Math.ceil(monthlyDepreciation / monthlySales),
      };
      if (draft.pricingBasis === 'percent') quote = calculateCostPlusMarkup(costs, parseDecimal(draft.profitPercent, 'lucro sobre o custo'));
      else if (draft.pricingBasis === 'profit') quote = calculateCostPlusProfit(costs, parseDecimal(draft.desiredProfit, 'lucro desejado'));
      else {
        const priceCents = parseDecimal(draft.sellingPrice, 'preço de venda');
        const fixedCostCents = costs.acquisitionCostCents + costs.packagingCostCents + costs.depreciationCostCents;
        if (priceCents < fixedCostCents) throw new Error('O preço de venda não pode ser menor que o custo total.');
        quote = calculateCostPlusProfit(costs, priceCents - fixedCostCents);
      }
    } catch (error) { previewError = error instanceof Error ? error.message : 'Confira os dados.'; }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !selectedModel || !quote || busy) return;
    setBusy(true); setMessage('');
    try {
      const monthlySales = Number(draft.monthlySales);
      const { data, error } = await db.rpc('save_jewelry_pricing_simple', {
        p_product_id: selected.id, p_packaging_model_id: selectedModel.id,
        p_monthly_sales_estimate: monthlySales,
        p_target_margin_bps: 0, p_manual_price_cents: quote.priceCents,
      });
      if (error || !Array.isArray(data) || !data[0]?.price_cents) throw new Error('Não foi possível salvar o preço. Confira os valores e sua sessão.');
      await refresh();
      setMessage(`${selected.name}: preço de ${brl(data[0].price_cents)} salvo; lucro calculado de ${brl(data[0].price_cents - data[0].fixed_cost_cents)} por venda. A joia avançou para a revisão do Catálogo, mas ainda não foi publicada na loja.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o preço.'); }
    finally { setBusy(false); }
  }

  const pending = jewelry.filter(item => item.workflow_stage === 'aguardando_precificacao');
  const priced = jewelry.filter(item => item.workflow_stage !== 'aguardando_precificacao');
  return <main className="management-page"><p className="eyebrow">ETAPA 03 · CUSTO E LUCRO</p><h1>Precificação</h1><p className="management-intro">Selecione uma joia, escolha a embalagem e confira a composição do preço. Salvar não publica a peça na loja.</p>
    <div className="pricing-queue-summary"><div><strong>{pending.length}</strong><span>Aguardando preço</span></div><div><strong>{priced.length}</strong><span>Com preço definido</span></div></div>
    {loading ? <p>Carregando joias e custos...</p> : <div className="workflow-pricing-layout"><section className="management-card workflow-pricing-list"><h2>Joias</h2>{jewelry.length === 0 ? <><p>Nenhuma joia cadastrada.</p><Link className="management-outline" href="/admin/joias">Cadastrar joia →</Link></> : <div>{jewelry.map(item => <button type="button" className={selectedId === item.id ? 'workflow-jewelry selected' : 'workflow-jewelry'} key={item.id} onClick={() => select(item)}><span><strong>{item.name}</strong><small>{item.registration_code} · {item.model ?? 'Modelo não informado'}</small><small>{item.workflow_stage === 'aguardando_precificacao' ? 'Preço pendente' : `Preço: ${brl(item.price_cents)}`}</small></span><span>↗</span></button>)}</div>}</section>
      <section id="pricing-editor" className="management-card workflow-pricing-editor">{!selected ? <><h2>Escolha uma joia</h2><p>Os custos do cadastro serão trazidos automaticamente para a ficha.</p></> : <><div className="jewelry-form-head"><div><p className="eyebrow">{selected.registration_code}</p><h2>{selected.name}</h2></div><span className="management-badge">{selected.workflow_stage === 'aguardando_precificacao' ? 'Preço pendente' : 'Revisar preço'}</span></div><form onSubmit={save}>
        <div className="workflow-cost-grid"><div><span>Joia · custo unitário</span><strong>{brl(selected.jewelry_intake?.acquisition_cost_cents ?? 0)}</strong></div><div><span>Insumos · depreciação mensal</span><strong>{brl(monthlyDepreciation)}</strong></div><div><span>Insumos · rateio por joia</span><strong>{depreciationPerPiece === null ? '—' : brl(depreciationPerPiece)}</strong></div></div>
        <div className="management-fields"><label className="management-wide">Modelo de embalagem<select required value={draft.modelId} onChange={event => setDraft({ ...draft, modelId: event.target.value })}><option value="">Selecione um modelo</option>{models.map(model => <option value={model.id} key={model.id}>{model.name} · {model.channel === 'local' ? 'Venda local' : 'Envio'}</option>)}</select></label>{models.length === 0 && <p className="management-wide">Cadastre primeiro um <Link href="/admin/estoque">modelo de embalagem no Estoque</Link>.</p>}<label>Estimativa de joias vendidas pela loja por mês<input required type="number" min="1" max="1000000" step="1" value={draft.monthlySales} onChange={event => setDraft({ ...draft, monthlySales: event.target.value })}/><small>Use a estimativa total da loja; o sistema divide a depreciação mensal por essa quantidade.</small></label><div className="workflow-inline-cost"><span>Embalagem por venda</span><strong>{packagingSummary ? brl(packagingSummary.costCents) : '—'}</strong><small>{packagingSummary ? `${packagingSummary.availableSets} conjunto(s) possíveis no estoque atual` : ''}</small></div></div>
        <div className="workflow-profit-inputs"><label>Lucro sobre o custo (%)<input inputMode="decimal" value={draft.pricingBasis === 'percent' ? draft.profitPercent : quote ? displayPercent(Math.round(quote.profitCents * 10000 / quote.fixedCostCents)) : ''} onChange={event => setDraft({ ...draft, profitPercent: event.target.value, pricingBasis: 'percent' })} placeholder="50,00"/><small>Padrão de 50% sobre o custo total.</small></label><label>Lucro desejado por joia (R$)<input inputMode="decimal" value={draft.pricingBasis === 'profit' ? draft.desiredProfit : quote ? displayMoney(quote.profitCents) : ''} onChange={event => setDraft({ ...draft, desiredProfit: event.target.value, pricingBasis: 'profit' })} placeholder="Ex.: 50,00"/><small>Altere para definir o ganho em reais.</small></label><label>Preço de venda (R$)<input inputMode="decimal" value={draft.pricingBasis === 'price' ? draft.sellingPrice : quote ? displayMoney(quote.priceCents) : ''} onChange={event => setDraft({ ...draft, sellingPrice: event.target.value, pricingBasis: 'price' })} placeholder="Ex.: 150,00"/><small>Altere para definir o preço final.</small></label></div>
        {quote ? <div className="workflow-result" aria-live="polite"><div><span>Custo-base por joia</span><strong>{brl(quote.fixedCostCents)}</strong></div><div><span>Lucro desejado por venda</span><strong>{brl(quote.profitCents)}</strong></div><div><span>Preço de venda</span><strong>{brl(quote.priceCents)}</strong></div><div><span>Lucro sobre cada venda (%)</span><strong>{displayPercent(quote.estimatedMarginBps)}%</strong></div></div> : <p className="management-status" role="status">{previewError}</p>}
        <p className="workflow-disclaimer">Preço de venda = custo-base + lucro. O padrão de 50% significa R$ 50 de lucro para cada R$ 100 de custo, resultando em R$ 150 de venda; não é 50% sobre o preço de venda. O custo-base inclui apenas joia, embalagem e rateio dos insumos. Ao salvar, o banco recalcula os custos; se algum custo mudou, confira o lucro efetivo na confirmação. Preços anteriores só mudam quando você salvar uma nova precificação.</p><button className="botao" type="submit" disabled={!quote || busy}>{busy ? 'Salvando...' : 'Salvar preço e enviar ao Catálogo'}</button>
      </form></>}</section></div>}
    <p role="status" className="management-status">{message}</p>{selected && selected.workflow_stage !== 'aguardando_precificacao' && <Link className="management-outline" href="/admin/catalogo">Ver joia no Catálogo de gestão →</Link>}
  </main>;
}
