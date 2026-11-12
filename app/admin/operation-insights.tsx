'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useManagement } from './layout';
import { brl } from '@/lib/products';
import { EmptyState, Skeleton } from './ui/components';
import { buildOperationReport, type ReportProduct, type ReportPricing, type ReportCollection } from './reporting';
const Charts=dynamic(()=>import('./insight-charts'),{loading:()=> <Skeleton label="Carregando gráficos"/>,ssr:false});
type RawProduct=Omit<ReportProduct,'jewelry_intake'>&{jewelry_intake:ReportProduct['jewelry_intake']|NonNullable<ReportProduct['jewelry_intake']>[]};
export default function OperationInsights(){
 const {db}=useManagement();const [report,setReport]=useState<ReturnType<typeof buildOperationReport>|null>(null);const [error,setError]=useState(false);const [revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setError(false);setReport(null);async function read(table:string,fields:string,key='id'){
   const all:unknown[]=[];for(let offset=0;;offset+=500){const r=await db.from(table).select(fields).order(key).range(offset,offset+499);if(r.error)throw r.error;all.push(...(r.data??[]));if((r.data??[]).length<500)break;}return all;
 }async function load(){try{const [raw,pricing,collections,stock]=await Promise.all([
 read('products','id,name,stock,price_cents,active,collection_id,workflow_stage,commercial_image_urls,jewelry_intake(acquisition_cost_cents)'),
 read('product_pricing','product_id,approved_price_cents,acquisition_cost_cents,packaging_cost_cents,depreciation_cost_cents','product_id'),
 read('collections','id,name'),read('stock_items','id,kind,quantity_on_hand')]);
 const products=(raw as RawProduct[]).map(x=>({...x,jewelry_intake:Array.isArray(x.jewelry_intake)?x.jewelry_intake[0]??null:x.jewelry_intake}));
 if(active)setReport(buildOperationReport(products,pricing as ReportPricing[],collections as ReportCollection[],(stock as {kind:string;quantity_on_hand:number}[]).filter(x=>x.kind==='insumo'&&x.quantity_on_hand===0).length));
 }catch{if(active)setError(true);}}void load();return()=>{active=false}},[db,revision]);
 if(error)return <section className="management-card"><h2>Saúde da operação</h2><p role="alert">Não foi possível carregar os indicadores.</p><button type="button" className="management-outline" onClick={()=>setRevision(x=>x+1)}>Tentar novamente</button></section>;
 if(!report)return <section className="erp-operation-placeholder" aria-busy="true" aria-label="Carregando indicadores da operação"><h2>Saúde da operação</h2><div className="erp-insights">{Array.from({length:5},(_,i)=><div className="erp-insight" key={i}><Skeleton label="Carregando indicador"/></div>)}</div><div className="management-card"><Skeleton label="Carregando insights"/></div><div className="erp-report-charts"><div className="management-card"><Skeleton label="Carregando gráficos"/></div><div className="management-card"><Skeleton label="Carregando gráficos"/></div></div></section>;
 if(!report.funnel[0].value)return <EmptyState title="Comece pela primeira joia" href="/admin/joias" action="Cadastrar joia"><p>Os indicadores serão calculados a partir dos cadastros e das precificações existentes.</p></EmptyState>;
 const items=[
 {title:'Joias sem preço',value:report.noPrice,href:'/admin/joias?situacao=sem_preco'},
 {title:'Joias sem foto comercial',value:report.noPhoto,href:'/admin/joias?situacao=sem_foto'},
 {title:'Joias sem coleção',value:report.noCollection,href:'/admin/colecoes'},
 {title:'Insumos com saldo zero',value:report.zeroSupplies,href:'/admin/estoque?area=insumo'},
 ];
 return <section aria-labelledby="operation-title"><h2 id="operation-title">Saúde da operação</h2><div className="erp-insights">
 {[
 ['Total de peças',report.units.toLocaleString('pt-BR'),'Unidades disponíveis; fichas: '+report.funnel[0].value],
 ['Estoque ao custo de aquisição',brl(report.acquisitionCost),report.unknownCostUnits?report.unknownCostUnits+' unidade(s) sem custo: excluídas do total':'Quantidade atual × aquisição cadastrada'],
 ['Valor potencial de venda',brl(report.potential),'Somente unidades precificadas; não é receita realizada'],
 ['Margem média por ficha',report.meanMarginBps===null?'Sem base':(report.meanMarginBps/100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%',report.marginCoverage+' ficha(s) com snapshot compatível; média simples'],
 ['Publicadas × pendentes',report.published+' / '+report.pending,'Contagem de fichas comerciais'],
 ].map(([title,value,note])=><article className="erp-insight" key={title}><span>{title}</span><strong>{value}</strong><span>{note}</span></article>)}</div>
 <section className="management-card erp-actions-panel" aria-labelledby="operation-actions-title"><header className="erp-actions-panel-heading"><div><h3 id="operation-actions-title">Insights e próximas ações</h3><p>Confira as pendências e acesse a etapa para resolvê-las.</p></div></header><ul className="erp-action-grid">{items.map(x=><li key={x.title}><Link className="erp-action-card" href={x.href} data-pending={x.value>0}><span className="erp-action-card-heading"><span className="erp-action-symbol" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={x.value>0?'M12 8v5m0 3h.01M12 3 2 21h20L12 3Z':'m5 12 4 4L19 6'}/></svg></span><span className="erp-action-state">{x.value>0?'Revisar':'Sem ocorrências'}</span></span><span className="erp-action-value">{x.value.toLocaleString('pt-BR')}</span><span className="erp-action-label">{x.title}</span><span className="erp-action-link">{x.value>0?'Ver pendências':'Consultar'}<span aria-hidden="true">→</span></span></Link></li>)}</ul>{(report.low[0]||report.profitable)&&<div className="erp-review-highlights">{report.low[0]&&<Link className="erp-review-highlight" href={'/admin/precificacao?produto='+encodeURIComponent(report.low[0].id)}><span className="erp-review-highlight-label">Menor margem</span><strong>{(report.low[0].bps/100).toLocaleString('pt-BR')}%</strong><span className="erp-review-highlight-name">{report.low[0].name}</span><span className="erp-action-link">Revisar precificação<span aria-hidden="true">→</span></span></Link>}{report.profitable&&<Link className="erp-review-highlight" href={'/admin/colecoes?colecao='+encodeURIComponent(report.profitable.id)}><span className="erp-review-highlight-label">Maior lucro potencial coberto</span><strong>{brl(report.profitable.profit)}</strong><span className="erp-review-highlight-name">{report.profitable.name}</span><span className="erp-action-link">Ver coleção<span aria-hidden="true">→</span></span></Link>}</div>}<p className="erp-actions-method">Margens usam os custos aprovados, incluindo embalagem e depreciação salvas. Fichas sem snapshot compatível ficam fora das comparações. Lucro potencial não comprova vendas ou rentabilidade realizada.</p></section>
 <Charts report={report}/>
 </section>;
}
