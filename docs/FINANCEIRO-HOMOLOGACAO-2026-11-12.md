# Homologação do Financeiro — 12/11/2026

## Resultado
Financeiro implantado e testado em ambiente separado. Produção preservada em eaf0aa2c5c3f2365da0cc44c963ac46c367dcf15, sem SQL financeiro ou ativação do módulo no projeto oficial.

- Código funcional: 924b37a8c9efc9fddde0cd0c9ef92d30c0e494bb.
- [Prévia privada](https://elegancia-financeiro-homologacao.vercel.app/admin/financeiro).
- [Portal de consulta](https://elegancia-financeiro-homologacao.vercel.app/socios).
- Vercel: elegancia-financeiro-homologacao, implantação dpl_HpGPD1QqV6pHQiuDDer5obAFZ5gR, READY.
- Supabase: EleganciaPratas-Homologacao-Financeiro, cgcaykrtfxlkrbopycyn, ACTIVE_HEALTHY.
- O projeto antigo kboarytzwijxxrmahvui foi pausado somente após autorização explícita do usuário para liberar a segunda vaga gratuita. O projeto oficial sltohhqejguauhanjhfj permaneceu ativo.
- Somente estrutura-base e SQL financeiro aprovado aplicados; nenhum pedido, cliente, imagem ou credencial de produção copiado.
- SHA256 do SQL financeiro aplicado: a6976ca5425970d1ef66476a51bf71941782456c92cf9fda460f2633dd26a782.
- Variáveis do novo projeto apontam apenas para o novo banco; aviso de homologação visível nas três telas financeiras.

## Testes realizados
- 36 testes numéricos da aplicação: passaram; incluindo os oito novos de rateio.
- 14 testes anteriores no PostgreSQL descartável: passaram, inclusive fechamento positivo com relógio de fixture e rollback. O relógio da homologação hospedada não foi alterado.
- 18 verificações na API do Supabase hospedado: passaram com Auth, MFA e RLS reais. Incluem negação de acesso anônimo, administrador sem MFA, operação por sócia, escrita direta e consulta de transações por sócia.
- As duas contas de consulta enxergaram exclusivamente seus próprios cadastros. Edição, inserção e exclusão via API foram recusadas.
- Cenário sintético: venda R$ 1.000,00, custo R$ 400,00, taxas R$ 50,00 e despesa R$ 100,00 resultaram em lucro R$ 450,00. Transferência entre contas não afetou o lucro nem o saldo total. Com saldo inicial R$ 100,00, o saldo total conferido foi R$ 950,00.
- Duplicação de venda, venda futura, fechamento fora do plano, dezembro ainda não encerrado e sobrescrita do cadastro foram recusados.
- Login pelo navegador passou para administrador e duas contas de consulta, com senha e TOTP reais.
- Nove verificações automatizadas de enquadramento: três perfis em 1440, 768 e 390 px, sem overflow horizontal ou erros de página.
- As quatro abas foram navegadas nos três tamanhos. Cadastro de conta pela interface e feedback de sucesso confirmados.
- O primeiro ensaio do navegador falhou por uma opção do Chromium de testes que desabilitava segurança da origem. A opção foi removida; autenticação, middleware e API originais foram preservados.
- Lint: zero erros, quatro avisos preexistentes de imagens no site público.
- Build de produção na Vercel: aprovado. Nenhuma dependência adicionada à aplicação.

## Lighthouse
Medições no build de produção da homologação, com autenticação administrativa real, Lighthouse 12.8.2, Chromium 133 e preset desktop. Estoque, catálogo e coleções legados estavam vazios; Financeiro continha apenas fixtures. As notas não representam a loja oficial com sua base real, nem uma mediana de múltiplas execuções válidas. Foram feitas novas tentativas somente quando a captura falhou; a primeira medição válida disponível foi registrada.

| Página | Desempenho | Acessibilidade | Boas Práticas |
| --- | ---: | ---: | ---: |
| /admin | Indisponível* | 100 | 100 |
| /admin/joias | 99 | 100 | 100 |
| /admin/colecoes | Indisponível* | 96 | 100 |
| /admin/estoque | 99 | 100 | 100 |
| /admin/precificacao | 99 | 100 | 100 |
| /admin/catalogo | 99 | 100 | 100 |
| /admin/integracoes | 99 | 100 | 100 |
| /admin/financeiro | 96 | 100 | 100 |

\* Visão geral e Coleções permaneceram sem nota válida de Desempenho por NO_SCREENSHOTS no coletor do Chromium, mesmo após nova tentativa com espera adicional e página em primeiro plano. O score nulo não é zero e não comprova desempenho acima de 90. Essas duas medições continuam pendentes em outro navegador de auditoria.

O Financeiro teve LCP de aproximadamente 474 ms e CLS 0,125 na execução válida. A troca da tela de confirmação/carregamento para o conteúdo produz deslocamento de layout; pode ser melhorada. A Visão geral também apresentou CLS 0,389 na coleta incompleta, sem nota final de Desempenho. Coleções tem um atributo ARIA não permitido em div.erp-cards; o menu de conta também foi apontado pela verificação experimental de correspondência entre nome acessível e texto visível. Uma nota automática de 100 não certifica conformidade integral WCAG AA.

Bibliotecas usadas somente no sandbox de testes: playwright-core 1.51.1, @sparticuz/chromium 133.0.0 e lighthouse 12.8.2. Não foram adicionadas ao package.json ou lockfile do produto.

## Segurança e encerramento dos testes
As novas tabelas têm RLS e escrita por funções que exigem administrador com MFA. As views de consulta usam security_invoker e filtro por identidade autenticada. Não foram feitas concessões diretas de escrita às sócias.

O advisor apontou alertas genéricos para funções SECURITY DEFINER executáveis por usuários autenticados. Nos RPCs financeiros, a autorização é explícita e foi testada com usuários sem permissão; não foi alterada para eliminar apenas o aviso. Permanecem também avisos da estrutura-base: funções antigas executáveis por anon, tabela de OAuth com RLS e sem política e proteção contra senhas vazadas desabilitada. Esses itens precisam de revisão própria antes de declarar o sistema inteiro auditado.

Referências do advisor: [funções acessíveis a anônimos](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [funções acessíveis a autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Após os ensaios, foram removidos contas financeiras, venda, lançamentos, auditoria e vínculos pessoais sintéticos. As três contas Auth de teste também foram excluídas. Os três sócios permanecem apenas com nome, chave interna e percentual, sem CPF, telefone, Pix ou conta vinculada. O bootstrap temporário foi substituído por uma resposta HTTP 410. Senhas e segredos de TOTP de teste ficaram exclusivamente no sandbox descartável na nuvem; não foram enviados ao chat ou repositório.

## Pendente e como revisar sem gravar em produção
1. Configurar [Authentication → URL Configuration](https://supabase.com/dashboard/project/cgcaykrtfxlkrbopycyn/auth/url-configuration): Site URL https://elegancia-financeiro-homologacao.vercel.app e Redirect URLs https://elegancia-financeiro-homologacao.vercel.app/**. A sondagem de recuperação, sem enviar e-mail, ainda retornou http://localhost:3000. O usuário autorizou a mudança, mas o conector não possui operação de configuração do Auth e esta sessão não tem controle do navegador autenticado; a alteração não foi executada.
2. Conta administrativa de revisão criada para o endereço fornecido pelo usuário, sem senha atribuída e sem confirmação automática do e-mail. O perfil é administrador e a ativação permanece pendente. A função temporária de provisionamento foi encerrada com HTTP 410. As contas reais das sócias não foram criadas nem receberam convites. E-mails e dados pessoais não constam do repositório público.
3. Acessar somente o projeto separado acima; a Vercel exige acesso autorizado e o aplicativo exige conta própria e MFA. A prévia automática do PR pode compartilhar variáveis antigas de produção: não usá-la para cadastros ou testes de escrita.
4. Criar novas contas e movimentações claramente sintéticas na homologação. Conferir resumo, vendas, movimentos, sócios e isolamento das contas de consulta. O cadastro inicial é único; usar dados de teste apenas no ambiente separado, sem reutilizar CPF/Pix reais.
5. O plano continua dezembro/2026 a maio/2027. O fechamento positivo de dezembro somente será permitido a partir de janeiro/2027 no relógio real. Não há transferência Pix automática.
6. Repetir as duas medições pendentes e revisar os apontamentos de acessibilidade/segurança antes da ativação oficial. Merge, SQL e ativação em produção não foram realizados.

Todos os arquivos, testes e registros desta etapa ficaram na nuvem. Nenhuma cópia do sistema, banco ou imagens foi gravada na máquina do usuário.
