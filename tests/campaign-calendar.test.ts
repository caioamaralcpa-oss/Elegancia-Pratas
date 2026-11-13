import test from 'node:test';
import assert from 'node:assert/strict';
import {commercialCalendar,daysBetween,calendarCells,upcomingReminders,todayInBrazil,validDate} from '../app/admin/colecoes/campanhas/calendar.ts';
test('datas móveis e Black Friday após quarta quinta-feira',()=>{
 const event=(y:number,k:string)=>commercialCalendar(y).find(e=>e.key===k+'-'+y)!.date;
 assert.equal(event(2026,'maes'),'2026-05-10');assert.equal(event(2027,'maes'),'2027-05-09');
 assert.equal(event(2026,'pais'),'2026-08-09');assert.equal(event(2026,'black-friday'),'2026-11-27');
 assert.equal(event(2024,'black-friday'),'2024-11-29');assert.equal(event(2027,'black-friday'),'2027-11-26');
});
test('lembretes atravessam ano e mantêm limites de 30,15,7 dias',()=>{
 const dates=[...commercialCalendar(2026),...commercialCalendar(2027)];
 const r=upcomingReminders(dates,'2026-12-20');
 assert.ok(r.some(e=>e.key==='ano-novo-2027'&&e.days===12&&e.lead===15));
 assert.ok(r.some(e=>e.key==='natal-2026'&&e.days===5&&e.lead===7));
 assert.ok(r.every(e=>e.days>=0&&e.days<=30));
 assert.equal(upcomingReminders(commercialCalendar(2026),'2026-11-25').find(e=>e.key==='natal-2026')?.days,30);
});
test('datas inválidas e posição do calendário',()=>{
 assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true);
 assert.throws(()=>daysBetween('inválida','2026-01-01'));
 assert.throws(()=>calendarCells('2026-13'));assert.throws(()=>commercialCalendar(2101));
 assert.equal(calendarCells('2026-11')[0],'2026-11-01');
});
test('evento anual e 29 de fevereiro em ano comum',()=>{
 const own=[{id:'fixture',title:'Ação da loja',occurs_on:'2028-02-29',annual:true,notes:''}];
 assert.equal(commercialCalendar(2029,own).find(e=>e.kind==='personalizada')?.date,'2029-02-28');
 own[0].annual=false;assert.equal(commercialCalendar(2029,own).filter(e=>e.kind==='personalizada').length,0);
});
test('hoje é calculado em São Paulo',()=>{
 assert.equal(todayInBrazil(new Date('2026-11-14T01:30:00Z')),'2026-11-13');
 assert.equal(daysBetween('2026-12-31','2027-01-01'),1);
});
