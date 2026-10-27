import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { authorizationUrl, callbackUrl } from '../lib/melhor-envio-oauth.ts';

test('autoriza apenas sandbox e escopo de cotação', () => {
  const url = new URL(authorizationUrl('client-id', 'state-value'));
  assert.equal(url.origin, 'https://sandbox.melhorenvio.com.br');
  assert.equal(url.pathname, '/oauth/authorize');
  assert.equal(url.searchParams.get('scope'), 'shipping-calculate');
  assert.equal(url.searchParams.get('redirect_uri'), callbackUrl);
  assert.equal(url.searchParams.get('state'), 'state-value');
});
