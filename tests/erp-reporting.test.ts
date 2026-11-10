import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOperationReport, type ReportProduct, type ReportPricing } from '../app/admin/reporting.ts';
import { readJewelryPreferences,writeJewelryPreferences } from '../app/admin/jewelry-preferences.ts';
const product=(id:string,extra:Partial<ReportProduct>={}):ReportProduct=>({id,name:id,stock:3,price_cents:1875,active:false,collection_id:'c',workflow_stage:'aguardando_catalogo',commercial_image_urls:[],jewelry_intake:{acquisition_cost_cents:1000},...extra});
const price=(id:string):ReportPricing=>({product_id:id,approved_price_cents:1875,acquisition_cost_cents:1000,packaging_cost_cents:200,depreciation_cost_cents:50});
test('indicadores reutilizam margem aprovada e totais em centavos',()=>{
 const r=buildOperationReport([product('a'),product('b',{active:true,stock:2})],[price('a'),price('b')],[{id:'c',name:'Coleção'}],1);
 assert.equal(r.units,5);assert.equal(r.acquisitionCost,5000);assert.equal(r.potential,9375);assert.equal(r.meanMarginBps,3333);assert.equal(r.profitable?.profit,3125);assert.equal(r.published,1);assert.equal(r.pending,1);assert.equal(r.zeroSupplies,1);
 assert.deepEqual(r.funnel.map(x=>x.value),[2,2,2,1]);
});
test('não inventa margem para preço pendente, snapshot ausente ou desatualizado',()=>{
 const r=buildOperationReport([product('a',{price_cents:2000}),product('b',{workflow_stage:'aguardando_precificacao'}),product('c',{jewelry_intake:null})],[price('a'),price('b')],[],0);
 assert.equal(r.marginCoverage,0);assert.equal(r.meanMarginBps,null);assert.equal(r.unknownCostUnits,3);assert.equal(r.profitable,null);
});
test('ranking preserva margens negativas e desempate determinístico',()=>{
 const p=price('a');p.approved_price_cents=1000;
 const r=buildOperationReport([product('a',{price_cents:1000})],[p],[{id:'c',name:'C'}],0);
 assert.equal(r.low[0].bps,-2500);assert.equal(r.profitable?.profit,-750);
});
test('preferências sobrevivem ao recarregamento e ignoram parâmetros inválidos',()=>{
 const p=readJewelryPreferences('?q=anel&situacao=sem_foto&ordem=nome&visao=grade&densidade=compacta&pagina=2&colunas=preco,custo&ocultas=genero');
 assert.equal(p.query,'anel');assert.equal(p.columns[0],'preco');assert.equal(p.density,'compacta');
 assert.deepEqual(readJewelryPreferences(writeJewelryPreferences(p)),p);
 const invalid=readJewelryPreferences('?situacao=fraude&pagina=-3&colunas=unknown,preco,preco&ocultas=unknown');
 assert.equal(invalid.status,'todas');assert.equal(invalid.page,1);assert.equal(new Set(invalid.columns).size,8);assert.equal(invalid.hidden.length,0);
});
