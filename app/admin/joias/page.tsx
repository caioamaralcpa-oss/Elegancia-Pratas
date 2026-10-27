'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { brl } from '@/lib/products';
import { useManagement } from '../layout';

type Jewelry = {
  id: string; registration_code: string; name: string; description: string | null;
  model: string | null; category: string; measurements: string | null; stock: number; price_cents: number;
  workflow_stage: string; active: boolean;
  jewelry_intake: { acquisition_cost_cents: number; identification_image_path: string | null } | null;
};

type Draft = { name: string; description: string; model: string; measurements: string; quantity: string; unitCost: string };
const emptyDraft: Draft = { name: '', description: '', model: '', measurements: '', quantity: '1', unitCost: '' };
const stages: Record<string, string> = { aguardando_precificacao: 'Aguardando precificação', aguardando_catalogo: 'Aguardando catálogo', pronto: 'Pronta para publicação' };

function costInCents(value: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Informe um custo unitário válido em reais.');
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents > 2147483647) throw new Error('Custo unitário fora do limite.');
  return cents;
}

export default function JewelryPage() {
  const { db } = useManagement();
  const [items, setItems] = useState<Jewelry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data, error } = await db.from('products')
      .select('id,registration_code,name,description,model,category,measurements,stock,price_cents,workflow_stage,active,jewelry_intake(acquisition_cost_cents,identification_image_path)')
      .order('created_at', { ascending: false });
    if (error) setMessage('Não foi possível carregar as joias. Confira sua sessão.');
    else setItems((data ?? []).map(row => ({ ...row,
      jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
    })) as Jewelry[]);
    setLoading(false);
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function select(item: Jewelry | null) {
    setEditingId(item?.id ?? null);
    setDraft(item ? {
      name: item.name, description: item.description ?? '', model: item.model ?? '',
      measurements: item.measurements ?? '', quantity: String(item.stock),
      unitCost: item.jewelry_intake ? (item.jewelry_intake.acquisition_cost_cents / 100).toFixed(2) : '',
    } : { ...emptyDraft });
    setImage(null); setImageUrl(null); setMessage('');
    const path = item?.jewelry_intake?.identification_image_path;
    if (path) {
      const { data } = await db.storage.from('jewelry-identification').createSignedUrl(path, 300);
      setImageUrl(data?.signedUrl ?? null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setMessage('');
    try {
      const quantity = Number(draft.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw new Error('Informe uma quantidade entre 0 e 1.000.000.');
      if (!draft.name.trim() || !draft.model.trim()) throw new Error('Nome e modelo são obrigatórios.');
      const input = {
        p_name: draft.name.trim(), p_description: draft.description.trim(), p_model: draft.model.trim(),
        p_measurements: draft.measurements.trim(), p_quantity: quantity,
        p_unit_cost_cents: costInCents(draft.unitCost), p_identification_image_path: null as string | null,
      };
      const { data, error } = await db.rpc('save_jewelry_intake', { ...input, p_id: editingId });
      if (error || !Array.isArray(data) || !data[0]?.id) throw new Error('Não foi possível salvar a joia. Confira os dados e sua sessão.');
      const id = data[0].id as string;
      setEditingId(id);
      if (image) {
        const { data: { session } } = await db.auth.getSession();
        if (!session) throw new Error('Joia salva, mas a sessão expirou antes do envio da foto.');
        const upload = new FormData(); upload.set('imagem', image);
        const response = await fetch('/api/admin/images?kind=identification', {
          method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: upload,
        });
        if (!response.ok) throw new Error('Joia salva, mas não foi possível enviar a foto. Tente novamente.');
        const result = await response.json();
        const { error: photoError } = await db.rpc('save_jewelry_intake', {
          ...input, p_id: id, p_identification_image_path: result.imagePath,
        });
        if (photoError) throw new Error('Joia salva, mas a foto não foi vinculada. Tente novamente.');
        const { data: signed } = await db.storage.from('jewelry-identification').createSignedUrl(result.imagePath, 300);
        setImageUrl(signed?.signedUrl ?? null);
        setImage(null);
      }
      await refresh();
      setMessage(`Joia ${data[0].registration_code} salva. A precificação será a próxima etapa; ela ainda não aparece na loja.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a joia.');
      await refresh();
    } finally { setSaving(false); }
  }

  const current = items.find(item => item.id === editingId);
  let totalCost: number | null = null;
  try { const quantity = Number(draft.quantity); if (Number.isSafeInteger(quantity) && quantity >= 0 && draft.unitCost) totalCost = costInCents(draft.unitCost) * quantity; } catch { /* incomplete form */ }

  return <main className="management-page"><p className="eyebrow">ETAPA 01 · REGISTRO</p><div className="management-title-row"><div><h1>Joias</h1><p className="management-intro">Cadastre cada modelo uma vez. O preço será definido na etapa de precificação.</p></div><button className="management-outline" type="button" onClick={() => void select(null)}>+ Nova joia</button></div><div className="jewelry-layout"><section className="management-card jewelry-list"><h2>Peças cadastradas <small>{items.length}</small></h2>{loading ? <p>Carregando...</p> : items.length === 0 ? <p>Nenhuma joia cadastrada ainda.</p> : <div>{items.map(item => <button className={editingId === item.id ? 'jewelry-item selected' : 'jewelry-item'} type="button" onClick={() => void select(item)} key={item.id}><span><strong>{item.name}</strong><small>{item.registration_code} · {item.model ?? item.category}</small><small>{item.active ? 'Publicada' : stages[item.workflow_stage] ?? 'Em cadastro'}</small></span><span>↗</span></button>)}</div>}</section><section className="management-card jewelry-form"><div className="jewelry-form-head"><div><p className="eyebrow">{current ? current.registration_code : 'NOVO REGISTRO'}</p><h2>{current ? 'Editar joia' : 'Cadastrar joia'}</h2></div><span className="management-badge">{current?.active ? 'Publicada' : current ? stages[current.workflow_stage] ?? 'Em cadastro' : 'Não publicada'}</span></div>{current?.active ? <p>Esta joia já foi publicada. A edição do catálogo será disponibilizada na etapa correspondente.</p> : <form onSubmit={save}><div className="management-fields"><label>Nome comercial<input required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Colar Aurora"/></label><label>Modelo<input required maxLength={80} list="jewelry-models" value={draft.model} onChange={event => setDraft({ ...draft, model: event.target.value })} placeholder="Ex.: Cordão"/><datalist id="jewelry-models">{['Cordão', 'Brinco', 'Pulseira', 'Choker', 'Bracelete', 'Anel', 'Pingente'].map(value => <option value={value} key={value}/>)}</datalist></label><label className="management-wide">Descrição<textarea rows={4} maxLength={2000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Resumo, detalhes e características da peça"/></label><label className="management-wide">Medidas<input maxLength={240} value={draft.measurements} onChange={event => setDraft({ ...draft, measurements: event.target.value })} placeholder="Ex.: 45 cm de comprimento"/></label><label>Custo unitário (R$)<input required inputMode="decimal" value={draft.unitCost} onChange={event => setDraft({ ...draft, unitCost: event.target.value })} placeholder="0,00"/></label><label>Quantidade disponível<input required type="number" min="0" step="1" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })}/></label><label className="management-wide">Foto de identificação, privada<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setImage(event.target.files?.[0] ?? null)}/><small>Esta foto não aparece na loja. JPG, PNG ou WebP, até 5 MB.</small></label></div>{imageUrl && <img className="jewelry-private-photo" src={imageUrl} alt={`Foto de identificação de ${current?.name ?? 'joia'}`}/>}<div className="jewelry-cost-summary"><span>Custo por unidade <strong>{draft.unitCost ? (() => { try { return brl(costInCents(draft.unitCost)); } catch { return '—'; } })() : '—'}</strong></span><span>Custo total do lote <strong>{totalCost === null ? '—' : brl(totalCost)}</strong></span></div><p className="jewelry-next-step">Preço de venda: pendente. Após salvar, esta joia ficará aguardando a etapa de precificação.</p><button className="botao" type="submit" disabled={saving}>{saving ? 'Salvando...' : current ? 'Salvar alterações' : 'Cadastrar joia'}</button></form>}<p role="status" className="management-status">{message}</p></section></div></main>;
}
