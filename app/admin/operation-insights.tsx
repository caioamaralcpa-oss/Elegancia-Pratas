'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useManagement } from './layout';
import { brl } from '@/lib/products';
import { Skeleton } from './ui/components';
type Row={id:string;stock:number;price_cents:number;active:boolean;collection_id:string|null;workflow_stage:string;commercial_image_urls:string[];jewelry_intake:{acquisition_cost_cents:number}|null};
export default function OperationInsights(){
 const {db}=useManagement();const [rows,setRows]=useState<Row[]|null>(null);const [error,setError]=useState(false);
 useEffect(()=>{let active=true;void db.from('products').select('id,stock,price_cents,active,collection_id,workflow_stage,commercial_image_urls,jewelry_intake(acquisition_cost_cents)').then(({data,error})=>{if(!active)return;if(error){setError(true);return;}setRows((data??[]).map(x=>({...x,jewelry_intake:Array.isArray(x.jewelry_intake)?x.jewelry_intake[0]??null:x.jewelry_intake})) as Row[]);});return()=>{active=false}},[db]);
 if(error)return <section className="management-card"><h2>Saúde da operação</h2><p role="status">Não foi possível carregar as pendências. Atualize a página para tentar novamente.</p></section>;
 if(!rows)return <Skeleton label="Carregando pendências da operação"/>;
 const noCollection=rows.filter(x=>!x.collection_id).length;const noPrice=rows.filter(x=>x.workflow_stage==='aguardando_precificacao'||x.price_cents<=0).length;const noPhoto=rows.filter(x=>!x.commercial_image_urls?.length).length;
 const cost=rows.reduce((s,x)=>s+(x.jewelry_intake?.acquisition_cost_cents??0)*x.stock,0);const potential=rows.filter(x=>x.price_cents>0&&x.workflow_stage!=='aguardando_precificacao').reduce((s,x)=>s+x.stock*x.price_cents,0);
 return <section aria-labelledby="operation-title"><h2 id="operation-title">Saúde da operação</h2><div className="erp-insights"><article className="erp-insight"><span>Estoque ao custo de aquisição</span><strong>{brl(cost)}</strong><span>Quantidade atual × custo unitário cadastrado</span></article><article className="erp-insight"><span>Valor potencial das peças precificadas</span><strong>{brl(potential)}</strong><span>Não representa receita realizada</span></article><article className="erp-insight"><span>Publicadas / cadastradas</span><strong>{rows.filter(x=>x.active).length} / {rows.length}</strong><span>Disponibilidade comercial atual</span></article></div><div className="erp-insights">{[{n:noCollection,t:'Joias sem coleção',href:'/admin/colecoes'},{n:noPrice,t:'Joias aguardando preço',href:'/admin/precificacao'},{n:noPhoto,t:'Joias sem foto comercial',href:'/admin/catalogo'}].map(x=><Link className="erp-insight" href={x.href} key={x.href}><span>{x.t}</span><strong>{x.n}</strong><span>Revisar pendências →</span></Link>)}</div></section>;
}
