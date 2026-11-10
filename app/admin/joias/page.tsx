'use client';
import Image from 'next/image';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { brl } from '@/lib/products';
import { useIdentificationPhotos } from '@/lib/use-identification-photos';
import { useManagement } from '../layout';
import JewelryThumbnail from '../jewelry-thumbnail';
import { Feedback, ErrorState, EmptyState, Skeleton, Workflow, PageHeader, Modal } from '../ui/components';

import { defaultJewelryPreferences, readJewelryPreferences, writeJewelryPreferences, jewelryColumns, type JewelryColumn } from '../jewelry-preferences';

type Gender = 'masculina' | 'feminina' | 'unissex';
type Jewelry = {
  id: string; registration_code: string; name: string; description: string | null;
  model: string | null; category: string; gender: Gender; measurements: string | null;
  commercial_image_urls?: string[]; stock: number; price_cents: number; workflow_stage: string; active: boolean; collection_id: string | null;
  jewelry_intake: { acquisition_cost_cents: number; identification_image_path: string | null } | null;
};
type Collection = { id: string; name: string };
type Draft = { name: string; description: string; model: string; gender: Gender | ''; measurements: string; quantity: string; unitCost: string };
type SavedConfirmation = { code: string; name: string; model: string; gender: Gender; description: string | null; measurements: string | null; quantity: number; unitCostCents: number; photoUrl: string };

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
  const [loadError,setLoadError]=useState(false);
  const [preferences,setPreferences]=useState(defaultJewelryPreferences);
  const [preferencesReady,setPreferencesReady]=useState(false);
  const {query,status:statusFilter,sort,view,page,density,columns,hidden}=preferences;
  const setQuery=(query:string)=>setPreferences(p=>({...p,query,page:1}));
  const setStatusFilter=(status:string)=>setPreferences(p=>({...p,status,page:1}));
  const setSort=(sort:string)=>setPreferences(p=>({...p,sort,page:1}));
  const setView=(view:string)=>setPreferences(p=>({...p,view}));
  const setPage=(change:(value:number)=>number)=>setPreferences(p=>({...p,page:change(p.page)}));
  useEffect(()=>{const restore=()=>{const value=readJewelryPreferences(window.location.search);if(!new URLSearchParams(window.location.search).has('visao')&&window.matchMedia('(max-width:600px)').matches)value.view='grade';setPreferences(value);setPreferencesReady(true);};restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
  useEffect(()=>{if(preferencesReady){const url=new URL(window.location.href);url.search=writeJewelryPreferences(preferences,url.search);window.history.replaceState(null,'',url);}},[preferences,preferencesReady]);
  const [batchIds,setBatchIds]=useState<string[]>([]);
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [touched,setTouched]=useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft });
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<SavedConfirmation | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Jewelry | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);setLoadError(false);
    const [jewelryResult, collectionResult] = await Promise.all([
      db.from('products').select('id,registration_code,name,description,model,category,gender,measurements,stock,price_cents,workflow_stage,active,collection_id,commercial_image_urls,jewelry_intake(acquisition_cost_cents,identification_image_path)').order('created_at', { ascending: false }),
      db.from('collections').select('id,name').order('name'),
    ]);
    const { data, error } = jewelryResult;
    if (error || collectionResult.error) {setLoadError(true);setMessage('Não foi possível carregar as joias e coleções. Confira sua sessão.');}
    else setItems((data ?? []).map(row => ({ ...row,
      jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
    })) as Jewelry[]);
    if (!collectionResult.error) setCollections((collectionResult.data ?? []) as Collection[]);
    setLoading(false);
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function select(item: Jewelry | null) {
    setDrawerOpen(true);setTouched(false);
    setEditingId(item?.id ?? null);
    setFileInputKey(key => key + 1);
    setDraft(item ? {
      name: item.name, description: item.description ?? '', model: item.model ?? '',
      gender: item.gender, measurements: item.measurements ?? '', quantity: String(item.stock),
      unitCost: item.jewelry_intake ? (item.jewelry_intake.acquisition_cost_cents / 100).toFixed(2) : '',
    } : { ...emptyDraft });
    setImage(null); setImageUrl(null); setMessage(''); setLastSaved(null);
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
    setSaving(true); setMessage(''); setLastSaved(null);
    let savedCode = '';
    try {
      const quantity = Number(draft.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw new Error('Informe uma quantidade entre 0 e 1.000.000.');
      if (!draft.name.trim() || !draft.model.trim()) throw new Error('Nome e modelo são obrigatórios.');
      if (!draft.gender) throw new Error('Selecione o gênero da joia.');
      if (!image && !current?.jewelry_intake?.identification_image_path) throw new Error('Adicione a foto de identificação para concluir o cadastro da joia.');
      if (image && (image.size < 1 || image.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(image.type))) throw new Error('Use uma foto JPG, PNG ou WebP de até 5 MB.');
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
      savedCode = data[0].registration_code as string;
      setEditingId(id);
      let photoPath = current?.jewelry_intake?.identification_image_path ?? null;
      if (image) {
        const { data: { session } } = await db.auth.getSession();
        if (!session) throw new Error('Joia salva, mas a sessão expirou antes do envio da foto.');
        const upload = new FormData(); upload.set('imagem', image);
        let response: Response;
        try { response = await fetch('/api/admin/images?kind=identification', {
          method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: upload,
        }); } catch { throw new Error('Joia salva, mas a conexão falhou durante o envio da foto. O formulário foi mantido; tente salvar novamente.'); }
        if (!response.ok) throw new Error('Joia salva, mas não foi possível enviar a foto. Tente novamente.');
        const result = await response.json();
        if (typeof result.imagePath !== 'string') throw new Error('Joia salva, mas o envio da foto não foi confirmado. Tente novamente.');
        const { error: photoError } = await db.rpc('save_jewelry_intake_v4', {
          ...input, p_id: id, p_identification_image_path: result.imagePath,
        });
        if (photoError) throw new Error('Joia salva, mas a foto não foi vinculada. Tente novamente.');
        photoPath = result.imagePath;
      }
      const { data: verified, error: verifyError } = await db.from('products')
        .select('name,description,model,gender,measurements,stock,jewelry_intake(acquisition_cost_cents,identification_image_path)')
        .eq('id', id).single();
      const intake = Array.isArray(verified?.jewelry_intake) ? verified.jewelry_intake[0] : verified?.jewelry_intake;
      if (verifyError || !verified || verified.name !== input.p_name || verified.model !== input.p_model || verified.gender !== input.p_gender
        || verified.description !== (input.p_description || null) || verified.measurements !== (input.p_measurements || null)
        || verified.stock !== quantity || intake?.acquisition_cost_cents !== newCost || !photoPath || intake.identification_image_path !== photoPath) {
        throw new Error('Joia salva, mas não foi possível confirmar todos os dados e a foto no banco. O formulário foi mantido; confira a tabela antes de tentar novamente.');
      }
      const { data: signed, error: signedError } = await db.storage.from('jewelry-identification').createSignedUrl(photoPath, 300);
      if (signedError || !signed?.signedUrl) throw new Error('Joia e foto vinculadas, mas não foi possível verificar a imagem agora. O formulário foi mantido; tente novamente.');
      await refresh();
      setLastSaved({ code: savedCode, name: verified.name, model: verified.model, gender: verified.gender as Gender,
        description: verified.description, measurements: verified.measurements,
        quantity: verified.stock, unitCostCents: intake.acquisition_cost_cents, photoUrl: signed.signedUrl });
      setEditingId(null); setDraft({ ...emptyDraft }); setImage(null); setImageUrl(null); setFileInputKey(key => key + 1);
      setMessage(data[0].active ? `Joia ${savedCode} salva com foto e permanece publicada.` : data[0].workflow_stage === 'aguardando_precificacao' && current?.active ? `Joia ${savedCode} salva com foto e retirada da loja após a alteração do custo. Revise o preço antes de publicar novamente.` : `Joia ${savedCode} salva com foto e informações confirmadas. Formulário pronto para uma nova joia.`);
    } catch (error) {
      await refresh();
      setMessage(error instanceof Error ? savedCode && error.message === 'Failed to fetch' ? `Joia ${savedCode} salva, mas uma conexão falhou antes da confirmação da foto. Confira a tabela; o formulário foi mantido.` : error.message : 'Não foi possível salvar a joia.');
    } finally { setSaving(false); }
  }

  async function deleteJewelry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleteCandidate || deleting || deleteCode.trim() !== deleteCandidate.registration_code) return;
    setDeleting(true); setMessage('');
    try {
      const { data, error } = await db.rpc('delete_jewelry', { p_product_id: deleteCandidate.id });
      if (error || !Array.isArray(data) || !data[0]) throw new Error(error?.message ?? 'Não foi possível excluir a joia.');
      const removed = data[0] as { registration_code: string; identification_image_path: string | null; commercial_image_paths: string[] | null };
      const cleanup = await Promise.allSettled([
        removed.identification_image_path ? db.storage.from('jewelry-identification').remove([removed.identification_image_path]) : Promise.resolve({ error: null }),
        removed.commercial_image_paths?.length ? db.storage.from('product-images').remove(removed.commercial_image_paths) : Promise.resolve({ error: null }),
      ]);
      if (editingId === deleteCandidate.id) { setEditingId(null); setDraft({ ...emptyDraft }); setImage(null); setImageUrl(null); setFileInputKey(key => key + 1); }
      setLastSaved(null); setDeleteCandidate(null); setDeleteCode('');
      await refresh();
      setMessage(cleanup.some(result => result.status === 'rejected' || result.value.error) ? `Joia ${removed.registration_code} excluída. Alguns arquivos de imagem não puderam ser removidos do armazenamento.` : `Joia ${removed.registration_code} excluída do cadastro, das coleções e da precificação. Imagens não compartilhadas removidas.`);
    } catch (error) {
      await refresh();
      setMessage(error instanceof Error ? error.message : 'Não foi possível excluir a joia.');
    } finally { setDeleting(false); }
  }

  const current = items.find(item => item.id === editingId);
  const photoUrls = useIdentificationPhotos(db, items.map(item => item.jewelry_intake?.identification_image_path));
  const missingPhotos = items.filter(item => item.jewelry_intake && !item.jewelry_intake.identification_image_path);
  const collectionName = (id: string | null) => collections.find(collection => collection.id === id)?.name ?? 'Sem coleção';
  const filtered = items.filter(item => statusFilter === 'todas' || (statusFilter === 'publicadas' ? item.active : statusFilter === 'sem_colecao' ? !item.collection_id : statusFilter === 'sem_foto' ? !item.commercial_image_urls?.length : item.workflow_stage === 'aguardando_precificacao')).sort((a,b)=>sort === 'nome' ? a.name.localeCompare(b.name,'pt-BR') : sort === 'quantidade' ? b.stock-a.stock : 0).filter(item => `${item.registration_code} ${item.name} ${item.model ?? item.category} ${collectionName(item.collection_id)}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const effectivePage=Math.min(page,Math.max(1,Math.ceil(filtered.length/25)));
  const visible=filtered.slice((effectivePage-1)*25,effectivePage*25);
  let unitCost: number | null = null;
  let totalCost: number | null = null;
  try {
    const quantity = Number(draft.quantity);
    if (draft.unitCost) unitCost = costInCents(draft.unitCost);
    if (unitCost !== null && Number.isSafeInteger(quantity) && quantity >= 0) totalCost = unitCost * quantity;
  } catch { /* formulário incompleto */ }

  const liveErrors:string[]=[];
  if(!draft.name.trim()||!draft.model.trim())liveErrors.push('Nome e modelo são obrigatórios.');
  if(!draft.gender)liveErrors.push('Selecione o gênero da joia.');
  if(!Number.isSafeInteger(Number(draft.quantity))||Number(draft.quantity)<0||Number(draft.quantity)>1000000)liveErrors.push('Informe uma quantidade entre 0 e 1.000.000.');
  try{costInCents(draft.unitCost);}catch(e){liveErrors.push(e instanceof Error?e.message:'Informe um custo válido.');}
  if(!image&&!current?.jewelry_intake?.identification_image_path)liveErrors.push('Adicione a foto de identificação para concluir o cadastro da joia.');
  if(image&&(image.size<1||image.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(image.type)))liveErrors.push('Use uma foto JPG, PNG ou WebP de até 5 MB.');
  const columnLabels:Record<JewelryColumn,string>={modelo:'Modelo',colecao:'Coleção',genero:'Gênero',quantidade:'Qtd.',custo:'Custo unit.',total:'Custo total',preco:'Preço venda',situacao:'Situação'};
  const moveColumn=(id:JewelryColumn,direction:number)=>setPreferences(p=>{const next=[...p.columns];const i=next.indexOf(id);const j=i+direction;if(j<0||j>=next.length)return p;[next[i],next[j]]=[next[j],next[i]];return {...p,columns:next};});
  const visibleColumns=columns.filter(id=>!hidden.includes(id));
  function cell(item:Jewelry,id:JewelryColumn):ReactNode{
    const cost=item.jewelry_intake?.acquisition_cost_cents;
    const cells:Record<JewelryColumn,ReactNode>={modelo:item.model??item.category,colecao:collectionName(item.collection_id),genero:genderLabels[item.gender]??'—',quantidade:item.stock,custo:cost===undefined?'—':brl(cost),total:cost===undefined?'—':brl(cost*item.stock),preco:item.workflow_stage==='aguardando_precificacao'||item.price_cents<=0?<span className="jewelry-pending">Pendente</span>:brl(item.price_cents),situacao:<span className="management-badge">{item.active?'Publicada':!item.collection_id?'Coleção pendente':stageLabels[item.workflow_stage]??'Em cadastro'}</span>};
    return cells[id];
  }
  return <main className="management-page jewelry-page">{loadError && <ErrorState onRetry={()=>void refresh()}/>} 
    <p className="eyebrow">ETAPA 01 · REGISTRO</p>
    <div className="management-title-row"><div><PageHeader title={"Joias"} description={"Cadastre todas as peças aqui. Depois, distribua cada joia em uma coleção e só então defina o preço. Salvar não publica a joia."}/></div><button className="management-outline" type="button" onClick={() => void select(null)}>+ Nova joia</button></div>

    <Modal open={drawerOpen} variant="drawer" title={current?'Editar joia':'Cadastrar joia'} onClose={()=>{if(!saving)setDrawerOpen(false);}}><section id="jewelry-editor" className="management-card jewelry-editor"><div className="jewelry-form-head"><div><p className="eyebrow">{current ? current.registration_code : 'NOVO REGISTRO'}</p><h2>{current ? 'Editar joia' : 'Cadastrar joia'}</h2></div><span className="management-badge">{current?.active ? 'Publicada' : current ? stageLabels[current.workflow_stage] ?? 'Em cadastro' : 'Não publicada'}</span></div>
      {current?.active && <p className="jewelry-next-step">Esta joia está publicada. Alterações nos dados e na quantidade são salvas normalmente. <strong>Se o custo unitário mudar, ela será retirada da loja para nova precificação.</strong> As fotos comerciais continuam na página <Link href="/admin/catalogo">Catálogo</Link>; a coleção é alterada em <Link href="/admin/colecoes">Coleções</Link>.</p>}
      {current && <Workflow collection={Boolean(current.collection_id)} priced={current.workflow_stage !== 'aguardando_precificacao' && current.price_cents > 0} published={current.active}/>}<form onSubmit={save} onChange={()=>setTouched(true)} aria-describedby="jewelry-live-validation"><div id="jewelry-live-validation" aria-live="polite">{touched&&liveErrors.length>0&&<ul className="erp-validation">{liveErrors.map(e=><li key={e}>{e}</li>)}</ul>}</div>
        <div className="management-fields">
          <label>Nome comercial<input aria-invalid={touched&&!draft.name.trim()} required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Colar Aurora"/></label>
          <label>Modelo<input aria-invalid={touched&&!draft.model.trim()} required maxLength={80} list="jewelry-models" value={draft.model} onChange={event => setDraft({ ...draft, model: event.target.value })} placeholder="Ex.: Cordão"/><datalist id="jewelry-models">{['Cordão', 'Brinco', 'Pulseira', 'Choker', 'Bracelete', 'Anel', 'Pingente'].map(value => <option value={value} key={value}/>)}</datalist></label>
          <label>Gênero da joia<select aria-invalid={touched&&!draft.gender} required value={draft.gender} onChange={event => setDraft({ ...draft, gender: event.target.value as Draft['gender'] })}><option value="">Selecione</option><option value="feminina">Feminina</option><option value="masculina">Masculina</option><option value="unissex">Unissex</option></select></label>
          <label>Medidas<input maxLength={240} value={draft.measurements} onChange={event => setDraft({ ...draft, measurements: event.target.value })} placeholder="Ex.: 45 cm de comprimento"/></label>
          <label className="management-wide">Descrição<textarea rows={4} maxLength={2000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Resumo, detalhes e características da peça"/></label>
          <label>Custo unitário (R$)<input aria-invalid={touched&&unitCost===null} required inputMode="decimal" value={draft.unitCost} onChange={event => setDraft({ ...draft, unitCost: event.target.value })} placeholder="0,00"/></label>
          <label>Quantidade disponível<input aria-invalid={touched&&(!Number.isSafeInteger(Number(draft.quantity))||Number(draft.quantity)<0||Number(draft.quantity)>1000000)} required type="number" min="0" max="1000000" step="1" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })}/></label>
          <label className="management-wide">Foto de identificação, privada<input key={fileInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setImage(event.target.files?.[0] ?? null)}/><small>Esta foto não aparece na loja. JPG, PNG ou WebP, até 5 MB. É necessária para concluir o cadastro.</small></label>
        </div>
        {imageUrl && <Image unoptimized width={140} height={140} className="jewelry-private-photo" src={imageUrl} alt={`Foto de identificação de ${current?.name ?? 'joia'}`}/>}
        <div className="jewelry-cost-summary"><span>Custo por unidade <strong>{unitCost === null ? '—' : brl(unitCost)}</strong></span><span>Custo total do lote <strong>{totalCost === null ? '—' : brl(totalCost)}</strong></span></div>
        {!current?.active && <p className="jewelry-next-step">{current?.collection_id ? <>Coleção definida. Se o custo mudou, revise a <Link href="/admin/precificacao">Precificação</Link>.</> : <>Próxima etapa: <Link href="/admin/colecoes">definir a coleção</Link>. A joia só aparecerá na Precificação depois disso.</>}</p>}
        <button className="botao" type="submit" disabled={saving}>{saving ? 'Salvando...' : current ? 'Salvar alterações' : 'Salvar joia'}</button>
      </form>
      <Feedback message={message}/>
      {lastSaved && <div className="jewelry-save-confirmation" role="status"><Image unoptimized width={96} height={96} src={lastSaved.photoUrl} alt={`Foto de identificação de ${lastSaved.name}`}/><div><strong>Cadastro confirmado · {lastSaved.code}</strong><p>{lastSaved.name} · {lastSaved.model} · {genderLabels[lastSaved.gender]}</p><p>Quantidade: {lastSaved.quantity} · Custo unitário: {brl(lastSaved.unitCostCents)}</p><p>Medidas: {lastSaved.measurements || 'Não informadas'}</p><p>Descrição: {lastSaved.description || 'Não informada'}</p><small>Foto de identificação vinculada e dados conferidos no banco. O formulário já está pronto para outra joia.</small></div></div>}
      {current && !current.active && <div className="jewelry-followup"><button className="management-outline" type="button" onClick={() => void select(null)}>Cadastrar outra joia</button><Link className="management-outline" href="/admin/colecoes">Definir coleções</Link></div>}
    </section></Modal>
    <section className="management-card jewelry-missing-photos"><h2>Joias sem foto de identificação <small>{missingPhotos.length}</small></h2>{loadError ? null : loading ? <p>Verificando fotos...</p> : missingPhotos.length === 0 ? <p>Todas as joias cadastradas têm foto de identificação.</p> : <ul>{missingPhotos.map(item => <li key={item.id}><span><strong>{item.name}</strong><small>{item.registration_code}</small></span><button type="button" className="management-outline" onClick={() => void select(item)}>Adicionar foto</button></li>)}</ul>}</section>
    <section className="management-card jewelry-table-card" aria-labelledby="registered-jewelry-title">
      <div className="jewelry-table-head"><div><h2 id="registered-jewelry-title">Joias cadastradas <small>{items.length}</small></h2><p>Custos e preços desta tabela são visíveis somente na gestão.</p></div><label>Buscar joia<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, código ou coleção"/></label></div>
      <div className="erp-batch-actions"><span>{batchIds.length} joia(s) selecionada(s)</span>{batchIds.length>0&&<Link className="management-outline" href={'/admin/colecoes?selecao='+encodeURIComponent(batchIds.join(','))}>Vincular seleção em Coleções</Link>}<button className="management-outline" type="button" disabled={!batchIds.length} onClick={()=>setBatchIds([])}>Limpar seleção</button><p>A vinculação em lote já existente é confirmada na página Coleções.</p></div><div className="erp-toolbar"><button type="button" className="management-outline" onClick={()=>setPreferences(p=>({...p,query:'',status:'todas',sort:'recentes',page:1}))}>Limpar filtros</button><label>Situação<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="todas">Todas</option><option value="publicadas">Publicadas</option><option value="sem_colecao">Sem coleção</option><option value="sem_preco">Sem preço</option><option value="sem_foto">Sem foto comercial</option></select></label><label>Ordenar<select value={sort} onChange={e=>setSort(e.target.value)}><option value="recentes">Mais recentes</option><option value="nome">Nome</option><option value="quantidade">Maior quantidade</option></select></label><div role="group" aria-label="Visualização das joias"><button type="button" className="management-outline" aria-pressed={view==='tabela'} onClick={()=>setView('tabela')}>Tabela</button><button type="button" className="management-outline" aria-pressed={view==='grade'} onClick={()=>setView('grade')}>Grade</button></div></div>
      {view==='grade' && (loadError ? null : loading ? <Skeleton label="Carregando joias"/> : visible.length===0 ? <EmptyState title="Nenhuma joia nesta seleção"><button type="button" className="management-outline" onClick={()=>setPreferences(p=>({...p,query:'',status:'todas',page:1}))}>Limpar busca e filtros</button><button type="button" className="management-outline" onClick={()=>void select(null)}>Cadastrar joia</button></EmptyState> : <div className="erp-cards">{visible.map(item=><article className="erp-card" key={item.id}><label className="erp-inline-check"><input type="checkbox" checked={batchIds.includes(item.id)} onChange={e=>setBatchIds(ids=>e.target.checked?[...new Set([...ids,item.id])].slice(0,500):ids.filter(id=>id!==item.id))}/>Selecionar {item.name}</label><JewelryThumbnail url={photoUrls[item.jewelry_intake?.identification_image_path??'']} name={item.name} hasPhoto={Boolean(item.jewelry_intake?.identification_image_path)}/><h3>{item.name}</h3><p>{item.registration_code} · {collectionName(item.collection_id)}</p><Workflow collection={Boolean(item.collection_id)} priced={item.workflow_stage!=='aguardando_precificacao'&&item.price_cents>0} published={item.active}/><p>{item.stock} unidade(s)</p><button type="button" className="management-outline" onClick={()=>void select(item)}>Editar</button></article>)}</div>)}
      <div hidden={view!=='tabela'} className={density==='compacta'?'erp-density-compact':''}><div className="erp-toolbar"><label>Densidade<select value={density} onChange={e=>setPreferences(p=>({...p,density:e.target.value}))}><option value="confortavel">Confortável</option><option value="compacta">Compacta</option></select></label><details className="erp-column-config"><summary>Configurar colunas</summary><p>Joia e ações ficam fixas para identificação e operação.</p>{columns.map((id,index)=><div key={id}><label className="erp-inline-check"><input type="checkbox" checked={!hidden.includes(id)} onChange={e=>setPreferences(p=>({...p,hidden:e.target.checked?p.hidden.filter(x=>x!==id):[...p.hidden,id]}))}/>{columnLabels[id]}</label><button type="button" disabled={index===0} aria-label={'Mover '+columnLabels[id]+' para a esquerda'} onClick={()=>moveColumn(id,-1)}>←</button><button type="button" disabled={index===jewelryColumns.length-1} aria-label={'Mover '+columnLabels[id]+' para a direita'} onClick={()=>moveColumn(id,1)}>→</button></div>)}</details></div>{loadError ? null : loading ? <Skeleton label="Carregando joias"/> : visible.length === 0 ? <div>{items.length === 0 ? <EmptyState title="Nenhuma joia cadastrada"><button type="button" className="management-outline" onClick={()=>void select(null)}>Cadastrar joia</button></EmptyState> : <EmptyState title="Nenhuma joia corresponde à busca"><button type="button" className="management-outline" onClick={()=>setPreferences(p=>({...p,query:'',status:'todas',page:1}))}>Limpar busca e filtros</button></EmptyState>}</div> : <div className="jewelry-table-scroll" role="region" aria-label="Joias cadastradas para gestão" tabIndex={0}><table className="jewelry-table"><caption className="sr-only">Joias cadastradas para gestão</caption><thead><tr><th><input type="checkbox" aria-label="Selecionar página atual" checked={visible.length>0&&visible.every(x=>batchIds.includes(x.id))} onChange={e=>setBatchIds(ids=>e.target.checked?[...new Set([...ids,...visible.map(x=>x.id)])].slice(0,500):ids.filter(id=>!visible.some(x=>x.id===id)))}/></th><th>Código / Joia</th>{visibleColumns.map(id=><th key={id}>{columnLabels[id]}</th>)}<th><span className="sr-only">Ações</span></th></tr></thead><tbody>{visible.map(item => {
        const path = item.jewelry_intake?.identification_image_path;
        return <tr key={item.id}><td data-label="Selecionar"><input type="checkbox" aria-label={'Selecionar '+item.name} checked={batchIds.includes(item.id)} onChange={e=>setBatchIds(ids=>e.target.checked?[...new Set([...ids,item.id])].slice(0,500):ids.filter(id=>id!==item.id))}/></td><td data-label="Joia"><div className="jewelry-name-with-photo"><JewelryThumbnail url={path ? photoUrls[path] : undefined} name={item.name} hasPhoto={Boolean(path)}/><span><strong>{item.name}</strong><small>{item.registration_code}</small></span></div></td>{visibleColumns.map(id=><td key={id} data-label={columnLabels[id]}>{cell(item,id)}</td>)}<td data-label="Ações"><div className="jewelry-table-actions"><button type="button" onClick={() => void select(item)}>Editar</button><button type="button" className="jewelry-delete-button" onClick={() => { setDeleteCandidate(item); setDeleteCode(''); }}>Excluir</button></div></td></tr>;
      })}</tbody></table></div>}
    </div><div className="erp-pagination"><span>{filtered.length} joia(s) · Página {effectivePage} de {Math.max(1,Math.ceil(filtered.length/25))}</span><button className="management-outline" type="button" disabled={effectivePage<=1} onClick={()=>setPage(()=>effectivePage-1)}>Anterior</button><button className="management-outline" type="button" disabled={effectivePage*25>=filtered.length} onClick={()=>setPage(()=>effectivePage+1)}>Próxima</button></div></section>
    {deleteCandidate && <Modal open={true} title="Excluir joia?" onClose={()=>{if(!deleting){setDeleteCandidate(null);setDeleteCode('');}}}><p><strong>{deleteCandidate.name}</strong> · {deleteCandidate.registration_code}</p><p>Esta ação remove o cadastro, a precificação e o vínculo com a coleção. {deleteCandidate.active ? 'A peça publicada sairá da loja imediatamente. ' : ''}Joias com histórico de pedidos não podem ser excluídas.</p><form onSubmit={deleteJewelry}><label>Digite <strong>{deleteCandidate.registration_code}</strong> para confirmar<input autoFocus autoComplete="off" value={deleteCode} onChange={event => setDeleteCode(event.target.value)} placeholder={deleteCandidate.registration_code}/></label><div className="jewelry-delete-actions"><button type="button" className="management-outline" disabled={deleting} onClick={() => { setDeleteCandidate(null); setDeleteCode(''); }}>Cancelar</button><button type="submit" className="jewelry-delete-confirm" disabled={deleting || deleteCode.trim() !== deleteCandidate.registration_code}>{deleting ? 'Excluindo...' : 'Excluir definitivamente'}</button></div></form></Modal>}
  </main>;
}
