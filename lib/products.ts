import { createClient } from '@supabase/supabase-js';

export type Product = { id: string; slug: string; name: string; description: string | null; price_cents: number; category: string; material: string | null; measurements: string | null; image_url: string | null; commercial_image_urls: string[]; stock: number };
export async function products(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const db = createClient(url, key);
  const { data, error } = await db.from('products').select('id,slug,name,description,price_cents,category,material,measurements,image_url,commercial_image_urls,stock').eq('active', true).order('created_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar o catálogo');
  return data ?? [];
}
export const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
