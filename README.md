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

O administrador entra em `/admin` com e-mail, senha e segundo fator TOTP. O painel é dividido em Visão geral, Joias, Estoque, Precificação e Catálogo. Em **Joias**, salve quantas peças quiser para precificar depois: nome comercial, descrição, modelo, gênero (feminina, masculina ou unissex), medidas, custo unitário, quantidade e foto privada de identificação. O código da joia é gerado pelo banco. A tabela da página mostra custo unitário e total, preço de venda e situação; preço não definido aparece como pendente. Cada peça salva aparece na fila da página **Precificação**. Só após receber um preço e avançar de etapa poderá aparecer no **Catálogo de gestão**; o catálogo público continua restrito a peças explicitamente publicadas. O cálculo de preço, o cadastro de embalagens/insumos e a revisão comercial ainda serão implementados. Visitantes não podem ler custo ou foto de identificação; as políticas do Supabase exigem administrador com MFA.

A precificação antiga permanece registrada no banco para preservação de dados, mas sua interface está temporariamente indisponível durante a reorganização. A futura página Precificação usará o custo do cadastro da joia e os custos de embalagens e insumos. O estoque atual é um número no cadastro do produto, sem histórico de movimentações, reservas ou variações; ainda não é um controle de estoque completo.

## Próximas integrações

- Armazenamento gerenciado para imagens, estoque e pedidos.
- Cálculo de frete por CEP e geração de etiquetas.
- Checkout hospedado e webhooks de confirmação de pagamento.
- Painel administrativo com autenticação.

Não coloque chaves secretas no repositório nem considere um pedido pago antes da confirmação do provedor.

## Publicação

Importe o repositório GitHub na Vercel e configure as variáveis de `.env.example` no painel. Mercado Pago, Melhor Envio e Resend devem começar em modo de teste. Valide todo o fluxo antes de divulgar a loja. A loja ainda não aceita pedidos: checkout, frete, pagamentos e e-mails estão pendentes.

Para continuar, faltam fotos e dados reais dos produtos, textos e políticas, CEP de origem, prazo de manuseio, contas dos provedores e o arquivo original da logo.
