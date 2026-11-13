export type Occasion = { key: string; title: string; date: string; kind: 'comercial' | 'personalizada'; note?: string };
export type CustomEvent = { id: string; title: string; occurs_on: string; annual: boolean; notes: string };
export function todayInBrazil(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export function daysBetween(from: string, to: string) {
  if (!validDate(from) || !validDate(to)) throw Error('Data inválida');
  return Math.round((Date.parse(to+'T12:00:00Z') - Date.parse(from+'T12:00:00Z')) / 86400000);
}
function iso(year: number, month: number, day: number) { return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'); }
function nthWeekday(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(Date.UTC(year,month-1,1)).getUTCDay();
  return 1 + (weekday-first+7)%7 + (nth-1)*7;
}
export function commercialCalendar(year: number, custom: CustomEvent[] = []): Occasion[] {
  if (!Number.isInteger(year) || year<2020 || year>2100) throw Error('Ano fora do intervalo');
  const fixed: [string,string,number,number,string?][] = [
    ['ano-novo','Ano Novo',1,1],['mulher','Dia Internacional da Mulher',3,8],
    ['consumidor','Dia do Consumidor',3,15],['noivas','Mês das noivas · início',5,1,'Tema comercial de maio; cadastre a data própria da ação Dia da Noiva.'],
    ['namorados','Dia dos Namorados',6,12],['avos','Dia dos Avós',7,26],
    ['cliente','Dia do Cliente',9,15],['natal','Natal',12,25],['reveillon','Réveillon',12,31]
  ];
  const items: Occasion[] = fixed.map(([key,title,m,d,note])=>({key:key+'-'+year,title,date:iso(year,m,d),kind:'comercial',note}));
  items.push({key:'maes-'+year,title:'Dia das Mães',date:iso(year,5,nthWeekday(year,5,0,2)),kind:'comercial'},
    {key:'pais-'+year,title:'Dia dos Pais',date:iso(year,8,nthWeekday(year,8,0,2)),kind:'comercial'},
    {key:'black-friday-'+year,title:'Black Friday',date:iso(year,11,nthWeekday(year,11,4,4)+1),kind:'comercial'});
  for (const e of custom) {
    if (!validDate(e.occurs_on)) continue;
    if (!e.annual && Number(e.occurs_on.slice(0,4))!==year) continue;
    let date = e.annual ? year + e.occurs_on.slice(4) : e.occurs_on;
    if (!validDate(date) && e.annual && date.endsWith('-02-29')) date = iso(year,2,28);
    if (validDate(date)) items.push({key:e.id+'-'+year,title:e.title,date,kind:'personalizada',note:e.notes});
  }
  return items.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'pt-BR'));
}
export function upcomingReminders(events: Occasion[], today: string) {
  return events.map(event=>({...event,days:daysBetween(today,event.date)}))
    .filter(event=>event.days>=0 && event.days<=30)
    .map(event=>({...event,lead:event.days<=7?7:event.days<=15?15:30}));
}
export function calendarCells(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Mês inválido');
  const [year,m]=month.split('-').map(Number);
  if (year<2020||year>2100) throw Error('Ano inválido');
  const first=new Date(Date.UTC(year,m-1,1)), total=new Date(Date.UTC(year,m,0)).getUTCDate();
  return [...Array.from({length:first.getUTCDay()},()=>null),...Array.from({length:total},(_,i)=>iso(year,m,i+1))];
}
