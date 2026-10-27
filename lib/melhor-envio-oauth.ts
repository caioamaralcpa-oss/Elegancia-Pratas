export const callbackUrl = 'https://eleganciapratas.vercel.app/api/integrations/melhor-envio/callback';
export const sandboxBase = 'https://sandbox.melhorenvio.com.br';
export const stateCookie = 'me_oauth_state';

export function authorizationUrl(clientId: string, state: string) {
  const url = new URL('/oauth/authorize', sandboxBase);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', 'shipping-calculate');
  url.searchParams.set('state', state);
  return url.toString();
}

export function oauthConfigured() {
  return Boolean(process.env.MELHOR_ENVIO_CLIENT_ID && process.env.MELHOR_ENVIO_CLIENT_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}
