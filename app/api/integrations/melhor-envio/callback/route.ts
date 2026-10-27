// Endereço estável para cadastrar o aplicativo no Sandbox do Melhor Envio.
// Não aceitar códigos OAuth até implementar state, troca de token e armazenamento seguro.
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const url = new URL(request.url);
  const authorizationAttempt = url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('error');
  return new Response(
    authorizationAttempt
      ? 'A autorização do Melhor Envio ainda não está habilitada. Nenhuma conta foi conectada. Retorne à loja.'
      : 'URL de retorno da integração Elegância Pratas cadastrada. A autorização ainda não está habilitada.',
    {
      status: authorizationAttempt ? 503 : 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'",
      },
    },
  );
}
