# Checklist de segurança e conformidade

Atualizado em 26/10/2026. **Feito** significa validado no escopo indicado; não equivale a aprovação jurídica ou a uma loja pronta para vender.

| Item | Estado | Evidência ou próximo passo |
| --- | --- | --- |
| Auditoria inicial | Feito | `docs/seguranca/auditoria.md` |
| Dependências sem aviso conhecido no `npm audit` | Feito | Lockfile atualizado; `npm audit --audit-level=moderate` retornou zero na data acima. Repetir continuamente. |
| RLS em todas as tabelas da loja | Feito | Tabelas da loja com RLS, incluindo trilha de auditoria e custos privados de precificação. |
| Custos e margem de precificação | Parcial | `product_pricing` exige administrador com MFA; `anon` não pode ler a tabela nem executar a função de aplicar preço. Teste com conta real ainda pendente. |
| Precificação integrada ao estoque | Parcial | Função no banco recalcula custos e preço, registra custos usados e avança a joia ao catálogo interno. Teste completo com conta real ainda pendente. |
| Cadastro privado de joias | Parcial | `jewelry_intake` guarda custo unitário e caminho da foto em bucket privado; RLS exige administrador com MFA. Teste de ponta a ponta com conta real ainda pendente. |
| Estoque privado e modelos de embalagem | Parcial | Tabelas de itens, movimentações e modelos exigem administrador com MFA; escritas passam por funções que validam saldo. Teste com conta real e baixa automática por pedido ainda pendentes. |
| Isolamento entre pedidos de clientes e MFA no banco | Feito | `tests/rls.sql` executado no Supabase em transação revertida; zero registros de teste remanescentes. |
| MFA TOTP para admin | Feito no código/banco; teste humano pendente | Painel permite configurar/verificar TOTP; políticas exigem AAL2. Testar com conta real antes de operação. |
| Papéis atendente e administrador | Parcial | RLS distingue leitura e gestão; atendente só altera status/rastreio e não confirma pagamento. Interface e fluxo de concessão de papéis ainda limitados. |
| Registro de alterações em produtos/pedidos | Parcial | Gatilhos registram ator, operação, tabela e horário; falta interface de consulta e política de retenção. |
| Cabeçalhos de segurança | Parcial | Configurados em `next.config.ts`; confirmar resposta da Vercel e endurecer CSP sem `unsafe-inline`. |
| Preço calculado no servidor | Parcial | `/api/checkout/quote` consulta catálogo; testes unitários passaram. Checkout/pagamento ainda não existem. |
| Validação de entradas com Zod | Parcial | Aplicada à cotação do carrinho; ampliar para novas rotas. |
| Upload de imagem seguro | Parcial | Rota autentica admin com MFA via RLS, decodifica formatos reais com Sharp 0.35.5, recodifica para WebP, limita tamanho e pixels e renomeia. Faltam teste com conta real, limpeza de arquivos órfãos e limite de requisições. |
| Assinatura/idempotência de webhooks | Pendente | Integração Mercado Pago não implementada. |
| Frete e proteção contra manipulação | Pendente | Integração Melhor Envio não implementada. |
| Limites de requisição e CAPTCHA | Pendente | Definir solução distribuída antes de ativar rotas sensíveis. |
| Cookies de sessão HttpOnly/Secure/SameSite | Pendente | Admin usa sessão do SDK no navegador; revisar arquitetura de sessão. |
| Criptografia adicional de CPF/endereço e mascaramento | Pendente | Dados de pedidos ainda não são capturados pela aplicação; decidir necessidade e gestão de chaves. |
| Consentimento de cookies e direitos do titular | Parcial | Banner com aceitar/recusar/ajustar e bloqueio de GA4/Meta até consentimento; fica desativado até revisão legal. Fluxos de direitos do titular ainda pendentes. |
| Páginas legais revisadas | Depende de terceiros | Rascunhos bloqueados por padrão; advogado deve revisar e dados da empresa devem ser preenchidos. |
| Registro de aceite dos termos | Pendente | Implementar no futuro checkout/cadastro. |
| Direito de arrependimento pelo site | Pendente | Implementar fluxo e atendimento antes de vender. |
| Backup e restauração testada | Depende de terceiros | Procedimento em `docs/seguranca/backups.md`; confirmar plano e executar ensaio de restauração. |
| Gitleaks, CodeQL, Dependabot | Parcial | Arquivos de configuração presentes; verificar execução e permissões no GitHub. |
| Proteção de `main` e revisão obrigatória | Depende de terceiros | Configurar nas opções do repositório GitHub. |
| Monitoramento sem dados pessoais | Pendente | Definir ferramenta e política de logs. |
| 2FA em todas as contas dos provedores | Depende de terceiros | GitHub, Vercel, Supabase, Mercado Pago, Melhor Envio e domínio. |
| Emissão fiscal e regras específicas de joias | Depende de terceiros | Revisão com contador e advogado; comprovar teor/material antes de alegar. |

## Ações externas antes de vender

Contratar revisão jurídica; preencher razão social, CNPJ, endereço e canais de atendimento; definir encarregado/canal de privacidade; ativar 2FA nas contas dos provedores; configurar e testar backups; definir emissão de nota fiscal com contador; comprovar materiais e garantias das peças; configurar Mercado Pago e Melhor Envio em teste; verificar CI, proteção de branch e cabeçalhos na hospedagem; executar compra de teste ponta a ponta.
