import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { GET } from '../app/api/integrations/melhor-envio/callback/route.ts';
import { completedAuthorizationResponse } from '../lib/melhor-envio-response.ts';

test('URL de cadastro responde sem ativar OAuth', async () => {
  const response = await GET(new Request('https://eleganciapratas.vercel.app/api/integrations/melhor-envio/callback'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /autorização é iniciada pela gestão/i);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('código de autorização não é aceito nem exibido', async () => {
  const response = await GET(new Request('https://eleganciapratas.vercel.app/api/integrations/melhor-envio/callback?code=segredo&state=teste'));
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.match(body, /Etapa: ESTADO/);
  assert.doesNotMatch(body, /segredo|teste/);
});

test('retorno de sucesso redireciona e remove o cookie de estado', () => {
  const response = completedAuthorizationResponse();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://eleganciapratas.vercel.app/admin/integracoes?melhor_envio=conectado');
  assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=0/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
