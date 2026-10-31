'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useManagement } from '../layout';

type Collection = { id: string; name: string; created_at: string };
type Jewelry = { id: string; collection_id: string | null };

export default function CollectionsPage() {
  const { db } = useManagement();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [jewelry, setJewelry] = useState<Jewelry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [collectionResult, jewelryResult] = await Promise.all([
      db.from('collections').select('id,name,created_at').order('name'),
      db.from('products').select('id,collection_id'),
    ]);
    if (collectionResult.error || jewelryResult.error) setMessage('Não foi possível carregar as coleções. Confira sua sessão.');
    else {
      setCollections((collectionResult.data ?? []) as Collection[]);
      setJewelry((jewelryResult.data ?? []) as Jewelry[]);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 100) { setMessage('Informe um nome de 2 a 100 caracteres.'); return; }
    setSaving(true); setMessage('');
    const result = editingId
      ? await db.from('collections').update({ name: cleanName }).eq('id', editingId).select('id').single()
      : await db.from('collections').insert({ name: cleanName }).select('id').single();
    if (result.error) setMessage(result.error.code === '23505' ? 'Já existe uma coleção com esse nome.' : 'Não foi possível salvar a coleção. Confira sua sessão.');
    else {
      setName(''); setEditingId(null);
      await refresh();
      setMessage('Coleção salva. Agora você pode vinculá-la às joias.');
    }
    setSaving(false);
  }

  return <main className="management-page"><p className="eyebrow">ORGANIZAÇÃO DO CATÁLOGO</p><h1>Coleções / campanhas</h1><p className="management-intro">Crie agrupamentos para as joias da loja. Cada joia pode pertencer a uma coleção por vez; mudar o nome da coleção atualiza todas as joias vinculadas.</p>
    <section className="management-card"><h2>{editingId ? 'Editar coleção' : 'Nova coleção'}</h2><form onSubmit={save} className="management-fields"><label className="management-wide">Nome da coleção ou campanha<input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Essência, Dia das Mães"/></label><div className="management-wide"><button className="botao" type="submit" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar nome' : 'Cadastrar coleção'}</button>{editingId && <button className="management-outline" type="button" onClick={() => { setEditingId(null); setName(''); }}>Cancelar edição</button>}</div></form></section>
    <section className="management-card"><h2>Coleções cadastradas</h2>{loading ? <p>Carregando...</p> : collections.length === 0 ? <p>Nenhuma coleção cadastrada ainda.</p> : <div className="jewelry-table-scroll"><table className="jewelry-table"><thead><tr><th>Coleção</th><th>Joias vinculadas</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{collections.map(collection => <tr key={collection.id}><td><strong>{collection.name}</strong></td><td>{jewelry.filter(item => item.collection_id === collection.id).length}</td><td><button type="button" onClick={() => { setEditingId(collection.id); setName(collection.name); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar nome</button></td></tr>)}</tbody></table></div>}<p>Para vincular ou trocar uma coleção, abra o <Link href="/admin/joias">cadastro de Joias →</Link></p></section>
    <p className="management-status" role="status">{message}</p>
  </main>;
}
