'use client';
import type { OperationReport } from './reporting';
import { brl } from '@/lib/products';
function Bar({value,max,tone='brand'}:{value:number;max:number;tone?:'brand'|'focus'}){
 return <span className="erp-report-track" aria-hidden="true"><span style={{width:Math.max(0,Math.min(100,Math.abs(value)/(max||1)*100))+'%',background:tone==='brand'?'var(--erp-brand)':'var(--erp-focus)'}}/></span>;
}
export default function InsightCharts({report}:{report:OperationReport}){
 const groups=report.collections;const max=Math.max(1,...groups.flatMap(x=>[x.cost,x.potential]));
 const marginMax=Math.max(1,...report.low.map(x=>Math.abs(x.bps)),...report.high.map(x=>Math.abs(x.bps)));
 return <div className="erp-report-charts">
 <section className="management-card"><h3>Custo-base × preço por coleção</h3><p>Totais potenciais do estoque com precificação aprovada compatível. Inclui embalagem e depreciação salvas; não representa resultado de vendas.</p><table><caption className="sr-only">Comparação de valores por coleção</caption><thead><tr><th>Coleção</th><th>Custo-base</th><th>Preço potencial</th></tr></thead><tbody>{groups.map(x=><tr key={x.id}><th scope="row">{x.name}<small>{x.coveredUnits} de {x.units} unidades com base de margem</small></th><td>{x.coveredUnits?brl(x.cost):'Sem base'}<Bar value={x.cost} max={max}/></td><td>{x.coveredUnits?brl(x.potential):'Sem base'}<Bar value={x.potential} max={max} tone="focus"/></td></tr>)}</tbody></table></section>
 <section className="management-card"><h3>Distribuição por coleção</h3><p>Unidades disponíveis, não quantidade de fichas.</p><table><caption className="sr-only">Unidades de estoque por coleção</caption><thead><tr><th>Coleção</th><th>Unidades</th></tr></thead><tbody>{groups.map(x=><tr key={x.id}><th scope="row">{x.name}</th><td>{x.units}<Bar value={x.units} max={Math.max(1,...groups.map(c=>c.units))}/></td></tr>)}</tbody></table></section>
 {[{title:'Menores margens por peça',rows:report.low},{title:'Maiores margens por peça',rows:report.high}].map(block=><section className="management-card" key={block.title}><h3>{block.title}</h3><p>Margem unitária aprovada; barras mostram magnitude, valores mantêm o sinal.</p>{block.rows.length?<table><caption className="sr-only">{block.title}</caption><thead><tr><th>Joia</th><th>Margem</th></tr></thead><tbody>{block.rows.map(x=><tr key={x.id}><th scope="row">{x.name}</th><td>{(x.bps/100).toLocaleString('pt-BR',{maximumFractionDigits:2})}%<Bar value={x.bps} max={marginMax}/></td></tr>)}</tbody></table>:<p>Sem precificação compatível para comparar margens.</p>}</section>)}
 <section className="management-card"><h3>Funil do cadastro à publicação</h3><p>Contagens cumulativas de fichas que cumprem os requisitos de cada etapa.</p><ol className="erp-funnel">{report.funnel.map(x=><li key={x.name}><span>{x.name}</span><strong>{x.value}</strong><Bar value={x.value} max={report.funnel[0].value}/></li>)}</ol></section>
 </div>;
}
