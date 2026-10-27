'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useManagement } from './layout';

const steps = [
  { href: '/admin/joias', number: '01', title: 'Joias', description: 'Cadastre a peça, o custo unitário, a quantidade e a foto de identificação.', available: true },
  { href: '/admin/estoque', number: '02', title: 'Estoque', description: 'Embalagens, modelos de venda local ou envio e insumos da operação.', available: true },
  { href: '/admin/precificacao', number: '03', title: 'Precificação', description: 'Calcule custos, preço final e margem de cada joia.', available: false },
  { href: '/admin/catalogo', number: '04', title: 'Catálogo', description: 'Revise os dados comerciais e publique somente peças completas.', available: false },
];

export default function ManagementHome() {
  const { db } = useManagement();
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');

  async function setPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 12) { setMessage('Use uma senha com pelo menos 12 caracteres.'); return; }
    if (newPassword !== confirmation) { setMessage('As senhas não coincidem.'); return; }
    const { error } = await db.auth.updateUser({ password: newPassword });
    if (error) { setMessage('Não foi possível definir a senha. Tente novamente.'); return; }
    setNewPassword(''); setConfirmation(''); setMessage('Senha definida para os próximos acessos.');
  }

  return <main className="management-page"><p className="eyebrow">PAINEL PRIVADO</p><h1>Gestão da loja</h1><p className="management-intro">Uma ficha para cada joia, concluída em etapas. Nada é publicado automaticamente.</p><div className="management-step-grid">{steps.map(step => <Link href={step.href} className="management-step" key={step.number}><span>{step.number} / {step.available ? 'DISPONÍVEL' : 'PRÓXIMA ETAPA'}</span><h2>{step.title}</h2><p>{step.description}</p><strong>Abrir seção ↗</strong></Link>)}</div><section className="management-card management-password"><h2>Senha da conta</h2><p>Se você entrou por um convite, defina aqui a senha dos próximos acessos. Ela nunca é enviada para nossa equipe.</p><form onSubmit={setPassword}><label>Nova senha<input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={event => setNewPassword(event.target.value)}/></label><label>Confirme a senha<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label><button className="botao" type="submit">Definir senha</button></form><p role="status">{message}</p></section></main>;
}
