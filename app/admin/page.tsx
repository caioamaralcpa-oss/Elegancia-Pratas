'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/products';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db: SupabaseClient | null = url && key ? createClient(url, key) : null;

export default function Admin() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  async function refresh() {
    if (!db) return;
    const { data, error } = await db.from('products').select('id,slug,name,description,price_cents,category,material,image_url,stock').order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else setItems(data ?? []);
  }

  useEffect(() => {
    async function check() {
      if (!db) { setLoading(false); return; }
      const { data: { user } } = await db.auth.getUser();
      if (user) {
        const { data } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
        if (data) { setAuthorized(true); await refresh(); }
      }
      setLoading(false);
    }
    void check();
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) { setMessage('Não foi possível entrar. Confira as credenciais.'); return; }
    const { data: role } = await db.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (!role) { await db.auth.signOut(); setMessage('Esta conta não tem acesso administrativo.'); return; }
    setAuthorized(true); setMessage(''); await refresh();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db) return;
    const form = new FormData(event.currentTarget);
    const image = form.get('imagem') as File;
    let imageUrl = editing ? items.find(p => p.id === editing)?.image_url ?? null : null;
    if (image?.size) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type) || image.size > 5 * 1024 * 1024) { setMessage('Envie JPG, PNG ou WebP de até 5 MB.'); return; }
      const extension = image.type === 'image/jpeg' ? 'jpg' : image.type === 'image/png' ? 'png' : 'webp';
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await db.storage.from('product-images').upload(path, image, { contentType: image.type, upsert: false });
      if (error) { setMessage(`Erro ao enviar imagem: ${error.message}`); return; }
      imageUrl = db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
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
  if (!authorized) return <main className="secao admin"><h1>Entrar no painel</h1><form onSubmit={signIn}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)}/></label><button className="botao">Entrar</button></form><p role="status">{message}</p></main>;
  const current = items.find(p => p.id === editing);
  return <main className="secao admin"><h1>Produtos</h1><p>Cadastre e edite suas joias. Os produtos só aparecem na loja quando ativados.</p><button type="button" onClick={async () => { await db.auth.signOut(); setAuthorized(false); }} >Sair</button><p role="status">{message}</p><form key={editing ?? 'novo'} onSubmit={save}><h2>{editing ? 'Editar produto' : 'Novo produto'}</h2><label>Nome<input name="nome" required defaultValue={current?.name}/></label><label>Identificador para URL<input name="slug" required pattern="[a-z0-9-]+" title="Use letras minúsculas, números e hífens" defaultValue={current?.slug}/></label><label>Descrição<textarea name="descricao" rows={5} defaultValue={current?.description ?? ''}/></label><label>Categoria<input name="categoria" required defaultValue={current?.category}/></label><label>Material<input name="material" defaultValue={current?.material ?? ''}/></label><label>Preço (R$)<input name="preco" type="number" min="0" step="0.01" required defaultValue={current ? (current.price_cents / 100).toFixed(2) : ''}/></label><label>Estoque<input name="estoque" type="number" min="0" step="1" required defaultValue={current?.stock ?? 0}/></label><label>Foto principal<input name="imagem" type="file" accept="image/jpeg,image/png,image/webp"/></label><label className="check"><input name="ativo" type="checkbox" defaultChecked={false}/> Publicar produto</label><button className="botao" type="submit">Salvar produto</button>{editing && <button type="button" onClick={() => setEditing(null)}>Cancelar edição</button>}</form><h2>Produtos cadastrados</h2><div className="admin-list">{items.map(p => <div key={p.id}><span>{p.name} — {p.stock} em estoque</span><button type="button" onClick={() => setEditing(p.id)}>Editar</button></div>)}</div></main>;
}
