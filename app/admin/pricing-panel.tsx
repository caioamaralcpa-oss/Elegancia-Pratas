'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/products';
import { brl } from '@/lib/products';
import { calculateSuggestedPrice, emptyPricing, type PricingInput } from '@/lib/pricing';

type Field = { key: keyof PricingInput; label: string; unit: 'money' | 'percent'; help?: string };
const fields: Field[] = [
  { key: 'acquisition_cost_cents', label: 'Custo da joia ou materiais', unit: 'money' },
  { key: 'packaging_cost_cents', label: 'Embalagem', unit: 'money' },
  { key: 'labor_cost_cents', label: 'Mão de obra', unit: 'money' },
  { key: 'shipping_subsidy_cents', label: 'Frete pago pela loja', unit: 'money', help: 'Use zero se todo o frete for cobrado do cliente.' },
  { key: 'other_cost_cents', label: 'Outros custos fixos por peça', unit: 'money' },
  { key: 'payment_fee_bps', label: 'Taxa de pagamento', unit: 'percent', help: 'Considere a maior taxa aplicável, como a do cartão parcelado.' },
  { key: 'tax_bps', label: 'Tributos estimados', unit: 'percent', help: 'Defina esta taxa com seu contador.' },
  { key: 'overhead_bps', label: 'Despesas gerais', unit: 'percent', help: 'Parcela estimada de custos da operação sobre cada venda.' },
  { key: 'target_margin_bps', label: 'Margem desejada', unit: 'percent', help: 'Percentual do preço de venda que deve restar após os custos acima.' },
];
const blankForm = Object.fromEntries(fields.map(field => [field.key, ''])) as Record<keyof PricingInput, string>;

function parseForm(form: Record<keyof PricingInput, string>): PricingInput {
  const result = { ...emptyPricing };
  for (const field of fields) {
    const raw = form[field.key].trim();
    const amount = raw === '' ? 0 : Number(raw.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0 || !/^\d*(?:[.,]\d{0,2})?$/.test(raw)) throw new Error(`Confira o campo: ${field.label}.`);
    result[field.key] = Math.round(amount * 100);
  }
  return result;
}

export default function PricingPanel({ db, products, onPriceApplied }: { db: SupabaseClient; products: Product[]; onPriceApplied: () => Promise<void> }) {
  const [productId, setProductId] = useState('');
  const [form, setForm] = useState<Record<keyof PricingInput, string>>({ ...blankForm });
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState('Selecione uma joia para começar.');
  const product = products.find(item => item.id === productId);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    db.from('product_pricing').select('*').eq('product_id', productId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setStatus('Não foi possível carregar a ficha de custos.'); return; }
      const values = Object.fromEntries(fields.map(field => [field.key, data ? (Number(data[field.key]) / 100).toFixed(2) : ''])) as Record<keyof PricingInput, string>;
      setForm(values); setSaved(Boolean(data)); setStatus(data ? 'Ficha carregada. Revise os valores antes de aplicar o preço.' : 'Ficha nova. Preencha os custos para receber uma sugestão.');
    });
    return () => { active = false; };
  }, [db, productId]);

  let preview: ReturnType<typeof calculateSuggestedPrice> | null = null;
  let previewError = '';
  if (productId) {
    try { preview = calculateSuggestedPrice(parseForm(form)); }
    catch (error) { previewError = error instanceof Error ? error.message : 'Confira os valores informados.'; }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId) return;
    try {
      const input = parseForm(form);
      calculateSuggestedPrice(input);
      const { error } = await db.from('product_pricing').upsert({ product_id: productId, ...input }, { onConflict: 'product_id' });
      if (error) throw new Error('Não foi possível salvar a ficha. Verifique sua sessão administrativa.');
      setSaved(true); setStatus('Ficha de custos salva. O preço publicado ainda não mudou.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
  }

  async function applyPrice() {
    if (!productId || !saved) return;
    const { data, error } = await db.rpc('apply_suggested_price', { p_product_id: productId });
    if (error || typeof data !== 'number') { setStatus('Não foi possível aplicar o preço. Confira sua sessão e a ficha salva.'); return; }
    setStatus(`Preço de ${brl(data)} aplicado ao produto. A publicação da joia continua sob seu controle.`);
    await onPriceApplied();
  }

  return <section id="precificacao" className="pricing-panel" aria-labelledby="pricing-title"><p className="eyebrow">GESTÃO DA LOJA</p><h2 id="pricing-title">Precificação</h2><p>Monte a ficha de custos, veja a sugestão e aplique o preço somente após conferir os dados. Custos e margens não aparecem na loja.</p><label className="pricing-product-select">Joia<select value={productId} onChange={event => { setProductId(event.target.value); setSaved(false); setForm({ ...blankForm }); setStatus('Carregando ficha...'); }}><option value="">Selecione um produto cadastrado</option>{products.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>{product && <><p>Preço atual no catálogo: <strong>{brl(product.price_cents)}</strong></p><form onSubmit={save}><div className="pricing-fields">{fields.map(field => <label key={field.key}>{field.label}<span className="pricing-input"><span>{field.unit === 'money' ? 'R$' : '%'}</span><input type="text" inputMode="decimal" value={form[field.key]} onChange={event => { setForm(current => ({ ...current, [field.key]: event.target.value })); setSaved(false); }} placeholder="0,00" aria-describedby={field.help ? `help-${field.key}` : undefined}/></span>{field.help && <small id={`help-${field.key}`}>{field.help}</small>}</label>)}</div><button className="botao" type="submit" disabled={!preview}>Salvar ficha de custos</button></form>{preview ? <div className="pricing-result"><p>Custo fixo por peça <strong>{brl(preview.fixedCostCents)}</strong></p><p>Preço sugerido <strong>{brl(preview.suggestedPriceCents)}</strong></p><p>Margem estimada <strong>{(preview.estimatedMarginBps / 100).toFixed(2).replace('.', ',')}%</strong></p><small>A margem é calculada sobre o preço de venda. Taxas reais, impostos e promoções podem alterar o resultado; valide tributos com seu contador.</small><button className="botao" type="button" disabled={!saved} onClick={applyPrice}>Aplicar preço sugerido</button></div> : <p className="aviso">{previewError}</p>}<p role="status">{status}</p></>}</section>;
}
