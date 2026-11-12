import { calculateWorkflowQuote } from '../../lib/pricing-workflow.ts';

export type ReportProduct = {
 id:string; name:string; stock:number; price_cents:number; active:boolean; collection_id:string|null;
 workflow_stage:string; commercial_image_urls:string[];
 jewelry_intake:{acquisition_cost_cents:number}|null;
};
export type ReportPricing = {product_id:string;approved_price_cents:number;acquisition_cost_cents:number;packaging_cost_cents:number;depreciation_cost_cents:number};
export type ReportCollection = {id:string;name:string};
export function buildOperationReport(products:ReportProduct[],pricing:ReportPricing[],collections:ReportCollection[],zeroSupplies:number){
 const saved=new Map(pricing.map(p=>[p.product_id,p]));
 const groups=new Map<string,{id:string;name:string;units:number;cost:number;potential:number;profit:number;coveredUnits:number}>();
 for(const c of [...collections,{id:'unassigned',name:'Sem coleção'}])groups.set(c.id,{...c,units:0,cost:0,potential:0,profit:0,coveredUnits:0});
 const margins:{id:string;name:string;bps:number;profit:number;price:number}[]=[];
 let units=0,acquisitionCost=0,unknownCostUnits=0,potential=0,pricedCount=0;
 for(const p of products){
   units+=p.stock;
   if(p.jewelry_intake)acquisitionCost+=p.stock*p.jewelry_intake.acquisition_cost_cents;else unknownCostUnits+=p.stock;
   const key=p.collection_id??'unassigned';
   if(!groups.has(key))groups.set(key,{id:key,name:'Coleção indisponível',units:0,cost:0,potential:0,profit:0,coveredUnits:0});
   const group=groups.get(key)!;group.units+=p.stock;
   const priced=p.workflow_stage!=='aguardando_precificacao'&&p.price_cents>0;
   if(priced){potential+=p.stock*p.price_cents;pricedCount++;}
   const s=saved.get(p.id);
   if(!priced||!s||s.approved_price_cents!==p.price_cents)continue;
   try{
     const q=calculateWorkflowQuote({acquisitionCostCents:s.acquisition_cost_cents,packagingCostCents:s.packaging_cost_cents,depreciationCostCents:s.depreciation_cost_cents,targetMarginBps:0,manualPriceCents:s.approved_price_cents});
     margins.push({id:p.id,name:p.name,bps:q.estimatedMarginBps,profit:q.profitCents,price:q.priceCents});
     group.cost+=p.stock*q.fixedCostCents;group.potential+=p.stock*q.priceCents;group.profit+=p.stock*q.profitCents;group.coveredUnits+=p.stock;
   }catch{/* Incomplete or invalid saved pricing is excluded, never assumed to be zero. */}
 }
 const ordered=[...margins].sort((a,b)=>a.bps-b.bps||a.id.localeCompare(b.id));
 const collectionRows=[...groups.values()].filter(x=>x.units>0).sort((a,b)=>b.units-a.units||a.id.localeCompare(b.id));
 const profitable=collectionRows.filter(x=>x.id!=='unassigned'&&x.coveredUnits>0).sort((a,b)=>b.profit-a.profit||a.id.localeCompare(b.id))[0]??null;
 const noCollection=products.filter(p=>!p.collection_id).length;
 const noPrice=products.filter(p=>p.workflow_stage==='aguardando_precificacao'||p.price_cents<=0).length;
 const noPhoto=products.filter(p=>!p.commercial_image_urls?.length).length;
 const published=products.filter(p=>p.active).length;
 return {units,acquisitionCost,unknownCostUnits,potential,pricedCount,published,pending:products.length-published,
   meanMarginBps:margins.length?margins.reduce((s,p)=>s+p.bps,0)/margins.length:null,marginCoverage:margins.length,
   low:ordered.slice(0,5),high:[...ordered].reverse().slice(0,5),collections:collectionRows,profitable,
   noCollection,noPrice,noPhoto,zeroSupplies,
   funnel:[{name:'Cadastrada',value:products.length},{name:'Em coleção',value:products.filter(p=>p.collection_id).length},{name:'Precificada',value:products.filter(p=>p.collection_id&&p.workflow_stage!=='aguardando_precificacao'&&p.price_cents>0).length},{name:'Publicada',value:products.filter(p=>p.active&&p.collection_id&&p.price_cents>0&&p.workflow_stage!=='aguardando_precificacao').length}]};
}
export type OperationReport=ReturnType<typeof buildOperationReport>;
