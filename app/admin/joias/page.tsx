'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { brl } from '@/lib/products';
import { useManagement } from '../layout';

type Gender = 'masculina' | 'feminina' | 'unissex';
type Jewelry = {
  id: string; registration_code: string; name: string; description: string | null;
  model: string | null; category: string; gender: Gender; measurements: string | null;
  stock: number; price_cents: number; workflow_stage: string; active: boolean; collection_id: string | null;
  jewelry_intake: { acquisition_cost_cents: number; identification_image_path: string | null } | null;
};
type Collection = { id: string; name: string };
type Draft = { name: string; description: string; model: string; gender: Gender | ''; measurements: string; quantity: string; unitCost: string };

const emptyDraft: Draft = { name: '', description: '', model: '', gender: '', measurements: '', quantity: '1', unitCost: '' };
const genderLabels: Record<Gender, string> = { masculina: 'Masculina', feminina: 'Feminina', unissex: 'Unissex' };
const stageLabels: Record<string, string> = { aguardando_precificacao: 'Preço pendente', aguardando_catalogo: 'Aguardando catálogo', pronto: 'Pronta para publicar' };

function costInCents(value: string) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error('Informe um custo unitário válido em reais.');
  const cents = Math.round(Number(value.replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents > 2147483647) throw new Error('Custo unitário fora do limite.');
  return cents;
}

