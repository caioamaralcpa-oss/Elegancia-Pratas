# Auditoria inicial de segurança e conformidade — Elegância Pratas

Data: 26/10/2026. Escopo: código da branch `main` até o commit `3c4ab93`, lockfile e histórico Git disponível. Esta é a **Fase 1**: nenhum código da aplicação, política do Supabase ou configuração de produção foi alterado. A loja ainda não tem checkout operacional; os riscos de pagamento abaixo são requisitos para a implementação futura, não fraudes confirmadas.

## Achados priorizados

| Gravidade | Local | Risco e evidência | Correção proposta |
| --- | --- | --- | --- |
| **Alta** | `package-lock.json:4971` | `npm audit --package-lock-only` apontou `postcss@8.4.31`, dependência transitiva do Next, com avisos GHSA-6g55-p6wh-862q e GHSA-r28c-9q8g-f849 (leitura arbitrária de mapas de origem), além de avisos moderados. O relatório contabilizou 1 alta e 1 moderada; `fixAvailable: false` na árvore atual. A exploração depende de entradas CSS/mapas controladas pelo atacante; isso **não foi demonstrado** nesta aplicação. | Atualizar Next e lockfile para uma árvore com PostCSS corrigido, testar build e repetir `npm audit`; investigar alternativa suportada se a versão fixada do Next continuar incorporando versão vulnerável. |
| **Alta** | `app/admin/page.tsx:43-47`, `:76-78`; `supabase/migrations/20261026000000_initial.sql:6,16-20` | O admin usa login por senha e um único papel `admin_users`; não há exigência de MFA, sessão com nível AAL2 nem separação entre atendente e administrador. Uma conta comprometida poderia alterar preços, estoque e pedidos. As políticas RLS impedem que a simples ocultação da tela seja a única defesa, mas concedem poderes amplos a qualquer admin. | Exigir TOTP/AAL2 no servidor e nas políticas de acesso, papéis separados com privilégios mínimos e testes por papel. Revisar proteção contra tentativas de login no Supabase. |
| **Alta** | `app/layout.tsx:8`; ausência de `app/privacidade`, `app/termos`, `app/trocas` e `app/contato` | O rodapé não exibe identificação empresarial nem canais de atendimento; não há políticas e informações essenciais de comércio eletrônico. Publicar vendas neste estado cria risco de descumprimento de deveres de informação ao consumidor e da LGPD. | Elaborar páginas com dados reais da empresa, políticas e fluxos de atendimento; submeter os textos à revisão jurídica antes de publicar e confirmar obrigações específicas com advogado/contador. |
| **Média** | `lib/cart.ts:1,5-16`; `app/carrinho/page.tsx:10-11` | Preço, quantidade e identificador ficam no `localStorage` e podem ser alterados pelo cliente. O checkout está desativado, logo não há cobrança manipulável hoje. O risco se tornará alto se uma API futura confiar nesses valores. | No servidor, carregar produtos por ID, validar quantidade/estoque, recalcular preço, desconto, frete e total antes de criar pedido ou preferência de pagamento. Testar manipulação dos dados do navegador. |
| **Média** | `app/admin/page.tsx:50-70`; `supabase/migrations/20261026000000_initial.sql:21-25` | O upload confia em `File.type` declarado pelo navegador; o bucket verifica MIME e limite de 5 MB, mas não valida os bytes reais nem remove metadados. Imagens públicas podem conter metadados indevidos. O nome aleatório reduz colisão. | Validar assinatura do arquivo em serviço de processamento, recodificar imagens, remover metadados, limitar dimensões e revisar políticas do bucket. |
| **Média** | `app/admin/page.tsx:64-69`; `supabase/migrations/20261026000000_initial.sql:2-3` | Campos como nome, descrição, categoria e material só recebem validação mínima no navegador; banco impõe alguns limites numéricos, mas não tamanho, formato ou regras de publicação. Administradores comprometidos poderiam inserir dados impróprios ou valores extremos. | Criar esquema Zod no servidor e limites no banco, inclusive para preço máximo, comprimento e slug. Evitar mostrar erros internos do Supabase ao usuário. |
| **Média** | `app/admin/page.tsx:23,61,69` | Mensagens de erro do Supabase são mostradas diretamente na interface. Podem revelar estrutura, nomes de políticas ou detalhes operacionais. | Mostrar mensagem genérica e registrar erro técnico em canal interno sem dados pessoais ou segredos. |
| **Média** | `supabase/migrations/20261026000000_initial.sql:4-5,14-20` | RLS está ativa nas cinco tabelas, com leitura do próprio pedido e gestão por admin. Faltam testes automatizados que provem isolamento entre clientes e que um usuário sem papel não altere produtos/pedidos. Não foi verificada a configuração de permissões do banco fora da migração. | Criar testes de RLS com usuários distintos e verificar permissões efetivas no projeto hospedado. |
| **Média** | `app/layout.tsx:5-8`; ausência de `next.config.*` | Não há configuração explícita de CSP, HSTS, `nosniff`, política de referenciador, permissões ou restrição de enquadramento. Alguns cabeçalhos podem vir da hospedagem, mas isso não foi verificado. | Definir cabeçalhos compatíveis com Next, Supabase, Mercado Pago e imagens; testar no endereço publicado. Evitar CSP ampla como `unsafe-eval` em produção. |
| **Média** | ausência de `app/api/**` e testes | Não existem endpoints de checkout, webhooks, recuperação de senha, cupom, frete ou contato. Assinatura, idempotência, limites de requisição, CSRF, SSRF e validação de valor **não podem ser comprovados** antes da implementação. | Implementar rotas com Zod, autorização, verificação de assinatura, idempotência e limitação de abuso; incluir testes negativos antes de habilitar vendas. |
| **Média** | ausência de páginas legais e área do cliente | Não há consentimento de cookies, direitos do titular, exportação/exclusão de dados, aceite de termos nem fluxo de arrependimento. GA4 e Meta Pixel não são carregados atualmente, portanto não há evidência de disparo sem consentimento. | Implementar os fluxos com registro de versão/data, minimização de dados e revisão jurídica. |
| **Baixa** | `supabase/migrations/20261026000000_initial.sql:21-22` | O bucket de imagens de produtos é público, adequado para fotos de vitrine, mas qualquer imagem enviada poderá ser acessada por URL pública mesmo após desativar o produto. | Não enviar dados pessoais ao bucket; remover imagens órfãs e definir processo de exclusão. |
| **Baixa** | `app/catalogo/page.tsx:5`; `lib/products.ts:9` | O catálogo carrega todos os produtos ativos antes de filtrar por busca/categoria. Uma coleção grande aumentará custo, latência e potencial de abuso. | Fazer paginação, filtro e limites de consulta no servidor; avaliar índices. |
| **Baixa** | ausência de `.github/workflows`, `.github/dependabot.yml` e documentação de segurança | Não há no repositório CI de build, varredura de segredos, CodeQL, Dependabot, plano de incidentes ou registro de auditoria. Proteção da branch e backups são configurações externas e não foram verificadas. | Adicionar verificações no CI e documentar resposta a incidentes, backup e restauração; conferir configurações de GitHub e Supabase. |

