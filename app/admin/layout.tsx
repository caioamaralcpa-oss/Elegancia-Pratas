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
  { href: '/admin', label: 'Visão geral', icon: 'home' },
  { href: '/admin/joias', label: 'Joias', icon: 'gem' },
  { href: '/admin/estoque', label: 'Estoque', icon: 'box' },
  { href: '/admin/precificacao', label: 'Precificação', icon: 'tag' },
  { href: '/admin/catalogo', label: 'Catálogo', icon: 'grid' },
  { href: '/admin/integracoes', label: 'Integrações', icon: 'link' },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/></>,
    gem: <><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M6 3l3 6 3 12 3-12 3-6"/></>,
    box: <><path d="m3 7 9-4 9 4v10l-9 4-9-4z"/><path d="m3 7 9 4 9-4M12 11v10"/></>,
    tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2"/><path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2"/></>,
    logout: <><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M15 7l5 5-5 5M20 12H9"/></>,
    store: <><path d="M3 9h18l-2-5H5zM4 9v11h16V9M9 20v-7h6v7"/></>,
  };
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

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

  useEffect(() => {
    if (state !== 'ready' || !db) return;
    let cancelled = false;
    async function establishServerSession() {
      const { data: { session } } = await db!.auth.getSession();
      if (!session || cancelled) return;
      const response = await fetch('/api/admin/session', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
      });
      if (!response.ok) { if (!cancelled) setMessage('Não foi possível confirmar a sessão no servidor. Entre novamente.'); return; }
      if (pathname === '/admin/acesso' && !cancelled) {
        const requested = new URLSearchParams(window.location.search).get('next');
        window.location.replace(requested?.startsWith('/admin') && requested !== '/admin/acesso' && !requested.startsWith('//') ? requested : '/admin');
      }
    }
    void establishServerSession();
    const refresh = window.setInterval(() => { void establishServerSession(); }, 10 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, [state, pathname]);

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
    {state === 'ready' && db && <ManagementContext.Provider value={{ db }}><div className="management-layout"><aside className="management-sidebar"><Link className="management-brand" href="/admin" aria-label="Elegância Pratas · visão geral" title="Visão geral">E<span aria-hidden="true">✦</span></Link><nav aria-label="Seções da gestão">{sections.map(section => <Link key={section.href} href={section.href} aria-label={section.label} title={section.label} aria-current={pathname === section.href ? 'page' : undefined}><NavIcon name={section.icon}/><span className="sr-only">{section.label}</span></Link>)}</nav><div className="management-sidebar-bottom"><Link className="management-store-link" href="/" aria-label="Ver loja" title="Ver loja"><NavIcon name="store"/><span className="sr-only">Ver loja</span></Link><button type="button" aria-label="Sair" title="Sair" onClick={async () => { await fetch('/api/admin/session', { method: 'DELETE' }); await db.auth.signOut(); setState('login'); }}><NavIcon name="logout"/><span className="sr-only">Sair</span></button></div></aside><div className="management-main"><header className="management-topbar"><div><span className="management-topbar-kicker">ELEGÂNCIA PRATAS</span><strong>Gestão da loja</strong></div><span className="management-topbar-account" aria-label="Área administrativa">Administrador</span></header>{children}</div></div></ManagementContext.Provider>}
  </div>;
}