export default function JewelryPage() {
  const { db } = useManagement();
  const [items, setItems] = useState<Jewelry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [jewelryResult, collectionResult] = await Promise.all([
      db.from('products').select('id,registration_code,name,description,model,category,gender,measurements,stock,price_cents,workflow_stage,active,collection_id,jewelry_intake(acquisition_cost_cents,identification_image_path)').order('created_at', { ascending: false }),
      db.from('collections').select('id,name').order('name'),
    ]);
    const { data, error } = jewelryResult;
    if (error || collectionResult.error) setMessage('Não foi possível carregar as joias e coleções. Confira sua sessão.');
    else setItems((data ?? []).map(row => ({ ...row,
      jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
    })) as Jewelry[]);
    if (!collectionResult.error) setCollections((collectionResult.data ?? []) as Collection[]);
    setLoading(false);
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function select(item: Jewelry | null) {
    setEditingId(item?.id ?? null);
    setDraft(item ? {
      name: item.name, description: item.description ?? '', model: item.model ?? '',
      gender: item.gender, measurements: item.measurements ?? '', quantity: String(item.stock),
      unitCost: item.jewelry_intake ? (item.jewelry_intake.acquisition_cost_cents / 100).toFixed(2) : '',
    } : { ...emptyDraft });
    setImage(null); setImageUrl(null); setMessage('');
    const path = item?.jewelry_intake?.identification_image_path;
    if (path) {
      const { data } = await db.storage.from('jewelry-identification').createSignedUrl(path, 300);
      setImageUrl(data?.signedUrl ?? null);
    }
    document.getElementById('jewelry-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setMessage('');
    try {
      const quantity = Number(draft.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw new Error('Informe uma quantidade entre 0 e 1.000.000.');
      if (!draft.name.trim() || !draft.model.trim()) throw new Error('Nome e modelo são obrigatórios.');
      if (!draft.gender) throw new Error('Selecione o gênero da joia.');
      const newCost = costInCents(draft.unitCost);
      if (current?.active && newCost !== current.jewelry_intake?.acquisition_cost_cents && !window.confirm('O custo da joia mudou. Salvar retirará a peça da loja até uma nova precificação e revisão do catálogo. Deseja continuar?')) return;
      const input = {
        p_name: draft.name.trim(), p_description: draft.description.trim(), p_model: draft.model.trim(),
        p_gender: draft.gender, p_measurements: draft.measurements.trim(), p_quantity: quantity,
        p_unit_cost_cents: newCost, p_identification_image_path: null as string | null,
      };
      const { data, error } = await db.rpc('save_jewelry_intake_v4', { ...input, p_id: editingId });
      if (error || !Array.isArray(data) || !data[0]?.id) throw new Error(error?.message ?? 'Não foi possível salvar a joia. Confira os dados e sua sessão.');
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
        const { error: photoError } = await db.rpc('save_jewelry_intake_v4', {
          ...input, p_id: id, p_identification_image_path: result.imagePath,
        });
        if (photoError) throw new Error('Joia salva, mas a foto não foi vinculada. Tente novamente.');
        const { data: signed } = await db.storage.from('jewelry-identification').createSignedUrl(result.imagePath, 300);
        setImageUrl(signed?.signedUrl ?? null); setImage(null);
      }
      await refresh();
      setMessage(data[0].active ? `Joia ${data[0].registration_code} atualizada e permanece publicada.` : data[0].workflow_stage === 'aguardando_precificacao' && current?.active ? `Joia ${data[0].registration_code} retirada da loja após a alteração do custo. Revise o preço antes de publicar novamente.` : data[0].workflow_stage === 'aguardando_precificacao' && !current?.collection_id ? `Joia ${data[0].registration_code} salva. Defina a coleção antes de precificar.` : data[0].workflow_stage === 'aguardando_precificacao' ? `Joia ${data[0].registration_code} salva. Revise a precificação.` : `Joia ${data[0].registration_code} atualizada.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a joia.');
      await refresh();
    } finally { setSaving(false); }
  }

  const current = items.find(item => item.id === editingId);
  const collectionName = (id: string | null) => collections.find(collection => collection.id === id)?.name ?? 'Sem coleção';
  const visible = items.filter(item => `${item.registration_code} ${item.name} ${item.model ?? item.category} ${collectionName(item.collection_id)}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  let unitCost: number | null = null;
  let totalCost: number | null = null;
  try {
    const quantity = Number(draft.quantity);
    if (draft.unitCost) unitCost = costInCents(draft.unitCost);
    if (unitCost !== null && Number.isSafeInteger(quantity) && quantity >= 0) totalCost = unitCost * quantity;
  } catch { /* formulário incompleto */ }

  return <main className="management-page jewelry-page">
    <p className="eyebrow">ETAPA 01 · REGISTRO</p>
    <div className="management-title-row"><div><h1>Joias</h1><p className="management-intro">Cadastre todas as peças aqui. Depois, distribua cada joia em uma coleção e só então defina o preço. Salvar não publica a joia.</p></div><button className="management-outline" type="button" onClick={() => void select(null)}>+ Nova joia</button></div>

    <section id="jewelry-editor" className="management-card jewelry-editor"><div className="jewelry-form-head"><div><p className="eyebrow">{current ? current.registration_code : 'NOVO REGISTRO'}</p><h2>{current ? 'Editar joia' : 'Cadastrar joia'}</h2></div><span className="management-badge">{current?.active ? 'Publicada' : current ? stageLabels[current.workflow_stage] ?? 'Em cadastro' : 'Não publicada'}</span></div>
      {current?.active && <p className="jewelry-next-step">Esta joia está publicada. Alterações nos dados e na quantidade são salvas normalmente. <strong>Se o custo unitário mudar, ela será retirada da loja para nova precificação.</strong> As fotos comerciais continuam na página <Link href="/admin/catalogo">Catálogo</Link>; a coleção é alterada em <Link href="/admin/colecoes">Coleções</Link>.</p>}
      <form onSubmit={save}>
        <div className="management-fields">
          <label>Nome comercial<input required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Colar Aurora"/></label>
          <label>Modelo<input required maxLength={80} list="jewelry-models" value={draft.model} onChange={event => setDraft({ ...draft, model: event.target.value })} placeholder="Ex.: Cordão"/><datalist id="jewelry-models">{['Cordão', 'Brinco', 'Pulseira', 'Choker', 'Bracelete', 'Anel', 'Pingente'].map(value => <option value={value} key={value}/>)}</datalist></label>
          <label>Gênero da joia<select required value={draft.gender} onChange={event => setDraft({ ...draft, gender: event.target.value as Draft['gender'] })}><option value="">Selecione</option><option value="feminina">Feminina</option><option value="masculina">Masculina</option><option value="unissex">Unissex</option></select></label>
          <label>Medidas<input maxLength={240} value={draft.measurements} onChange={event => setDraft({ ...draft, measurements: event.target.value })} placeholder="Ex.: 45 cm de comprimento"/></label>
          <label className="management-wide">Descrição<textarea rows={4} maxLength={2000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Resumo, detalhes e características da peça"/></label>
          <label>Custo unitário (R$)<input required inputMode="decimal" value={draft.unitCost} onChange={event => setDraft({ ...draft, unitCost: event.target.value })} placeholder="0,00"/></label>
          <label>Quantidade disponível<input required type="number" min="0" max="1000000" step="1" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })}/></label>
          <label className="management-wide">Foto de identificação, privada<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setImage(event.target.files?.[0] ?? null)}/><small>Esta foto não aparece na loja. JPG, PNG ou WebP, até 5 MB.</small></label>
        </div>
        {imageUrl && <img className="jewelry-private-photo" src={imageUrl} alt={`Foto de identificação de ${current?.name ?? 'joia'}`}/>}
        <div className="jewelry-cost-summary"><span>Custo por unidade <strong>{unitCost === null ? '—' : brl(unitCost)}</strong></span><span>Custo total do lote <strong>{totalCost === null ? '—' : brl(totalCost)}</strong></span></div>
        {!current?.active && <p className="jewelry-next-step">{current?.collection_id ? <>Coleção definida. Se o custo mudou, revise a <Link href="/admin/precificacao">Precificação</Link>.</> : <>Próxima etapa: <Link href="/admin/colecoes">definir a coleção</Link>. A joia só aparecerá na Precificação depois disso.</>}</p>}
        <button className="botao" type="submit" disabled={saving}>{saving ? 'Salvando...' : current ? 'Salvar alterações' : 'Salvar joia'}</button>
      </form>
      <p role="status" className="management-status">{message}</p>
      {current && !current.active && <div className="jewelry-followup"><button className="management-outline" type="button" onClick={() => void select(null)}>Cadastrar outra joia</button><Link className="management-outline" href="/admin/colecoes">Definir coleções</Link></div>}
    </section>
    <section className="management-card jewelry-table-card" aria-labelledby="registered-jewelry-title">
      <div className="jewelry-table-head"><div><h2 id="registered-jewelry-title">Joias cadastradas <small>{items.length}</small></h2><p>Custos e preços desta tabela são visíveis somente na gestão.</p></div><label>Buscar joia<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, código ou coleção"/></label></div>
      {loading ? <p>Carregando joias...</p> : visible.length === 0 ? <p>{items.length === 0 ? 'Nenhuma joia cadastrada ainda.' : 'Nenhuma joia corresponde à busca.'}</p> : <div className="jewelry-table-scroll"><table className="jewelry-table"><caption className="sr-only">Joias cadastradas para gestão</caption><thead><tr><th>Código / Joia</th><th>Modelo</th><th>Coleção</th><th>Gênero</th><th>Qtd.</th><th>Custo unit.</th><th>Custo total</th><th>Preço venda</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{visible.map(item => {
        const cost = item.jewelry_intake?.acquisition_cost_cents;
        return <tr key={item.id}><td><strong>{item.name}</strong><small>{item.registration_code}</small></td><td>{item.model ?? item.category}</td><td>{collectionName(item.collection_id)}</td><td>{genderLabels[item.gender] ?? '—'}</td><td>{item.stock}</td><td>{cost === undefined ? '—' : brl(cost)}</td><td>{cost === undefined ? '—' : brl(cost * item.stock)}</td><td>{item.workflow_stage === 'aguardando_precificacao' || item.price_cents <= 0 ? <span className="jewelry-pending">Pendente</span> : brl(item.price_cents)}</td><td><span className="management-badge">{item.active ? 'Publicada' : !item.collection_id ? 'Coleção pendente' : stageLabels[item.workflow_stage] ?? 'Em cadastro'}</span></td><td><button type="button" onClick={() => void select(item)}>Editar</button></td></tr>;
      })}</tbody></table></div>}
    </section>
  </main>;
}
