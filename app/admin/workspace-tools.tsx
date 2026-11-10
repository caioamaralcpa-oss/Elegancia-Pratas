'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Modal } from './ui/components';
const destinations = [
  {href:'/admin',label:'Visão geral'}, {href:'/admin/joias',label:'Joias'}, {href:'/admin/colecoes',label:'Coleções'},
  {href:'/admin/estoque',label:'Estoque'}, {href:'/admin/precificacao',label:'Precificação'}, {href:'/admin/catalogo',label:'Catálogo'}, {href:'/admin/integracoes',label:'Integrações'},
];
export default function WorkspaceTools({ db }: { db: SupabaseClient }) {
  const [open,setOpen]=useState(false); const [query,setQuery]=useState(''); const [results,setResults]=useState<{id:string;name:string;kind:string}[]>([]); const [status,setStatus]=useState('');
  useEffect(()=>{ const key=(event:KeyboardEvent)=>{ if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setOpen(value=>!value);} }; document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key); },[]);
  useEffect(()=>{ let active=true; if(!open||query.trim().length<2){setResults([]);setStatus('');return;} setStatus('Buscando…');const timer=setTimeout(async()=>{ const term=query.trim().replace(/[%_\\]/g,'').slice(0,100);const [j,c]=await Promise.all([db.from('products').select('id,name').ilike('name','%'+term+'%').limit(8),db.from('collections').select('id,name').ilike('name','%'+term+'%').limit(8)]);if(!active)return;if(j.error||c.error){setResults([]);setStatus('Não foi possível pesquisar. Tente novamente.');return;}const rows=[...(j.data??[]).map(x=>({...x,kind:'Joia'})),...(c.data??[]).map(x=>({...x,kind:'Coleção'}))];setResults(rows);setStatus(rows.length?'':'Nenhum cadastro encontrado.');},300);return()=>{active=false;clearTimeout(timer);}; },[db,query,open]);
  return <><button type="button" className="erp-search" onClick={()=>setOpen(true)} aria-label="Buscar e navegar, Control ou Command K">Buscar no sistema <kbd>⌘ / Ctrl K</kbd></button><div className="erp-quick-actions"><Link href="/admin/joias#jewelry-editor">+ Nova joia</Link><Link href="/admin/colecoes#collection-editor">+ Nova coleção</Link></div><Modal open={open} onClose={()=>setOpen(false)} title="Buscar e navegar"><label>Buscar joia, coleção ou página<input autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite pelo menos 2 letras para buscar cadastros"/></label><div className="erp-command-results">{destinations.filter(x=>x.label.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).map(x=><Link onClick={()=>setOpen(false)} key={x.href} href={x.href}>{x.label}<small>Página</small></Link>)}{results.map(x=><Link onClick={()=>setOpen(false)} key={x.kind+x.id} href={(x.kind==='Joia'?'/admin/joias?q='+encodeURIComponent(x.name):'/admin/colecoes?colecao='+encodeURIComponent(x.id))}>{x.name}<small>{x.kind}</small></Link>)}<p role="status">{status}</p></div></Modal></>;
}
