import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? '0') > 6 * 1024 * 1024) return Response.json({ error: 'Imagem muito grande.' }, { status: 413 });
  const match = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!match || !url || !key) return Response.json({ error: 'Acesso negado.' }, { status: 401 });
  const db = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${match[1]}` } } });
  const { data: userData, error: userError } = await db.auth.getUser(match[1]);
  if (userError || !userData.user) return Response.json({ error: 'Acesso negado.' }, { status: 401 });
  const { data: admin } = await db.from('admin_users').select('role').eq('user_id', userData.user.id).eq('role', 'administrador').maybeSingle();
  if (!admin) return Response.json({ error: 'Acesso negado.' }, { status: 403 });
  const kind = new URL(request.url).searchParams.get('kind');
  if (kind !== null && kind !== 'identification') return Response.json({ error: 'Tipo de imagem inválido.' }, { status: 400 });
  let image: FormDataEntryValue | null;
  try { image = (await request.formData()).get('imagem'); }
  catch { return Response.json({ error: 'Arquivo inválido.' }, { status: 400 }); }
  if (!(image instanceof File) || image.size < 1 || image.size > 5 * 1024 * 1024) return Response.json({ error: 'Envie uma imagem de até 5 MB.' }, { status: 400 });
  try {
    const input = Buffer.from(await image.arrayBuffer());
    const processor = sharp(input, { failOn: 'error', limitInputPixels: 25_000_000 });
    const metadata = await processor.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('Formato inválido');
    const optimized = await processor.rotate().resize(1800, 1800, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (optimized.length > 5 * 1024 * 1024) throw new Error('Arquivo otimizado muito grande');
    const path = `${crypto.randomUUID()}.webp`;
    const bucket = kind === 'identification' ? 'jewelry-identification' : 'product-images';
    const { error } = await db.storage.from(bucket).upload(path, optimized, { contentType: 'image/webp', upsert: false });
    if (error) return Response.json({ error: 'Não foi possível enviar a imagem.' }, { status: 503 });
    if (kind === 'identification') return Response.json({ imagePath: path }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    const imageUrl = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return Response.json({ imageUrl }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Imagem inválida. Use JPG, PNG ou WebP.' }, { status: 400 }); }
}
