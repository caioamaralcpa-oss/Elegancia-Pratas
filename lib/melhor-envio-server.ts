import { createClient } from '@supabase/supabase-js';

export async function adminFromBearer(request: Request) {
  const match = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!match || !url || !key) return false;
  const db = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${match[1]}` } } });
  const { data: userData, error: userError } = await db.auth.getUser(match[1]);
  if (userError || !userData.user) return false;
  const { data: admin } = await db.from('admin_users').select('role').eq('user_id', userData.user.id).eq('role', 'administrador').maybeSingle();
  return Boolean(admin);
}

export function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
