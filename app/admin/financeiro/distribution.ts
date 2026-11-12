export type PartnerShare = { id: string; shareBps: number };
export type DistributionInput = { month: string; firstMonth: string; profitCents: number; partners: PartnerShare[] };
const TOTAL_BPS = BigInt(10000);
function monthIndex(value: string): number {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))throw new Error('Informe a competência no formato AAAA-MM.');
 const [year,month]=value.split('-').map(Number);
 if(year<1900||year>9999)throw new Error('Ano inválido.');
 return year*12+month-1;
}
/** Pure allocation of an already-established profit; does not determine sales profit or execute payments. */
export function distributeMonthlyProfit(input: DistributionInput) {
 const offset=monthIndex(input.month)-monthIndex(input.firstMonth);
 if(offset<0||offset>=6)throw new Error('Competência fora dos seis meses do plano.');
 if(!Number.isSafeInteger(input.profitCents)||input.profitCents<0)throw new Error('Lucro deve ser não negativo e expresso em centavos inteiros.');
 if(input.partners.length!==3)throw new Error('Configure os três sócios.');
 const ids=new Set<string>();let shares=0;
 for(const p of input.partners){
  if(!p.id.trim()||ids.has(p.id))throw new Error('Identificação dos sócios inválida ou duplicada.');
  if(!Number.isSafeInteger(p.shareBps)||p.shareBps<0||p.shareBps>10000)throw new Error('Participação inválida.');
  ids.add(p.id);shares+=p.shareBps;
 }
 if(shares!==10000)throw new Error('As participações precisam somar exatamente 100%.');
 const profit=BigInt(input.profitCents);
 // The half-cent, if any, remains in the business; money is never represented as a floating point amount.
 const pool=profit*BigInt(5000)/TOTAL_BPS;
 const allocations=input.partners.map(p=>{const weighted=pool*BigInt(p.shareBps);return{id:p.id,shareBps:p.shareBps,cents:weighted/TOTAL_BPS,remainder:weighted%TOTAL_BPS}});
 let residue=pool-allocations.reduce((sum,p)=>sum+p.cents,BigInt(0));
 const ranked=[...allocations].sort((a,b)=>a.remainder===b.remainder?(a.id<b.id?-1:a.id>b.id?1:0):a.remainder>b.remainder?-1:1);
 for(const p of ranked){if(residue===BigInt(0))break;if(p.shareBps>0){p.cents+=BigInt(1);residue-=BigInt(1)}}
 return {month:input.month,monthNumber:offset+1,profitCents:input.profitCents,distributionBps:5000,poolCents:Number(pool),retainedCents:Number(profit-pool),partners:allocations.map(p=>({id:p.id,shareBps:p.shareBps,amountCents:Number(p.cents)}))};
}
