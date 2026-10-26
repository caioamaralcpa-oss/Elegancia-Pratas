import { createClient } from '@supabase/supabase-js';
import { cartInput, calculateQuote } from '@/lib/quote';

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? '0') > 8192) return Response.json({ error: 'Solicitação inválida.' }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Solicitação inválida.' }, { status: 400 }); }
  const parsed = cartInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Carrinho inválido.' }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: 'Loja temporariamente indisponível.' }, { status: 503 });
  const db = createClient(url, key);
  const { data, error } = await db.from('products').select('id,name,price_cents,stock').eq('active', true).in('id', parsed.data.items.map(item => item.productId));
  if (error) return Response.json({ error: 'Não foi possível consultar os produtos.' }, { status: 503 });
  try { return Response.json(calculateQuote(parsed.data, data ?? []), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Revise os produtos e quantidades do carrinho.' }, { status: 409 }); }
}