## OWASP Top 10 (2021)

| Categoria | Situação nesta auditoria |
| --- | --- |
| A01 Controle de acesso | RLS existe nas cinco tabelas, mas sem testes; admin tem papel único e amplo. |
| A02 Falhas criptográficas | Não há processamento de CPF/cartão implementado. Proteção adicional para dados sensíveis, backups e chaves requerem desenho e verificação externa. |
| A03 Injeção | Consultas atuais usam SDK Supabase e React escapa texto por padrão; não foi encontrada injeção direta. Entradas de futuras APIs ainda não existem. |
| A04 Projeto inseguro | Carrinho manipulável e falta de fluxo de pedidos; não liberar cobrança antes da validação no servidor. |
| A05 Configuração insegura | Cabeçalhos e políticas de produção não verificados; bucket público intencional para produtos. |
| A06 Componentes vulneráveis | `npm audit` encontrou PostCSS transitivo vulnerável. |
| A07 Identificação e autenticação | Login admin sem MFA exigida; proteção de tentativas e confirmação de e-mail não comprovadas. |
| A08 Integridade de software e dados | Não há CI de segurança; webhooks ainda não existem. |
| A09 Registro e monitoramento | Não há trilha de auditoria de alterações nem monitoramento de incidentes. |
| A10 SSRF | Não há rota de proxy/fetch controlada pelo usuário atualmente; validar URLs e destinos nas integrações futuras. |

## Segredos e limites da verificação

Foi inspecionado o código atual e o diff dos cinco commits do histórico Git. Não foram encontrados valores de segredos ou chaves privadas; `.env.example:1-12` contém apenas nomes/valores não secretos. O token de administração do Supabase usado na configuração anterior não aparece no repositório. Isso **não substitui** uma varredura com Gitleaks no CI nem prova ausência de vazamentos em sistemas externos. Não imprimi nem examinei valores de variáveis de ambiente.

Não havia implantação Vercel verificável, clientes, pedidos, checkout ou webhooks no repositório; testes de ataque em produção, política real de backups, configuração de Auth (e-mail/limite/MFA), proteção da branch e cabeçalhos HTTP publicados ficaram fora do alcance desta fase. A migração foi previamente aplicada ao projeto Supabase, mas esta auditoria de Fase 1 não alterou o banco.

## Ordem sugerida para a Fase 2, após aprovação

1. Corrigir dependência vulnerável e criar CI de segurança.
2. Definir papéis, MFA e testes de RLS/autorização.
3. Fortalecer upload, validação de dados, erros e cabeçalhos.
4. Antes de ativar vendas, implementar checkout e webhooks com preços calculados no servidor, assinatura e idempotência.
5. Preparar textos e fluxos legais para revisão profissional antes da publicação.
