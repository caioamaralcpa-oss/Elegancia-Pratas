import { stateCookie } from './melhor-envio-oauth.ts';

export const callbackHeaders = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'",
};
export const clearStateCookie = `${stateCookie}=; Max-Age=0; Path=/api/integrations/melhor-envio/callback; HttpOnly; Secure; SameSite=Lax`;

export function completedAuthorizationResponse() {
  return new Response(null, {
    status: 303,
    headers: {
      ...callbackHeaders,
      Location: 'https://eleganciapratas.vercel.app/admin/integracoes?melhor_envio=conectado',
      'Set-Cookie': clearStateCookie,
    },
  });
}
