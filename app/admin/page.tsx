'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/products';
import PricingPanel from './pricing-panel';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db: SupabaseClient | null = url && key ? createClient(url, key) : null;

export default function Admin() {
  const [authorized, setAuthorized] = useState(false);
  const [staffRole, setStaffRole] = useState<'atendente' | 'administrador' | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');

  const refresh = useCallback(async () => {
    if (!db) return;
    const { data, error } = await db.from('products').select('id,slug,name,description,price_cents,category,material,image_url,stock').order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else setItems(data ?? []);
  }, []);

  const continueAfterSignIn = useCallback(async () => {
    if (!db) return;
    const { data: assurance } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== 'aal2') {
      setNeedsMfa(true);
      const { data: factors } = await db.auth.mfa.listFactors();
      const verified = factors?.totp?.find(f => f.status === 'verified');
      if (verified) { setFactorId(verified.id); return; }
      const { data, error } = await db.auth.mfa.enroll({ factorType: 'totp' });
      if (error || !data) { setMessage('Não foi possível iniciar a verificação em duas etapas.'); return; }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      return;
    }
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const { data: role } = await db.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
    if (!role) { await db.auth.signOut(); setNeedsMfa(false); setMessage('Esta conta não tem acesso administrativo.'); return; }
    setStaffRole(role.role); setNeedsMfa(false); setAuthorized(true); setMessage(''); await refresh();
  }, [refresh]);

  useEffect(() => {
    async function check() {
      if (!db) { setLoading(false); return; }
      const { data: { user } } = await db.auth.getUser();
      if (user) await continueAfterSignIn();
      setLoading(false);
    }
    void check();
  }, [continueAfterSignIn]);

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !factorId || !/^\d{6}$/.test(code)) return;
    const { data: challenge, error: challengeError } = await db.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) { setMessage('Não foi possível verificar o código.'); return; }
    const { error } = await db.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) { setMessage('Código inválido ou expirado.'); return; }
    setCode(''); setQrCode(''); await continueAfterSignIn();
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) { setMessage('Não foi possível entrar. Confira as credenciais.'); return; }
    await continueAfterSignIn();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    const form = new FormData(event.currentTarget);
    const image = form.get('imagem') as File;
    let imageUrl = editing ? items.find(p => p.id === editing)?.image_url ?? null : null;
    if (image?.size) {
      const { data: { session } } = await db.auth.getSession();
      if (!session) { setMessage('Sua sessão expirou. Entre novamente.'); return; }
      const upload = new FormData();
      upload.set('imagem', image);
      const response = await fetch('/api/admin/images', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: upload });
      if (!response.ok) { setMessage('Não foi possível enviar a imagem. Verifique o formato e tente novamente.'); return; }
      imageUrl = (await response.json()).imageUrl;
    }
    const price = Number(form.get('preco'));
    const stock = Number(form.get('estoque'));
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) { setMessage('Informe preço e estoque válidos.'); return; }
    const record = { slug: String(form.get('slug')).trim().toLowerCase(), name: String(form.get('nome')).trim(), description: String(form.get('descricao')).trim(), category: String(form.get('categoria')).trim(), material: String(form.get('material')).trim(), price_cents: Math.round(price * 100), stock, image_url: imageUrl, active: form.get('ativo') === 'on' };
    if (!record.slug || !record.name || !record.category) { setMessage('Nome, identificador e categoria são obrigatórios.'); return; }
    const { error } = editing ? await db.from('products').update(record).eq('id', editing) : await db.from('products').insert(record);
    if (error) { setMessage(`Não foi possível salvar: ${error.message}`); return; }
    setMessage('Produto salvo.'); setEditing(null); (event.currentTarget as HTMLFormElement).reset(); await refresh();
  }

  if (!db) return <main className="secao"><h1>Administração</h1><p className="aviso">Configure o Supabase nas variáveis de ambiente para ativar o painel.</p></main>;
  if (loading) return <main className="secao"><p>Carregando...</p></main>;
  if (needsMfa) return <main className="secao admin"><h1>Verificação em duas etapas</h1>{qrCode && <><p>Escaneie o código no seu aplicativo autenticador e informe o código de seis dígitos.</p><img src={qrCode} alt="Código para configurar o aplicativo autenticador" width="180" height="180"/></>}<form onSubmit={verifyMfa}><label>Código do autenticador<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required value={code} onChange={e => setCode(e.target.value)}/></label><button className="botao">Verificar</button></form><p role="status">{message}</p></main>;
  if (!authorized) return <main className="secao admin"><h1>Entrar no painel</h1><form onSubmit={signIn}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)}/></label><button className="botao">Entrar</button></form><p role="status">{message}</p></main>;
  const current = items.find(p => p.id === editing);
  return <main className="secao admin"><h1>Produtos</h1><p>Cadastre e edite suas joias. Os produtos só aparecem na loja quando ativados.</p><button type="button" onClick={async () => { await db.auth.signOut(); setAuthorized(false); setStaffRole(null); }} >Sair</button><p role="status">{message}</p>{staffRole === 'administrador' && <><form key={editing ?? 'novo'} onSubmit={save}><h2>{editing ? 'Editar produto' : 'Novo produto'}</h2><label>Nome<input name="nome" required defaultValue={current?.name}/></label><label>Identificador para URL<input name="slug" required pattern="[a-z0-9-]+" title="Use letras minúsculas, números e hífens" defaultValue={current?.slug}/></label><label>Descrição<textarea name="descricao" rows={5} defaultValue={current?.description ?? ''}/></label><label>Categoria<input name="categoria" required defaultValue={current?.category}/></label><label>Material<input name="material" defaultValue={current?.material ?? ''}/></label><label>Preço (R$)<input name="preco" type="number" min="0" step="0.01" required defaultValue={current ? (current.price_cents / 100).toFixed(2) : ''}/></label><label>Estoque<input name="estoque" type="number" min="0" step="1" required defaultValue={current?.stock ?? 0}/></label><label>Foto principal<input name="imagem" type="file" accept="image/jpeg,image/png,image/webp"/></label><label className="check"><input name="ativo" type="checkbox" defaultChecked={false}/> Publicar produto</label><button className="botao" type="submit">Salvar produto</button>{editing && <button type="button" onClick={() => setEditing(null)}>Cancelar edição</button>}</form></>}<h2>Produtos cadastrados</h2><div className="admin-list">{items.map(p => <div key={p.id}><span>{p.name} — {p.stock} em estoque</span>{staffRole === 'administrador' && <button type="button" onClick={() => setEditing(p.id)}>Editar</button>}</div>)}</div>{staffRole === 'administrador' && <PricingPanel db={db} products={items} onPriceApplied={refresh}/>}</main>;
}
