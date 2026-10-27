# Conexão do Melhor Envio — Sandbox

O aplicativo do Sandbox deve ter como URL de retorno exatamente:

`https://eleganciapratas.vercel.app/api/integrations/melhor-envio/callback`

Configure em **Vercel → projeto eleganciapratas → Settings → Environment Variables**, somente no ambiente **Production**, como valores privados (não `NEXT_PUBLIC_`):

- `MELHOR_ENVIO_CLIENT_ID`: identificador do aplicativo de Sandbox.
- `MELHOR_ENVIO_CLIENT_SECRET`: segredo do mesmo aplicativo.
- `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role` do projeto Supabase da loja, obtida no painel de API Keys. Esta chave tem amplo acesso; nunca a copie para o repositório, navegador, captura de tela ou chat.

Após salvar, faça uma nova implantação de produção para carregar as variáveis. Entre em `/admin/integracoes` como administrador com MFA e clique em **Autorizar no Sandbox**. A autorização pede apenas o escopo `shipping-calculate`. O código de retorno é aceito apenas quando existe uma solicitação iniciada por este administrador no mesmo navegador, com estado aleatório de 10 minutos. Tokens são guardados em tabela sem acesso de visitantes ou usuários comuns.

Este fluxo **não habilita o checkout**. A cotação no carrinho, renovação de token e integração de pagamento são etapas separadas. Não use o aplicativo de produção do Melhor Envio antes dos testes de Sandbox.
