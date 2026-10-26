# Elegância Pratas

Loja online em desenvolvimento com Next.js, TypeScript, Tailwind e Supabase. O código fica no GitHub; catálogo, pedidos, imagens e pagamentos de produção serão conectados a serviços gerenciados na nuvem.

A home segue a direção visual **Editorial Vinho**: fotografia de campanha, fundo vinho profundo, tipografia serifada e categorias visuais. As quatro imagens em `public/images` são material de ambientação gerado para o layout; não representam produtos cadastrados nem substituem fotos reais de cada joia. A marca no cabeçalho ainda é uma composição tipográfica, aguardando o arquivo final da logo.

## Executar

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`. Rode `npm run lint` e `npm run build` para verificar o projeto.

O projeto Supabase `sltohhqejguauhanjhfj` já tem a migração `supabase/migrations/20261026000000_initial.sql` aplicada. Copie `.env.example` para `.env.local` e preencha a URL do projeto e a chave pública anon. Sem elas, a vitrine mostra a coleção como em preparação. Cadastre produtos reais em `products` e ative-os apenas após verificar preço e estoque.

O carrinho guarda a seleção no navegador. Antes de criar qualquer cobrança, o servidor deverá consultar novamente preço e estoque no Supabase; os valores guardados pelo navegador não são confiáveis para pagamento.

O endpoint `/api/checkout/quote` já recalcula preço e estoque no servidor, mas não cria pedido ou cobrança. Para segurança, veja `docs/seguranca/auditoria.md`, `docs/seguranca/checklist.md` e `docs/seguranca/incidentes.md`. Execute `npm test`, `npm run lint`, `npm run build` e `npm audit` antes de publicar alterações.

Os textos em `lib/legal.ts` são rascunhos jurídicos. As rotas `/legal/*` ficam bloqueadas até `LEGAL_PAGES_REVIEWED=true`, que só deve ser definido depois de revisão profissional e preenchimento dos campos entre colchetes. Veja `docs/legal/LEIA-ME.md`.

## Cadastro pelo site

Depois de criar o projeto Supabase, ative autenticação por e-mail e crie sua conta de administrador no painel Supabase Auth. No SQL Editor, execute `insert into public.admin_users (user_id) values ('UUID_DA_CONTA');`, substituindo pelo ID da conta criada. Acesse `/admin`, entre com e-mail e senha e configure o segundo fator TOTP. Cadastre nome, identificador, descrição, categoria, material, preço, estoque e foto principal. A foto é validada e recodificada no servidor antes de ser gravada no bucket `product-images`. A loja mostra apenas produtos marcados como publicados. O cadastro de múltiplas fotos e variações ainda precisa ser concluído.

## Próximas integrações

- Armazenamento gerenciado para imagens, estoque e pedidos.
- Cálculo de frete por CEP e geração de etiquetas.
- Checkout hospedado e webhooks de confirmação de pagamento.
- Painel administrativo com autenticação.

Não coloque chaves secretas no repositório nem considere um pedido pago antes da confirmação do provedor.

## Publicação

Importe o repositório GitHub na Vercel e configure as variáveis de `.env.example` no painel. Mercado Pago, Melhor Envio e Resend devem começar em modo de teste. Valide todo o fluxo antes de divulgar a loja. A loja ainda não aceita pedidos: checkout, frete, pagamentos e e-mails estão pendentes.

Para continuar, faltam fotos e dados reais dos produtos, textos e políticas, CEP de origem, prazo de manuseio, contas dos provedores e o arquivo original da logo.
