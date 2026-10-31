'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useManagement } from '../layout';

type Collection = { id: string; name: string };
type Jewelry = { id: string; registration_code: string; name: string; model: string | null; collection_id: string | null; workflow_stage: string; active: boolean; jewelry_intake: { product_id: string } | null };

export default function CollectionsPage() {
  const { db } = useManagement();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [jewelry, setJewelry] = useState<Jewelry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [filter, setFilter] = useState('sem_colecao');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [collectionResult, jewelryResult] = await Promise.all([
      db.from('collections').select('id,name').order('name'),
      db.from('products').select('id,registration_code,name,model,collection_id,workflow_stage,active,jewelry_intake(product_id)').order('created_at', { ascending: false }),
    ]);
    if (collectionResult.error || jewelryResult.error) setMessage('Não foi possível carregar as coleções e joias. Confira sua sessão.');
    else {
      setCollections((collectionResult.data ?? []) as Collection[]);
      setJewelry((jewelryResult.data ?? []).map(row => ({ ...row,
        jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
      })).filter(row => row.jewelry_intake) as Jewelry[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function saveCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 100) { setMessage('Informe um nome de 2 a 100 caracteres.'); return; }
    setBusy(true); setMessage('');
    const result = editingId
      ? await db.from('collections').update({ name: cleanName }).eq('id', editingId).select('id').single()
      : await db.from('collections').insert({ name: cleanName }).select('id').single();
    if (result.error) setMessage(result.error.code === '23505' ? 'Já existe uma coleção com esse nome.' : 'Não foi possível salvar a coleção. Confira sua sessão.');
    else {
      setName(''); setEditingId(null);
      await refresh();
      setMessage('Coleção salva. Selecione as joias abaixo para vinculá-las.');
    }
    setBusy(false);
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !selectedIds.length || !targetId) return;
    setBusy(true); setMessage('');
    const { data, error } = await db.rpc('assign_jewelry_collection', { p_product_ids: selectedIds, p_collection_id: targetId });
    if (error) setMessage('Não foi possível distribuir as joias. Confira a seleção e sua sessão.');
    else {
      setSelectedIds([]);
      await refresh();
      setMessage(`${data} ${data === 1 ? 'joia vinculada' : 'joias vinculadas'} à coleção. As peças sem preço já podem ser precificadas.`);
    }
    setBusy(false);
  }

  async function unassign(item: Jewelry) {
    if (busy || item.workflow_stage !== 'aguardando_precificacao') return;
    setBusy(true); setMessage('');
    const { error } = await db.rpc('set_jewelry_collection', { p_product_id: item.id, p_collection_id: null });
    if (error) setMessage('Não foi possível retirar a joia da coleção.');
    else { setSelectedIds(ids => ids.filter(id => id !== item.id)); await refresh(); setMessage(`${item.name} voltou para a fila sem coleção.`); }
    setBusy(false);
  }

  const pending = jewelry.filter(item => !item.collection_id);
  const visible = jewelry.filter(item =>
    (filter === 'todas' || (filter === 'sem_colecao' ? !item.collection_id : item.collection_id === filter)) &&
    `${item.name} ${item.registration_code} ${item.model ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
  );
  const visibleIds = visible.map(item => item.id);

  return <main className="management-page collection-page"><p className="eyebrow">ETAPA 02 · ORGANIZAÇÃO</p><h1>Coleções / campanhas</h1><p className="management-intro">Cadastre a coleção e distribua as joias. Cada peça pertence a uma coleção por vez; depois de vinculada, ela fica disponível na Precificação. Você pode movê-la para outra coleção mais tarde.</p>
    <div className="pricing-queue-summary"><div><strong>{pending.length}</strong><span>Sem coleção · aguardando</span></div><div><strong>{jewelry.length - pending.length}</strong><span>Com coleção definida</span></div></div>
    <section className="management-card"><h2>{editingId ? 'Editar coleção' : 'Criar coleção'}</h2><form onSubmit={saveCollection} className="management-fields"><label className="management-wide">Nome da coleção ou campanha<input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Essência, Dia das Mães"/></label><div className="management-wide"><button className="botao" type="submit" disabled={busy}>{busy ? 'Salvando...' : editingId ? 'Salvar nome' : 'Cadastrar coleção'}</button>{editingId && <button className="management-outline" type="button" onClick={() => { setEditingId(null); setName(''); }}>Cancelar</button>}</div></form></section>
    <section className="management-card"><h2>Coleções cadastradas</h2>{loading ? <p>Carregando...</p> : collections.length === 0 ? <p>Nenhuma coleção cadastrada ainda. Crie a primeira acima para distribuir as joias.</p> : <div className="jewelry-table-scroll"><table className="jewelry-table"><thead><tr><th>Coleção</th><th>Joias</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{collections.map(collection => <tr key={collection.id}><td><strong>{collection.name}</strong></td><td>{jewelry.filter(item => item.collection_id === collection.id).length}</td><td><button type="button" onClick={() => { setEditingId(collection.id); setName(collection.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar nome</button></td></tr>)}</tbody></table></div>}</section>
    <section className="management-card" aria-labelledby="collection-assignment-title"><h2 id="collection-assignment-title">Distribuir joias</h2><p>Filtre as peças, marque uma ou mais e escolha a coleção de destino. Para mudar uma joia de coleção, selecione-a novamente e escolha outra.</p><div className="management-fields"><label>Mostrar joias<select value={filter} onChange={event => { setFilter(event.target.value); setSelectedIds([]); }}><option value="sem_colecao">Sem coleção ({pending.length})</option><option value="todas">Todas as joias ({jewelry.length})</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><label>Buscar joia<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, código ou modelo"/></label></div>
      {loading ? <p>Carregando joias...</p> : visible.length === 0 ? <p>{jewelry.length === 0 ? <>Nenhuma joia cadastrada. <Link href="/admin/joias">Cadastrar joia →</Link></> : 'Nenhuma joia nesta seleção.'}</p> : <div className="jewelry-table-scroll"><table className="jewelry-table collection-assignment-table"><thead><tr><th><label><input type="checkbox" aria-label="Selecionar todas as joias visíveis" checked={visibleIds.every(id => selectedIds.includes(id))} onChange={event => setSelectedIds(event.target.checked ? [...new Set([...selectedIds, ...visibleIds])].slice(0, 500) : selectedIds.filter(id => !visibleIds.includes(id)))}/></label></th><th>Joia</th><th>Modelo</th><th>Coleção atual</th><th>Etapa</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><input type="checkbox" aria-label={`Selecionar ${item.name}`} checked={selectedIds.includes(item.id)} onChange={event => setSelectedIds(ids => event.target.checked ? ids.includes(item.id) ? ids : [...ids, item.id] : ids.filter(id => id !== item.id))}/></td><td><strong>{item.name}</strong><small>{item.registration_code}</small></td><td>{item.model ?? '—'}</td><td>{collections.find(collection => collection.id === item.collection_id)?.name ?? 'Sem coleção'}</td><td>{item.active ? 'Publicada' : item.workflow_stage === 'aguardando_precificacao' ? item.collection_id ? 'Pronta para precificar' : 'Aguardando coleção' : 'Preço definido'}</td><td>{item.collection_id && item.workflow_stage === 'aguardando_precificacao' && <button type="button" disabled={busy} onClick={() => void unassign(item)}>Retirar</button>}</td></tr>)}</tbody></table></div>}
      <form className="management-fields" onSubmit={assign}><label>Coleção de destino<select required value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Selecione</option>{collections.map(collection => <option value={collection.id} key={collection.id}>{collection.name}</option>)}</select></label><div><button className="botao" type="submit" disabled={busy || selectedIds.length === 0 || !targetId}>{busy ? 'Salvando...' : `Vincular ${selectedIds.length} ${selectedIds.length === 1 ? 'joia' : 'joias'}`}</button></div></form><p>Após distribuir, continue em <Link href="/admin/precificacao">Precificação →</Link></p>
    </section><p className="management-status" role="status">{message}</p>
  </main>;
}
