import { createClient } from '@supabase/supabase-js';

export const adminCookieName = 'elegancia_admin_session';

export async function verifiedAdmin(accessToken: string | undefined) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!accessToken || !url || !key) return false;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await db.auth.getUser(accessToken);
  if (userError || !userData.user) return false;
  // The admin_users SELECT policy itself requires aal2 in the verified token.
  const endpoint = `${url}/rest/v1/admin_users?select=role&user_id=eq.${encodeURIComponent(userData.user.id)}&role=eq.administrador&limit=1`;
  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: 'no-store',
  });
  if (!response.ok) return false;
  const rows = await response.json() as { role?: string }[];
  return rows.length === 1 && rows[0].role === 'administrador';
}
