'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import './management.css';
import './queue.css';
import './jewelry-table.css';
import './inventory.css';
import './pricing-workflow.css';
import './catalogo/catalog.css';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;
const ManagementContext = createContext<{ db: SupabaseClient } | null>(null);

export function useManagement() {
  const value = useContext(ManagementContext);
  if (!value) throw new Error('Acesso administrativo não disponível');
  return value;
}

const sections = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/joias', label: 'Joias' },
  { href: '/admin/estoque', label: 'Estoque' },
  { href: '/admin/precificacao', label: 'Precificação' },
  { href: '/admin/catalogo', label: 'Catálogo' },
  { href: '/admin/integracoes', label: 'Integrações' },
];

export default function ManagementLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<'loading' | 'login' | 'mfa' | 'ready'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const continueSignIn = useCallback(async () => {
    if (!db) return;
    const { data: { user } } = await db.auth.getUser();
    if (!user) { setState('login'); return; }
    const { data: assurance } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== 'aal2') {
      setState('mfa');
      const { data: factors } = await db.auth.mfa.listFactors();
      const verified = factors?.totp?.find(f => f.status === 'verified');
      if (verified) { setFactorId(verified.id); return; }
      const { data, error } = await db.auth.mfa.enroll({ factorType: 'totp' });
      if (error || !data) { setMessage('Não foi possível iniciar a verificação em duas etapas.'); return; }
      setFactorId(data.id); setQrCode(data.totp.qr_code); return;
    }
    const { data: role } = await db.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
    if (role?.role !== 'administrador') {
      await db.auth.signOut(); setState('login'); setMessage('Esta conta não tem acesso ao sistema de gestão.'); return;
    }
    setMessage(''); setState('ready');
  }, []);

  useEffect(() => {
    let active = true;
    async function check() {
      if (!db) { if (active) setState('login'); return; }
      await continueSignIn();
    }
    void check();
    return () => { active = false; };
  }, [continueSignIn]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) { setMessage('Não foi possível entrar. Confira suas credenciais.'); return; }
    setPassword(''); await continueSignIn();
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !factorId || !/^\d{6}$/.test(code)) return;
    const { data: challenge, error: challengeError } = await db.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) { setMessage('Não foi possível verificar o código.'); return; }
    const { error } = await db.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) { setMessage('Código inválido ou expirado.'); return; }
    setCode(''); setQrCode(''); await continueSignIn();
  }

  return <div className="management-shell">
    {state === 'loading' && <main className="management-auth"><p>Verificando acesso...</p></main>}
    {state === 'login' && <main className="management-auth"><p className="eyebrow">ÁREA RESTRITA</p><h1>Gestão Elegância</h1><p>Somente administradores autorizados podem acessar os dados da loja.</p>{db ? <form onSubmit={signIn}><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)}/></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}/></label><button className="botao" type="submit">Entrar</button></form> : <p>Configuração do Supabase indisponível.</p>}<p role="status">{message}</p></main>}
    {state === 'mfa' && <main className="management-auth"><p className="eyebrow">ÁREA RESTRITA</p><h1>Verificação em duas etapas</h1>{qrCode && <><p>Escaneie o código no aplicativo autenticador.</p><img src={qrCode} alt="Código de configuração do autenticador" width="180" height="180"/></>}<form onSubmit={verifyMfa}><label>Código de seis dígitos<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required value={code} onChange={event => setCode(event.target.value)}/></label><button className="botao" type="submit">Verificar</button></form><p role="status">{message}</p></main>}
    {state === 'ready' && db && <ManagementContext.Provider value={{ db }}><div className="management-layout"><aside className="management-sidebar"><Link className="management-brand" href="/admin">ELEGÂNCIA <span>GESTÃO</span></Link><nav aria-label="Seções da gestão">{sections.map(section => <Link key={section.href} href={section.href} aria-current={pathname === section.href ? 'page' : undefined}>{section.label}</Link>)}</nav><button type="button" onClick={async () => { await db.auth.signOut(); setState('login'); }}>Sair</button><Link className="management-store-link" href="/">Ver loja ↗</Link></aside><div className="management-main">{children}</div></div></ManagementContext.Provider>}
  </div>;
}
