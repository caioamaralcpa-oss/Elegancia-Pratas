'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { brl } from '@/lib/products';
import { correctedInitialBalance, monthlyDepreciationCents, packagingModelSummary, type ModelComponent } from '@/lib/inventory';
import { useManagement } from '../layout';

type Kind = 'embalagem' | 'insumo';
type StockItem = { id: string; kind: Kind; name: string; unit_cost_cents: number; quantity_on_hand: number; initial_quantity: number; acquired_quantity: number; acquired_on: string | null };
type Movement = { id: string; item_id: string; delta: number; balance_after: number; reason: string; created_at: string };
type PackagingModel = { id: string; name: string; channel: 'local' | 'envio'; packaging_model_components: ModelComponent[] };
type ItemDraft = { kind: Kind; name: string; unitCost: string; initialQuantity: string; acquiredOn: string };
type ModelDraft = { name: string; channel: 'local' | 'envio'; quantities: Record<string, string> };

function parseMoney(value: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Informe um custo unitário válido em reais.');
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents > 2147483647) throw new Error('Custo fora do limite.');
  return cents;
}

export default function StockPage() {
  const { db } = useManagement();
  const [tab, setTab] = useState<Kind | 'modelos'>('embalagem');
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [models, setModels] = useState<PackagingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>({ kind: 'embalagem', name: '', unitCost: '', initialQuantity: '0', acquiredOn: '' });
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [movementDirection, setMovementDirection] = useState<'entrada' | 'saida'>('entrada');
  const [movementQuantity, setMovementQuantity] = useState('1');
  const [movementReason, setMovementReason] = useState('');
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelDraft, setModelDraft] = useState<ModelDraft>({ name: '', channel: 'local', quantities: {} });

  const refresh = useCallback(async () => {
    const [stockResult, movementResult, modelResult] = await Promise.all([
      db.from('stock_items').select('id,kind,name,unit_cost_cents,quantity_on_hand,initial_quantity,acquired_quantity,acquired_on').order('created_at', { ascending: false }),
      db.from('stock_movements').select('id,item_id,delta,balance_after,reason,created_at').order('created_at', { ascending: false }).limit(30),
      db.from('packaging_models').select('id,name,channel,packaging_model_components(item_id,quantity)').order('created_at', { ascending: false }),
    ]);
    if (stockResult.error || movementResult.error || modelResult.error) setMessage('Não foi possível carregar o estoque. Confira sua sessão.');
    else {
      setItems((stockResult.data ?? []) as StockItem[]);
      setMovements((movementResult.data ?? []) as Movement[]);
      setModels((modelResult.data ?? []).map(row => ({ ...row,
        packaging_model_components: Array.isArray(row.packaging_model_components) ? row.packaging_model_components : [],
      })) as PackagingModel[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  function openTab(next: Kind | 'modelos') {
    setTab(next); setMessage(''); setAdjustingId(null); setEditingItemId(null); setEditingModelId(null);
    if (next !== 'modelos') setItemDraft({ kind: next, name: '', unitCost: '', initialQuantity: '0', acquiredOn: '' });
  }

  function editItem(item: StockItem) {
    setEditingItemId(item.id); setAdjustingId(null); setMessage('');
    setItemDraft({ kind: item.kind, name: item.name, unitCost: (item.unit_cost_cents / 100).toFixed(2), initialQuantity: String(item.initial_quantity), acquiredOn: item.acquired_on ?? '' });
    document.getElementById('stock-item-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage('');
    try {
      const quantity = editingItemId && itemDraft.kind === 'insumo' ? 0 : Number(itemDraft.initialQuantity);
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw new Error('Informe uma quantidade entre 0 e 1.000.000.');
      const editingItem = items.find(item => item.id === editingItemId);
      if (editingItem?.kind === 'embalagem') correctedInitialBalance(editingItem.quantity_on_hand, editingItem.initial_quantity, quantity);
      if (itemDraft.kind === 'insumo' && !itemDraft.acquiredOn) throw new Error('Informe a data de aquisição do insumo.');
      const { error } = await db.rpc('save_stock_item', {
        p_id: editingItemId, p_kind: itemDraft.kind, p_name: itemDraft.name.trim(),
        p_unit_cost_cents: parseMoney(itemDraft.unitCost), p_initial_quantity: quantity,
        p_acquired_on: itemDraft.kind === 'insumo' ? itemDraft.acquiredOn : null,
      });
      if (error) throw new Error(error.message.includes('correção da quantidade inicial') ? 'A correção deixaria o saldo fora do limite. Confira a quantidade e as movimentações.' : 'Não foi possível salvar. Confira os dados, a data e sua sessão.');
      setEditingItemId(null);
      setItemDraft({ kind: itemDraft.kind, name: '', unitCost: '', initialQuantity: '0', acquiredOn: '' });
      await refresh(); setMessage('Item salvo no estoque.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }

  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !adjustingId) return;
    setBusy(true); setMessage('');
    try {
      const quantity = Number(movementQuantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) throw new Error('Informe uma quantidade válida.');
      const item = items.find(entry => entry.id === adjustingId);
      if (item?.kind === 'insumo' && movementDirection === 'entrada') throw new Error('Para uma nova compra de insumo, cadastre outro lote.');
      const { error } = await db.rpc('adjust_stock_item', {
        p_id: adjustingId, p_delta: movementDirection === 'entrada' ? quantity : -quantity, p_reason: movementReason.trim(),
      });
      if (error) throw new Error('Não foi possível movimentar o estoque. Confira o saldo e sua sessão.');
      setAdjustingId(null); setMovementQuantity('1'); setMovementReason('');
      await refresh(); setMessage('Movimentação registrada no histórico.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.'); }
    finally { setBusy(false); }
  }

  function editModel(model: PackagingModel) {
    setEditingModelId(model.id); setMessage('');
    setModelDraft({ name: model.name, channel: model.channel,
      quantities: Object.fromEntries(model.packaging_model_components.map(component => [component.item_id, String(component.quantity)])),
    });
    document.getElementById('packaging-model-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const packaging = items.filter(item => item.kind === 'embalagem');
  const selectedComponents = Object.entries(modelDraft.quantities).filter(([, value]) => Number(value) > 0)
    .map(([item_id, value]) => ({ item_id, quantity: Number(value) }));
  let modelPreview: ReturnType<typeof packagingModelSummary> | null = null;
  try { modelPreview = packagingModelSummary(selectedComponents, packaging); } catch { /* campos incompletos */ }

  async function saveModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (!modelDraft.name.trim()) throw new Error('Informe o nome do modelo.');
      if (selectedComponents.length === 0 || selectedComponents.some(component => !Number.isSafeInteger(component.quantity) || component.quantity > 1000)) throw new Error('Selecione ao menos uma embalagem com quantidade válida.');
      const { error } = await db.rpc('save_packaging_model', {
        p_id: editingModelId, p_name: modelDraft.name.trim(), p_channel: modelDraft.channel, p_components: selectedComponents,
      });
      if (error) throw new Error('Não foi possível salvar o modelo. Confira se o nome é único e as embalagens estão cadastradas.');
      setEditingModelId(null); setModelDraft({ name: '', channel: 'local', quantities: {} });
      await refresh(); setMessage('Modelo de embalagem salvo. O custo acompanha os valores atuais dos componentes.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o modelo.'); }
    finally { setBusy(false); }
  }

  const visibleItems = items.filter(item => item.kind === tab);
  const visibleMovements = movements.filter(movement => items.some(item => item.id === movement.item_id && item.kind === tab)).slice(0, 15);
  const adjustedItem = items.find(item => item.id === adjustingId);
  return <main className="management-page stock-page"><p className="eyebrow">ETAPA 02 · CUSTOS E SALDOS</p><h1>Estoque</h1><p className="management-intro">Registre embalagens, equipamentos e os conjuntos usados em vendas locais ou envios. Estes dados só aparecem na gestão.</p>
    <div className="stock-tabs" role="tablist" aria-label="Áreas do estoque"><button type="button" role="tab" aria-selected={tab === 'embalagem'} onClick={() => openTab('embalagem')}>Embalagens</button><button type="button" role="tab" aria-selected={tab === 'insumo'} onClick={() => openTab('insumo')}>Insumos</button><button type="button" role="tab" aria-selected={tab === 'modelos'} onClick={() => openTab('modelos')}>Modelos de embalagem</button></div>
    <p role="status" className="management-status">{message}</p>
    {loading ? <p>Carregando estoque...</p> : tab === 'modelos' ? <div className="stock-layout"><section className="management-card"><h2>Modelos cadastrados</h2>{models.length === 0 ? <p>Nenhum modelo cadastrado.</p> : <div className="stock-records">{models.map(model => {
      let summary: ReturnType<typeof packagingModelSummary> | null = null;
      try { summary = packagingModelSummary(model.packaging_model_components, packaging); } catch { /* item ausente */ }
      return <article key={model.id}><div><strong>{model.name}</strong><small>{model.channel === 'local' ? 'Venda local' : 'Envio'} · {model.packaging_model_components.length} componente(s)</small></div><div><strong>{summary ? brl(summary.costCents) : '—'}</strong><small>{summary?.availableSets ?? 0} conjunto(s) possíveis com o saldo atual</small></div><button type="button" onClick={() => editModel(model)}>Editar</button></article>;
    })}</div>}</section><section id="packaging-model-form" className="management-card stock-form-card"><p className="eyebrow">COMPOSIÇÃO</p><h2>{editingModelId ? 'Editar modelo' : 'Novo modelo'}</h2><p>Escolha as embalagens e a quantidade usada em uma venda. Insumos duráveis não entram neste modelo.</p><form onSubmit={saveModel}><label>Nome do modelo<input required maxLength={120} value={modelDraft.name} onChange={event => setModelDraft({ ...modelDraft, name: event.target.value })} placeholder="Ex.: Envio padrão"/></label><label>Tipo de venda<select value={modelDraft.channel} onChange={event => setModelDraft({ ...modelDraft, channel: event.target.value as ModelDraft['channel'] })}><option value="local">Venda local</option><option value="envio">Envio</option></select></label><fieldset className="stock-components"><legend>Embalagens utilizadas</legend>{packaging.length === 0 ? <p>Cadastre embalagens antes de montar um modelo.</p> : packaging.map(item => <label key={item.id}><span>{item.name}<small>{brl(item.unit_cost_cents)} cada · saldo {item.quantity_on_hand}</small></span><input type="number" min="0" max="1000" step="1" aria-label={`Quantidade de ${item.name}`} value={modelDraft.quantities[item.id] ?? '0'} onChange={event => setModelDraft(current => ({ ...current, quantities: { ...current.quantities, [item.id]: event.target.value } }))}/></label>)}</fieldset><div className="stock-summary"><span>Custo por modelo <strong>{modelPreview ? brl(modelPreview.costCents) : '—'}</strong></span><span>Conjuntos possíveis <strong>{modelPreview?.availableSets ?? 0}</strong></span></div><button className="botao" type="submit" disabled={busy || packaging.length === 0}>{busy ? 'Salvando...' : 'Salvar modelo'}</button>{editingModelId && <button className="management-outline" type="button" onClick={() => { setEditingModelId(null); setModelDraft({ name: '', channel: 'local', quantities: {} }); }}>Cancelar edição</button>}</form></section></div> : <><div className="stock-layout"><section className="management-card"><h2>{tab === 'embalagem' ? 'Embalagens cadastradas' : 'Insumos e equipamentos'}</h2>{visibleItems.length === 0 ? <p>Nenhum item cadastrado nesta seção.</p> : <div className="stock-records">{visibleItems.map(item => {
      const monthly = item.kind === 'insumo' && item.acquired_on ? monthlyDepreciationCents(item.unit_cost_cents * item.acquired_quantity, item.acquired_on) : 0;
      return <article key={item.id}><div><strong>{item.name}</strong><small>Custo unitário {brl(item.unit_cost_cents)} · saldo {item.quantity_on_hand}</small>{item.kind === 'embalagem' && <small>Quantidade inicial: {item.initial_quantity}</small>}{item.kind === 'insumo' && <small>Compra: {item.acquired_on} · depreciação deste mês: {brl(monthly)}</small>}</div><div className="stock-record-actions"><button type="button" onClick={() => editItem(item)}>Editar</button><button type="button" onClick={() => { setAdjustingId(item.id); setMovementDirection(item.kind === 'insumo' ? 'saida' : 'entrada'); setMovementQuantity('1'); setMovementReason(''); }}>Movimentar</button></div></article>;
    })}</div>}</section><section id="stock-item-form" className="management-card stock-form-card"><p className="eyebrow">{tab === 'embalagem' ? 'ITEM CONSUMÍVEL' : 'LOTE DE AQUISIÇÃO'}</p><h2>{editingItemId ? 'Editar item' : tab === 'embalagem' ? 'Nova embalagem' : 'Novo insumo'}</h2>{tab === 'insumo' && <p>Cadastre equipamentos comprados no mesmo lote. O custo de aquisição será distribuído em 12 meses; novas compras devem ser novos lotes.</p>}<form onSubmit={saveItem}><label>Nome<input required maxLength={120} value={itemDraft.name} onChange={event => setItemDraft({ ...itemDraft, name: event.target.value })} placeholder={tab === 'embalagem' ? 'Ex.: Flanela' : 'Ex.: Câmera para conteúdo'}/></label><label>Custo unitário de aquisição (R$)<input required inputMode="decimal" value={itemDraft.unitCost} onChange={event => setItemDraft({ ...itemDraft, unitCost: event.target.value })} placeholder="0,00"/></label>{(!editingItemId || tab === 'embalagem') && <label>{editingItemId ? 'Quantidade inicial cadastrada' : 'Quantidade inicial'}<input required type="number" min="0" max="1000000" step="1" value={itemDraft.initialQuantity} onChange={event => setItemDraft({ ...itemDraft, initialQuantity: event.target.value })}/>{editingItemId && <small>Ao corrigir, o saldo atual muda pela diferença. As movimentações anteriores permanecem no histórico.</small>}</label>}{tab === 'insumo' && <label>Data de aquisição<input required type="date" max={new Date().toISOString().slice(0, 10)} value={itemDraft.acquiredOn} onChange={event => setItemDraft({ ...itemDraft, acquiredOn: event.target.value })}/></label>}<button className="botao" type="submit" disabled={busy}>{busy ? 'Salvando...' : editingItemId ? 'Salvar alterações' : 'Cadastrar item'}</button>{editingItemId && <button className="management-outline" type="button" onClick={() => { setEditingItemId(null); setItemDraft({ kind: tab as Kind, name: '', unitCost: '', initialQuantity: '0', acquiredOn: '' }); }}>Cancelar edição</button>}</form></section></div>{adjustedItem && <section className="management-card stock-adjust"><h2>Movimentar: {adjustedItem.name}</h2><p>Saldo atual: <strong>{adjustedItem.quantity_on_hand}</strong>. Cada alteração fica registrada no histórico.</p><form onSubmit={adjust}><label>Operação<select value={movementDirection} onChange={event => setMovementDirection(event.target.value as 'entrada' | 'saida')}><option value="saida">Saída / perda</option>{adjustedItem.kind === 'embalagem' && <option value="entrada">Entrada / correção</option>}</select></label><label>Quantidade<input required type="number" min="1" max="1000000" step="1" value={movementQuantity} onChange={event => setMovementQuantity(event.target.value)}/></label><label>Motivo<input required maxLength={200} value={movementReason} onChange={event => setMovementReason(event.target.value)} placeholder="Ex.: compra, uso ou perda"/></label><button className="botao" type="submit" disabled={busy}>Registrar movimentação</button><button className="management-outline" type="button" onClick={() => setAdjustingId(null)}>Cancelar</button></form></section>}<section className="management-card stock-history"><h2>Últimas movimentações</h2>{visibleMovements.length === 0 ? <p>Sem movimentações registradas nesta seção.</p> : <div className="stock-records">{visibleMovements.map(movement => <article key={movement.id}><div><strong>{items.find(item => item.id === movement.item_id)?.name ?? 'Item'}</strong><small>{movement.reason} · {new Date(movement.created_at).toLocaleDateString('pt-BR')}</small></div><div><strong>{movement.delta > 0 ? '+' : ''}{movement.delta}</strong><small>Saldo após: {movement.balance_after}</small></div></article>)}</div>}</section></>}
    <p className="stock-footnote">O custo dos modelos usa os preços atuais das embalagens. Na futura precificação, o custo aprovado será registrado na ficha da joia. Depreciação é uma referência gerencial; valide critérios fiscais e contábeis com seu contador.</p>
  </main>;
}
