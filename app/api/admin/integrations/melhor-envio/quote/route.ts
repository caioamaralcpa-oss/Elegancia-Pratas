import { adminFromBearer, serviceDb } from '@/lib/melhor-envio-server';
import { sandboxBase } from '@/lib/melhor-envio-oauth';
import { availableShippingServices, sandboxQuoteInput, sandboxQuotePayload } from '@/lib/melhor-envio-quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  if (!await adminFromBearer(request)) return Response.json({ error: 'Acesso administrativo negado.' }, { status: 403, headers });
  if (Number(request.headers.get('content-length') ?? '0') > 2048) return Response.json({ error: 'Solicitação muito grande.' }, { status: 413, headers });
  let input: unknown;
  try { input = await request.json(); } catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400, headers }); }
  const parsed = sandboxQuoteInput.safeParse(input);
  if (!parsed.success) return Response.json({ error: 'Confira CEP, peso, dimensões e valor segurado.' }, { status: 400, headers });
  const db = serviceDb();
  if (!db) return Response.json({ error: 'Integração indisponível.' }, { status: 503, headers });
  const { data: connection, error } = await db.from('melhor_envio_oauth').select('access_token,expires_at').eq('environment', 'sandbox').maybeSingle();
  if (error || !connection) return Response.json({ error: 'Autorize o Melhor Envio no Sandbox antes de testar.' }, { status: 409, headers });
  if (Date.parse(connection.expires_at) <= Date.now()) return Response.json({ error: 'Autorização expirada. Renove-a em Integrações.' }, { status: 409, headers });
  try {
    const response = await fetch(`${sandboxBase}/api/v2/me/shipment/calculate`, {
      method: 'POST', headers: {
        Authorization: `Bearer ${connection.access_token}`, Accept: 'application/json', 'Content-Type': 'application/json',
      }, body: JSON.stringify(sandboxQuotePayload(parsed.data)), cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return Response.json({ error: response.status === 401 ? 'Autorização recusada pelo Melhor Envio. Renove-a em Integrações.' : `Melhor Envio não concluiu a cotação (HTTP ${response.status}).` }, { status: 503, headers });
    const services = availableShippingServices(await response.json());
    return Response.json({ environment: 'sandbox', originCep: '29070530', destinationCep: parsed.data.destinationCep, services }, { headers });
  } catch { return Response.json({ error: 'Não foi possível obter a cotação do Sandbox. Tente novamente.' }, { status: 503, headers }); }
}
