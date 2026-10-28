'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { brl } from '@/lib/products';
import { useManagement } from './layout';

const steps = [
  { href: '/admin/joias', number: '01', title: 'Joias', description: 'Cadastre a peça, o custo unitário, a quantidade e a foto de identificação.', available: true },
  { href: '/admin/estoque', number: '02', title: 'Estoque', description: 'Embalagens, modelos de venda local ou envio e insumos da operação.', available: true },
  { href: '/admin/precificacao', number: '03', title: 'Precificação', description: 'Some o custo da peça ao lucro desejado e defina o preço de venda.', available: true },
  { href: '/admin/catalogo', number: '04', title: 'Catálogo', description: 'Revise os dados comerciais e publique somente peças completas.', available: true },
  { href: '/admin/integracoes', number: '05', title: 'Integrações', description: 'Conecte o Melhor Envio no ambiente de testes.', available: true },
];

export default function ManagementHome() {
  const { db } = useManagement();
  const [products, setProducts] = useState<{ id: string; name: string; registration_code: string; stock: number; price_cents: number; workflow_stage: string }[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void db.from('products').select('id,name,registration_code,stock,price_cents,workflow_stage').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) setLoadError(true);
      else setProducts(data ?? []);
    });
    return () => { active = false; };
  }, [db]);

  async function setPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 12) { setMessage('Use uma senha com pelo menos 12 caracteres.'); return; }
    if (newPassword !== confirmation) { setMessage('As senhas não coincidem.'); return; }
    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) { setMessage('Não foi possível definir a senha. Tente novamente.'); return; }
    setNewPassword(''); setConfirmation(''); setMessage('Senha definida para os próximos acessos.');
  }

  return <main className="management-page"><p className="eyebrow">PAINEL PRIVADO</p><h1>Visão geral</h1><p className="management-intro">Acompanhe suas joias e continue cada cadastro de onde parou. Nada é publicado automaticamente.</p>
    {loadError && <p className="management-status" role="status">Não foi possível carregar o resumo. Confira sua sessão.</p>}
    <section className="management-metrics" aria-label="Resumo das joias"><div className="management-metric"><span>Joias cadastradas</span><strong>{products ? products.length : '—'}</strong><small>Total de fichas</small></div><div className="management-metric"><span>Aguardando preço</span><strong>{products ? products.filter(item => item.workflow_stage === 'aguardando_precificacao').length : '—'}</strong><small>Concluir na precificação</small></div><div className="management-metric"><span>Unidades em estoque</span><strong>{products ? products.reduce((sum, item) => sum + item.stock, 0) : '—'}</strong><small>Soma das quantidades cadastradas</small></div></section>
    <div className="management-step-grid">{steps.map(step => <Link href={step.href} className="management-step" key={step.number}><span>{step.number} / {step.available ? 'DISPONÍVEL' : 'PRÓXIMA ETAPA'}</span><h2>{step.title}</h2><p>{step.description}</p><strong>Abrir seção ↗</strong></Link>)}</div>
    <section className="management-card management-recent"><div className="management-recent-header"><h2>Joias recentes</h2><Link href="/admin/joias">Ver todas ↗</Link></div>{products?.length ? <div className="management-recent-list">{products.slice(0, 5).map(item => <div className="management-recent-row" key={item.id}><strong>{item.name}</strong><small>{item.registration_code}</small><small>{item.stock} un.</small><span>{item.workflow_stage === 'aguardando_precificacao' ? 'Preço pendente' : brl(item.price_cents)}</span></div>)}</div> : <p>{products ? 'Nenhuma joia cadastrada ainda.' : 'Carregando joias...'}</p>}</section>
    <section className="management-card management-password"><h2>Senha da conta</h2><p>Se você entrou por um convite, defina aqui a senha dos próximos acessos. Ela nunca é enviada para nossa equipe.</p><form onSubmit={setPassword}><label>Nova senha<input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={event => setNewPassword(event.target.value)}/></label><label>Confirme a senha<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label><button className="botao" type="submit">Definir senha</button></form><p role="status">{message}</p></section></main>;
}
