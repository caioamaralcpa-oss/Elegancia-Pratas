# Elegância Pratas

Loja online em desenvolvimento com Next.js, TypeScript, Tailwind e Supabase. O código fica no GitHub; catálogo, pedidos, imagens e pagamentos de produção serão conectados a serviços gerenciados na nuvem.

## Executar

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`. Rode `npm run lint` e `npm run build` para verificar o projeto.

Crie um projeto no Supabase e execute `supabase/migrations/20261026000000_initial.sql` no SQL Editor. Copie `.env.example` para `.env.local` e preencha a URL e a chave pública anon. Sem elas, a vitrine mostra a coleção como em preparação. Cadastre produtos reais em `products` e ative-os apenas após verificar preço e estoque.

## Próximas integrações

- Armazenamento gerenciado para imagens, estoque e pedidos.
- Cálculo de frete por CEP e geração de etiquetas.
- Checkout hospedado e webhooks de confirmação de pagamento.
- Painel administrativo com autenticação.

Não coloque chaves secretas no repositório nem considere um pedido pago antes da confirmação do provedor.

## Publicação

Importe o repositório GitHub na Vercel e configure as variáveis de `.env.example` no painel. Mercado Pago, Melhor Envio e Resend devem começar em modo de teste. Valide todo o fluxo antes de divulgar a loja. A loja ainda não aceita pedidos: carrinho, checkout, frete, pagamentos, painel e e-mails estão pendentes.

Para continuar, faltam fotos e dados reais dos produtos, textos e políticas, CEP de origem, prazo de manuseio, contas dos provedores e o arquivo original da logo.
