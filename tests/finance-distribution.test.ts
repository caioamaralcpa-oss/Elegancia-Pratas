import test from 'node:test';
import assert from 'node:assert/strict';
import {distributeMonthlyProfit} from '../app/admin/financeiro/distribution.ts';
const input=()=>({month:'2026-11',firstMonth:'2026-11',profitCents:100000,partners:[{id:'fixture-a',shareBps:5000},{id:'fixture-b',shareBps:3000},{id:'fixture-c',shareBps:2000}]});
test('reserva metade do lucro e distribui somente o fundo',()=>{const r=distributeMonthlyProfit(input());assert.equal(r.poolCents,50000);assert.equal(r.retainedCents,50000);assert.deepEqual(r.partners.map(p=>p.amountCents),[25000,15000,10000])});
test('rejeita a soma de 105% sem normalização silenciosa',()=>{const i=input();i.partners.forEach((p,k)=>p.shareBps=[6500,2500,1500][k]);assert.throws(()=>distributeMonthlyProfit(i),/100%/)});
test('competência de seis meses cruza o ano e termina no sexto mês',()=>{const i=input();i.month='2027-04';assert.equal(distributeMonthlyProfit(i).monthNumber,6);i.month='2027-05';assert.throws(()=>distributeMonthlyProfit(i),/seis meses/);i.month='2026-10';assert.throws(()=>distributeMonthlyProfit(i),/seis meses/)});
test('rejeita mês, centavos e identificações inválidos',()=>{for(const month of ['2026-00','2026-13','novembro','2026-1'])assert.throws(()=>distributeMonthlyProfit({...input(),month}));for(const profitCents of [-1,0.1,Infinity,NaN,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>distributeMonthlyProfit({...input(),profitCents}));const i=input();i.partners[1].id=i.partners[0].id;assert.throws(()=>distributeMonthlyProfit(i),/duplicada/)});
test('zero de lucro gera zero de repasse',()=>assert.equal(distributeMonthlyProfit({...input(),profitCents:0}).partners.reduce((n,p)=>n+p.amountCents,0),0));
test('centavos são conservados e não dependem da ordem dos sócios',()=>{for(let profitCents=0;profitCents<1000;profitCents++){const i={...input(),profitCents};const r=distributeMonthlyProfit(i);assert.equal(r.poolCents+r.retainedCents,profitCents);assert.equal(r.partners.reduce((n,p)=>n+p.amountCents,0),r.poolCents);const reversed=distributeMonthlyProfit({...i,partners:[...i.partners].reverse()});assert.deepEqual(Object.fromEntries(r.partners.map(p=>[p.id,p.amountCents])),Object.fromEntries(reversed.partners.map(p=>[p.id,p.amountCents])))}});
test('valores no limite seguro mantêm conservação exata',()=>{const r=distributeMonthlyProfit({...input(),profitCents:Number.MAX_SAFE_INTEGER});assert.equal(BigInt(r.poolCents)+BigInt(r.retainedCents),BigInt(Number.MAX_SAFE_INTEGER));assert.equal(r.partners.reduce((n,p)=>n+BigInt(p.amountCents),BigInt(0)),BigInt(r.poolCents))});

test('regra confirmada: dezembro/2026 a maio/2027, participação 60/25/15',()=>{
 const result=distributeMonthlyProfit({month:'2026-12',firstMonth:'2026-12',profitCents:100000,partners:[{id:'aurizinete',shareBps:6000},{id:'elizabete',shareBps:2500},{id:'caio',shareBps:1500}]});
 assert.deepEqual(result.partners.map(p=>p.amountCents),[30000,12500,7500]);assert.equal(result.poolCents,50000);
 assert.equal(distributeMonthlyProfit({...input(),firstMonth:'2026-12',month:'2027-05'}).monthNumber,6);
 assert.throws(()=>distributeMonthlyProfit({...input(),firstMonth:'2026-12',month:'2027-06'}),/seis meses/);
});
