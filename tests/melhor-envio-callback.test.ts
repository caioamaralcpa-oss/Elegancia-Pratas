import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { GET } from '../app/api/integrations/melhor-envio/callback/route.ts';

test('URL de cadastro responde sem ativar OAuth', async () => {
  const response = GET(new Request('https://eleganciapratas.vercel.app/api/integrations/melhor-envio/callback'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /autorização ainda não está habilitada/i);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('código de autorização não é aceito nem exibido', async () => {
  const response = GET(new Request('https://eleganciapratas.vercel.app/api/integrations/melhor-envio/callback?code=segredo&state=teste'));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /segredo|teste/);
});
