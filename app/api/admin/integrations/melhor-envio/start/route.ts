import { randomBytes } from 'node:crypto';
import { adminFromBearer, serviceDb } from '@/lib/melhor-envio-server';
import { authorizationUrl, oauthConfigured, stateCookie } from '@/lib/melhor-envio-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  if (!await adminFromBearer(request)) return Response.json({ error: 'Sessão administrativa inválida ou sem segundo fator. Saia e entre novamente na gestão.' }, { status: 403, headers: noStore });
  const configured = oauthConfigured();
  let connected = false;
  if (configured) {
    const db = serviceDb();
    const { data, error } = await db!.from('melhor_envio_oauth').select('environment,expires_at').eq('environment', 'sandbox').maybeSingle();
    if (error) return Response.json({ error: error.code === 'PGRST301' || error.code === 'PGRST302' || error.code === '42501'
      ? 'A chave de servidor do Supabase na Vercel foi recusada ou não tem acesso. Confira se é a chave service_role do projeto correto.'
      : 'Não foi possível consultar o Supabase. Verifique a chave de servidor e tente novamente.' }, { status: 503, headers: noStore });
    connected = Boolean(data && Date.parse(data.expires_at) > Date.now());
  }
  return Response.json({ configured, connected, environment: 'sandbox' }, { headers: noStore });
}

export async function POST(request: Request) {
  if (!await adminFromBearer(request)) return Response.json({ error: 'Sessão administrativa inválida ou sem segundo fator. Saia e entre novamente na gestão.' }, { status: 403, headers: noStore });
  if (!oauthConfigured()) return Response.json({ error: 'Configure as credenciais privadas na Vercel antes de autorizar.' }, { status: 503, headers: noStore });
  const state = randomBytes(32).toString('hex');
  const response = Response.json({ authorizationUrl: authorizationUrl(process.env.MELHOR_ENVIO_CLIENT_ID!, state) }, { headers: noStore });
  response.headers.append('Set-Cookie', `${stateCookie}=${state}; Max-Age=600; Path=/api/integrations/melhor-envio/callback; HttpOnly; Secure; SameSite=Lax`);
  return response;
}
