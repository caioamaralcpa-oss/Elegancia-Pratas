import { timingSafeEqual } from 'node:crypto';
import { callbackUrl, oauthConfigured, sandboxBase, stateCookie } from '../../../../../lib/melhor-envio-oauth.ts';
import { serviceDb } from '../../../../../lib/melhor-envio-server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const baseHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'",
};
const clearCookie = `${stateCookie}=; Max-Age=0; Path=/api/integrations/melhor-envio/callback; HttpOnly; Secure; SameSite=Lax`;

function fail(stage: 'ESTADO' | 'CONFIGURACAO' | 'RECUSADA' | 'TOKEN' | 'FORMATO' | 'BANCO' | 'REDE', providerStatus?: number) {
  const detail = stage === 'TOKEN' && providerStatus ? ` (${providerStatus})` : '';
  return new Response(`Não foi possível concluir a autorização. Etapa: ${stage}${detail}. Nenhuma conta foi conectada.`, {
    status: 503, headers: { ...baseHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': clearCookie },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code && !state && !url.searchParams.has('error')) {
    return new Response('URL de retorno da integração Elegância Pratas cadastrada. A autorização é iniciada pela gestão da loja.', {
      status: 200, headers: { ...baseHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${stateCookie}=`))?.slice(stateCookie.length + 1);
  if (url.searchParams.has('error')) return fail('RECUSADA');
  if (!code || code.length > 2048 || !state || !/^[0-9a-f]{64}$/.test(state) || !cookie || !/^[0-9a-f]{64}$/.test(cookie) || !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))) return fail('ESTADO');
  if (!oauthConfigured()) return fail('CONFIGURACAO');

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code', client_id: process.env.MELHOR_ENVIO_CLIENT_ID!,
      client_secret: process.env.MELHOR_ENVIO_CLIENT_SECRET!, redirect_uri: callbackUrl, code,
    });
    const tokenResponse = await fetch(`${sandboxBase}/oauth/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) return fail('TOKEN', tokenResponse.status);
    const token: unknown = await tokenResponse.json();
    if (!token || typeof token !== 'object') return fail('FORMATO');
    const data = token as Record<string, unknown>;
    const expiresIn = Number(data.expires_in);
    if (typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token || !Number.isFinite(expiresIn) || expiresIn < 60 || expiresIn > 31536000) return fail('FORMATO');
    const db = serviceDb();
    if (!db) return fail('CONFIGURACAO');
    const { error } = await db.from('melhor_envio_oauth').upsert({
      environment: 'sandbox', access_token: data.access_token, refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(), updated_at: new Date().toISOString(),
    });
    if (error) return fail('BANCO');
    const response = Response.redirect('https://eleganciapratas.vercel.app/admin/integracoes?melhor_envio=conectado', 303);
    for (const [key, value] of Object.entries(baseHeaders)) response.headers.set(key, value);
    response.headers.set('Set-Cookie', clearCookie);
    return response;
  } catch { return fail('REDE'); }
}
