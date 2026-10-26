# Elegância Pratas

Loja online em desenvolvimento com Next.js, TypeScript, Tailwind e Supabase. O código fica no GitHub; catálogo, pedidos, imagens e pagamentos de produção serão conectados a serviços gerenciados na nuvem.

## Executar

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`. Rode `npm run lint` e `npm run build` para verificar o projeto.

Crie um projeto no Supabase e execute `supabase/migrations/20261026000000_initial.sql` no SQL Editor. Copie `.env.example` para `.env.local` e preencha a URL e a chave pública anon. Sem elas, a vitrine mostra a coleção como em preparação. Cadastre produtos reais em `products` e ative-os apenas após verificar preço e estoque.

## Cadastro pelo site

Depois de criar o projeto Supabase, ative autenticação por e-mail e crie sua conta de administrador no painel Supabase Auth. No SQL Editor, execute `insert into public.admin_users (user_id) values ('UUID_DA_CONTA');`, substituindo pelo ID da conta criada. Acesse `/admin` e entre com e-mail e senha. Cadastre nome, identificador, descrição, categoria, material, preço, estoque e foto principal. O painel grava a foto no bucket `product-images`. A loja mostra apenas produtos marcados como publicados. O cadastro de múltiplas fotos e variações ainda precisa ser concluído.

## Próximas integrações

- Armazenamento gerenciado para imagens, estoque e pedidos.
- Cálculo de frete por CEP e geração de etiquetas.
- Checkout hospedado e webhooks de confirmação de pagamento.
- Painel administrativo com autenticação.

Não coloque chaves secretas no repositório nem considere um pedido pago antes da confirmação do provedor.

## Publicação

Importe o repositório GitHub na Vercel e configure as variáveis de `.env.example` no painel. Mercado Pago, Melhor Envio e Resend devem começar em modo de teste. Valide todo o fluxo antes de divulgar a loja. A loja ainda não aceita pedidos: carrinho, checkout, frete, pagamentos, painel e e-mails estão pendentes.

Para continuar, faltam fotos e dados reais dos produtos, textos e políticas, CEP de origem, prazo de manuseio, contas dos provedores e o arquivo original da logo.
