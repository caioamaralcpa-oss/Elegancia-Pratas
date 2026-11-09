'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useManagement } from '../layout';
import { brl } from '@/lib/products';
import './financeiro.css';

type Entry = { id: string; direction: 'entrada' | 'saida'; description: string; category: string; amount_cents: number; movement_date: string; status: 'previsto' | 'realizado' | 'cancelado'; cancellation_reason: string | null; planned_date: string | null; channel: string | null };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const blank = () => ({ id: crypto.randomUUID(), direction: 'entrada', description: '', category: '', amount: '', movement_date: today(), status: 'realizado', channel: '' });

export default function Financeiro() {
  const { db } = useManagement();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [draft, setDraft] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const [settling, setSettling] = useState<string | null>(null);
  const [settledDate, setSettledDate] = useState(today);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setEntries(null);
    const [year, m] = month.split('-').map(Number);
    const end = `${m === 12 ? year + 1 : year}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`;
    const all: Entry[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from('finance_entries').select('id,direction,description,category,amount_cents,movement_date,planned_date,status,cancellation_reason,channel').gte('movement_date', `${month}-01`).lt('movement_date', end).order('movement_date', { ascending: false }).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (request !== requestId.current) return;
      if (error) { setMessage('Não foi possível carregar os lançamentos. Confira a conexão e sua sessão.'); return; }
      all.push(...(data as Entry[]));
      if (data.length < 500) break;
    }
    if (request === requestId.current) { setEntries(all); setMessage(''); }
  }, [db, month]);
  useEffect(() => { void load(); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(draft.amount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) { setMessage('Informe um valor válido, maior que zero e com até duas casas decimais.'); return; }
    setBusy(true); setMessage('');
    const { error } = await db.from('finance_entries').insert({ id: draft.id, planned_date: draft.status === 'previsto' ? draft.movement_date : null, direction: draft.direction, description: draft.description.trim(), category: draft.category.trim(), amount_cents: Math.round(amount * 100), movement_date: draft.movement_date, status: draft.status, channel: draft.channel || null });
    setBusy(false);
    if (error) { setMessage('Não foi possível salvar. Confira os dados e sua sessão.'); return; }
    setDraft(blank()); setOpen(false);
    if (draft.movement_date.slice(0, 7) !== month) setMonth(draft.movement_date.slice(0, 7)); else await load();
  }
  async function settle(id: string) {
    if (!settledDate || busy) return;
    setBusy(true); setMessage('');
    const { data, error } = await db.from('finance_entries').update({ status: 'realizado', movement_date: settledDate }).eq('id', id).eq('status', 'previsto').select('id');
    setBusy(false);
    if (error || !data?.length) { setMessage('Não foi possível confirmar o lançamento. Atualize a página e tente novamente.'); return; }
    setSettling(null); await load();
  }
  async function cancelEntry(entry: Entry) {
    const reason = window.prompt('Informe o motivo do cancelamento (mínimo de 3 caracteres):');
    if (reason === null) return;
    if (reason.trim().length < 3 || reason.trim().length > 500) { setMessage('Informe um motivo entre 3 e 500 caracteres.'); return; }
    setBusy(true); setMessage('');
    const { data, error } = await db.from('finance_entries').update({ status: 'cancelado', cancellation_reason: reason.trim() }).eq('id', entry.id).eq('status', entry.status).select('id');
    setBusy(false);
    if (error || !data?.length) { setMessage('Não foi possível cancelar. Atualize e tente novamente.'); return; }
    await load();
  }
  const sum = (direction: Entry['direction'], status: Entry['status']) => (entries ?? []).filter(e => e.direction === direction && e.status === status).reduce((total, e) => total + e.amount_cents, 0);
  const income = sum('entrada', 'realizado'); const expenses = sum('saida', 'realizado');
  return <main className="management-page"><p className="eyebrow">GESTÃO FINANCEIRA</p><div className="finance-heading"><div><h1>Financeiro</h1><p className="management-intro">Acompanhe entradas e saídas por mês e registre movimentos previstos e realizados.</p></div><button className="botao" type="button" onClick={() => { setOpen(!open); setMessage(''); }}>{open ? 'Fechar' : 'Novo lançamento'}</button></div>
    <div className="finance-period"><label>Mês de referência<input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)}/></label></div>
    <section className="management-metrics" aria-label="Resumo do período"><div className="management-metric"><span>Entradas realizadas</span><strong>{entries ? brl(income) : '—'}</strong></div><div className="management-metric"><span>Saídas realizadas</span><strong>{entries ? brl(expenses) : '—'}</strong></div><div className="management-metric"><span>Resultado do mês</span><strong>{entries ? brl(income - expenses) : '—'}</strong><small>Entradas menos saídas; não inclui saldo anterior</small></div></section>
    <p className="finance-note">Valores previstos não entram no resultado. Lance vendas presenciais e do site quando o recebimento for confirmado. Estes registros não alteram estoque ou pedidos. Para corrigir um lançamento, cancele-o com o motivo e registre outro.</p>
    {open && <form className="management-card finance-form" onSubmit={save}><h2>Novo lançamento</h2><div className="finance-form-grid"><label>Tipo<select value={draft.direction} onChange={e => setDraft({ ...draft, direction: e.target.value })}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Descrição<input required maxLength={160} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label><label>Categoria<input required maxLength={80} placeholder="Ex.: vendas, embalagem, frete" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/></label><label>Valor em reais<input required type="number" min="0.01" max="10000000" step="0.01" value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })}/></label><label>Data<input required type="date" value={draft.movement_date} onChange={e => setDraft({ ...draft, movement_date: e.target.value })}/></label><label>Situação<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option value="realizado">Realizado</option><option value="previsto">Previsto</option></select></label><label>Origem ou canal<select value={draft.channel} onChange={e => setDraft({ ...draft, channel: e.target.value })}><option value="">Não informado</option><option value="site">Site</option><option value="presencial">Presencial</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="outro">Outro</option></select></label></div><button disabled={busy} className="botao" type="submit">{busy ? 'Salvando…' : 'Salvar lançamento'}</button></form>}
    {message && <p role="alert" className="management-status">{message}</p>}
    <section className="management-card finance-list"><h2>Movimentações</h2><p>Previsto: {entries ? `${brl(sum('entrada', 'previsto'))} a receber · ${brl(sum('saida', 'previsto'))} a pagar` : '—'}</p>{entries === null ? <p>{message || 'Carregando movimentações…'}</p> : entries.length === 0 ? <p>Nenhum lançamento neste mês.</p> : <div className="finance-table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Canal</th><th>Situação</th><th>Valor</th><th>Ação</th></tr></thead><tbody>{entries.map(e => <tr key={e.id}><td>{e.movement_date.split('-').reverse().join('/')}</td><td>{e.description}</td><td>{e.category}</td><td>{e.channel || '—'}</td><td>{e.status === 'realizado' ? 'Realizado' : e.status === 'cancelado' ? `Cancelado: ${e.cancellation_reason}` : 'Previsto'}{e.planned_date && e.planned_date !== e.movement_date && <small> · Previsto para {e.planned_date.split('-').reverse().join('/')}</small>}</td><td className={e.direction === 'entrada' ? 'finance-in' : 'finance-out'}>{e.direction === 'entrada' ? '+' : '−'} {brl(e.amount_cents)}</td><td>{e.status === 'previsto' && (settling === e.id ? <div><label>Data efetiva<input type="date" value={settledDate} onChange={event => setSettledDate(event.target.value)}/></label><button type="button" disabled={busy || !settledDate} onClick={() => void settle(e.id)}>Confirmar</button><button type="button" onClick={() => setSettling(null)}>Cancelar</button></div> : <button type="button" onClick={() => { setSettledDate(today()); setSettling(e.id); }}>Marcar realizado</button>)}</td></tr>)}</tbody></table></div>}</section>
  </main>;
}
