'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { brl } from '@/lib/products';
import { useManagement } from '../layout';

type Jewelry = { id: string; registration_code: string; name: string; description: string | null; measurements: string | null; model: string | null; price_cents: number; active: boolean; commercial_image_urls: string[]; jewelry_intake: { product_id: string } | null };
type Draft = { name: string; description: string; measurements: string; photos: string[] };

export default function CatalogManagementPage() {
  const { db } = useManagement();
  const [items, setItems] = useState<Jewelry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', description: '', measurements: '', photos: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data, error } = await db.from('products')
      .select('id,registration_code,name,description,measurements,model,price_cents,active,commercial_image_urls,jewelry_intake(product_id)')
      .in('workflow_stage', ['aguardando_catalogo', 'pronto']).gt('price_cents', 0)
      .order('created_at', { ascending: false });
    if (error) setMessage('Não foi possível carregar o catálogo de gestão. Confira sua sessão.');
    else setItems((data ?? []).map(row => ({ ...row,
      jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
    })).filter(row => row.jewelry_intake) as Jewelry[]);
    setLoading(false);
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);

  function select(item: Jewelry) {
    setSelectedId(item.id);
    setDraft({ name: item.name, description: item.description ?? '', measurements: item.measurements ?? '', photos: item.commercial_image_urls ?? [] });
    setMessage('');
    document.getElementById('catalog-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    if (files.length + draft.photos.length > 8) { setMessage('Use no máximo 8 fotos por joia.'); return; }
    setBusy(true); setMessage('Enviando fotos comerciais...');
    const next = [...draft.photos];
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) throw new Error('Sua sessão expirou. Entre novamente.');
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use JPG, PNG ou WebP de até 5 MB por foto.');
        const form = new FormData(); form.set('imagem', file);
        const response = await fetch('/api/admin/images', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: form });
        if (!response.ok) throw new Error('Não foi possível enviar uma das fotos. Tente novamente.');
        const result = await response.json();
        next.push(result.imageUrl);
        setDraft(current => ({ ...current, photos: [...next] }));
      }
      setMessage('Fotos enviadas. Salve a ficha para vinculá-las à joia.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha no envio.'); }
    finally { setBusy(false); }
  }

  async function save(publish: boolean | null) {
    if (!selectedId || busy) return;
    if ((publish || (publish === null && selected?.active)) && (!draft.name.trim() || !draft.description.trim() || !draft.measurements.trim() || !draft.photos.length)) {
      setMessage('Para publicar, confirme nome, descrição, medidas e pelo menos uma foto comercial.'); return;
    }
    setBusy(true); setMessage('');
    const { error } = await db.rpc('save_catalog_review', {
      p_product_id: selectedId, p_name: draft.name.trim(), p_description: draft.description.trim(),
      p_measurements: draft.measurements.trim(), p_image_urls: draft.photos, p_publish: publish,
    });
    if (error) setMessage('Não foi possível salvar a ficha. Confira os campos, as fotos e sua sessão.');
    else { await refresh(); setMessage(publish === true ? 'Joia publicada na loja. Confira a página pública antes de divulgar.' : publish === false ? 'Joia retirada da loja.' : 'Ficha comercial salva. O estado de publicação não mudou.'); }
    setBusy(false);
  }

  const selected = items.find(item => item.id === selectedId);
  return <main className="management-page"><p className="eyebrow">ETAPA 04 · REVISÃO COMERCIAL</p><h1>Catálogo</h1><p className="management-intro">Confirme as informações exibidas na loja e envie as fotos comerciais. Só o botão “Publicar” libera a joia para clientes; a foto de identificação e os custos permanecem privados.</p>
    {loading ? <p>Carregando catálogo...</p> : items.length === 0 ? <div className="management-card management-pending"><h2>Nenhuma joia pronta para esta etapa</h2><p>Depois de definir o preço, a joia aparecerá aqui.</p><Link className="management-outline" href="/admin/precificacao">Ver fila de precificação →</Link></div> : <div className="workflow-pricing-layout"><section className="management-card workflow-pricing-list"><h2>Joias para revisão</h2>{items.map(item => <button type="button" key={item.id} className={selectedId === item.id ? 'workflow-jewelry selected' : 'workflow-jewelry'} onClick={() => select(item)}><span><strong>{item.name}</strong><small>{item.registration_code} · {item.model ?? 'Modelo não informado'}</small><small>{brl(item.price_cents)} · {item.active ? 'Publicada' : 'Não publicada'}</small></span><span>↗</span></button>)}</section>
      <section id="catalog-editor" className="management-card workflow-pricing-editor">{selected ? <><div className="jewelry-form-head"><div><p className="eyebrow">{selected.registration_code}</p><h2>Ficha comercial</h2></div><span className="management-badge">{selected.active ? 'Publicada' : 'Não publicada'}</span></div><p>Preço definido na Precificação: <strong>{brl(selected.price_cents)}</strong>. Para alterá-lo, volte à <Link href="/admin/precificacao">Precificação</Link>.</p><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void save(null); }}><div className="management-fields"><label>Nome comercial<input required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label><label>Medidas<input maxLength={240} value={draft.measurements} onChange={event => setDraft({ ...draft, measurements: event.target.value })}/></label><label className="management-wide">Descrição comercial<textarea rows={5} maxLength={2000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label><label className="management-wide">Adicionar fotos comerciais<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || draft.photos.length >= 8} onChange={event => { void upload(event.target.files); event.target.value = ''; }}/><small>Até 8 fotos JPG, PNG ou WebP, até 5 MB cada. A primeira é a capa. Estas fotos são públicas.</small></label></div>
        {draft.photos.length > 0 && <div className="catalog-photo-grid">{draft.photos.map((url, index) => <div key={url}><img src={url} alt={`Foto comercial ${index + 1} de ${draft.name}`}/><small>{index === 0 ? 'Capa' : `Foto ${index + 1}`}</small><button type="button" disabled={busy} onClick={() => setDraft({ ...draft, photos: draft.photos.filter(photo => photo !== url) })}>Remover</button>{index > 0 && <button type="button" disabled={busy} onClick={() => setDraft({ ...draft, photos: [url, ...draft.photos.filter(photo => photo !== url)] })}>Usar como capa</button>}</div>)}</div>}
        <div className="catalog-actions"><button className="management-outline" type="submit" disabled={busy}>{busy ? 'Aguarde...' : 'Salvar sem publicar'}</button>{selected.active ? <button className="botao" type="button" disabled={busy} onClick={() => void save(false)}>Retirar da loja</button> : <button className="botao" type="button" disabled={busy} onClick={() => void save(true)}>Publicar na loja</button>}</div></form></> : <><h2>Escolha uma joia</h2><p>As peças precificadas ficam nesta fila até a revisão comercial.</p></>}</section></div>}
    <p role="status" className="management-status">{message}</p>
  </main>;
}
