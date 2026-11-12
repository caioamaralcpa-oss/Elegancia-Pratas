'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import '../admin/management.css';
import '../admin/ui/tokens.css';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key) : null;

export default function ActivateAccessPage() {
  const [access, setAccess] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const [destination, setDestination] = useState('/admin');

  useEffect(() => {
    let active = true;
    setDestination(new URLSearchParams(window.location.search).get('destino') === 'socios' ? '/socios' : '/admin');
    if (!db) { setAccess('invalid'); return; }
    const { data: { subscription } } = db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active) {
        setAccess('invalid');
        setPassword('');
        setConfirmation('');
      }
    });
    void db.auth.getUser().then(({ data, error }) => {
      if (active) setAccess(!error && data.user ? 'valid' : 'invalid');
    }).catch(() => { if (active) setAccess('invalid'); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || access !== 'valid' || busy) return;
    if (password.length < 12 || password !== confirmation) {
      setMessage('Use ao menos 12 caracteres e repita a mesma senha nos dois campos.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await db.auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword('');
      setConfirmation('');
      setDone(true);
      await db.auth.signOut({ scope: 'local' }).catch(() => undefined);
    } catch {
      setMessage('Não foi possível definir a senha. Confira os campos ou solicite um novo link de ativação.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="management-shell">
      <main className="management-auth">
        <p className="eyebrow">ELEGÂNCIA PRATAS · ACESSO SEGURO</p>
        {done ? <>
          <h1>Senha definida</h1>
          <p>Seu acesso está pronto. Entre com seu e-mail e a nova senha para continuar.</p>
          <Link className="botao" href={destination}>Acessar minha área</Link>
        </> : access === 'loading' ? <>
          <h1>Ativar acesso</h1>
          <p role="status">Verificando seu link...</p>
        </> : access === 'invalid' ? <>
          <h1>Link de ativação necessário</h1>
          <p>Abra o link recebido no seu e-mail. Se ele expirou ou já foi utilizado, solicite um novo ao responsável pelo sistema.</p>
          <Link href={destination}>Já tenho senha</Link>
        </> : <>
          <h1>Defina sua senha</h1>
          <p>Escolha uma senha pessoal com pelo menos 12 caracteres.</p>
          <form onSubmit={submit}>
            <label>Nova senha
              <input type="password" autoComplete="new-password" required minLength={12} value={password}
                onChange={event => { setPassword(event.target.value); setMessage(''); }}
                aria-describedby="password-help" />
            </label>
            <label>Repita a senha
              <input type="password" autoComplete="new-password" required minLength={12} value={confirmation}
                onChange={event => { setConfirmation(event.target.value); setMessage(''); }}
                aria-invalid={confirmation.length > 0 && password !== confirmation}
                aria-describedby="password-help" />
            </label>
            <p id="password-help">Os dois campos devem conter a mesma senha.</p>
            <button className="botao" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Definir senha'}</button>
          </form>
        </>}
        <p role="alert">{message}</p>
      </main>
    </div>
  );
}
