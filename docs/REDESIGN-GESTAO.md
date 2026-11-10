# Reestruturação da experiência de gestão

Base preservada: `c771eeaa1e35cd7388c55fc7bac49a20659b458a`.
Implementação visual verificada: `0d3e467a1f22c77715f9625b1479b934123648f5`.
Data da avaliação: 10/11/2026. Trabalho realizado no GitHub e em ambiente temporário da Vercel, sem cópia do projeto na máquina do usuário.

## Entrega

### Visão geral

- KPIs de unidades disponíveis, estoque ao custo de aquisição, valor potencial de venda, margem média por ficha e publicadas × pendentes.
- Gráficos de custo-base × preço potencial por coleção, unidades por coleção, cinco menores e maiores margens e funil cumulativo Cadastrada → Em coleção → Precificada → Publicada.
- Gráficos em módulo separado com `next/dynamic`; barras CSS e tabelas com valores textuais acessíveis. Nenhuma biblioteca de gráficos adicionada.
- Insights determinísticos com atalhos: menor margem, joias sem preço/foto comercial/coleção, insumos com saldo zero e coleção com maior lucro potencial coberto.
- Leituras paginadas para os indicadores; erro com nova tentativa, carregamento e vazio acionável.

O custo de aquisição do estoque usa quantidade atual × aquisição cadastrada. Unidades sem esse dado são explicitamente excluídas e informadas. O custo-base dos gráficos inclui aquisição, embalagem e depreciação da precificação salva. Essas duas bases têm rótulos diferentes.

Margens reutilizam `calculateWorkflowQuote` existente. Só entram fichas precificadas com snapshot salvo cujo preço aprovado corresponde ao preço atual; snapshots ausentes, inválidos ou desatualizados não viram margem zero. A média é simples por ficha elegível, com cobertura informada. Comparações por coleção abrangem apenas unidades cobertas. Margens negativas são preservadas.

Preço potencial e lucro potencial não representam vendas, lucro realizado ou rentabilidade histórica. O funil é cumulativo e conta fichas; distribuição e estoque contam unidades. Nenhuma série temporal, custo desconhecido ou transação foi inventada.

### Joias

- Busca, situação, ordenação, tabela/grade, densidade, página e configuração de colunas persistem nos parâmetros da URL e sobrevivem ao recarregamento.
- Limpar filtros restaura busca, situação, ordenação e página; mantém a apresentação escolhida.
- Oito colunas opcionais com exibição/ocultação e ordem por botões acessíveis. Identificação, seleção e ações ficam fixas.
- Cadastro e edição em drawer lateral com diálogo nativo, foco inicial, contenção de foco e fechamento por Escape.
- Feedback em tempo real das mesmas regras existentes; gravação, exclusão, limites e validações originais preservados.
- Seleção em lote encaminha ao fluxo de vinculação já existente em Coleções, limitado às mesmas 500 joias. O vínculo só é gravado pela confirmação existente nessa página.
- Lista de fotos de identificação recolhida ao chegar à página para evitar deslocar a tabela.

### Estados, acessibilidade e desempenho

- Componentes compartilhados de skeleton, vazio com ação, erro com nova tentativa e feedback persistente com toast de sucesso.
- Aplicados às páginas operacionais, integração e simulador de frete conforme as operações disponíveis. Fluxos sem dados próprios de carregamento não mostram skeleton artificial.
- Contraste de textos secundários ajustado para a cor escura já existente na paleta. Nenhuma cor-base nova.
- Labels, nomes acessíveis, foco visível, teclado, tabelas responsivas e rótulos de células compatíveis com a ordem configurável.
- Alvos dos atalhos superiores ampliados; atalhos ocultos nas telas menores para não comprimir o cabeçalho.
- Divisão por rotas mantida pelo Next.js, gráficos carregados dinamicamente, imagens administrativas com dimensões e fontes do sistema.
- Skeleton da operação reserva espaço; o checklist de fotos começa recolhido. CLS final medido: 0 nas seis páginas.

## Preservação e qualidade

- Nenhum diff em `lib/`, `supabase/` ou `app/api/` em relação à base.
- Sem migração; sem alteração de schema, dados de produção, RPCs ou fórmulas.
- Comparação sintática de 19 corpos de funções originais de gravação, conversão e validação: nenhuma diferença. Inclui senha, joias, coleções, estoque, precificação, catálogo e integrações.
- `npm test`: 28 aprovados, zero falhas. Quatro novos testes cobrem agregados em centavos, margem aprovada, ausência/desatualização de snapshot, prejuízo e preferências.
- `npm run lint`: zero erros. Permanecem quatro avisos preexistentes de imagens no site público, fora do painel.
- `npm run build`: aprovado; prévia da Vercel também em estado READY.
- Playwright e axe: seis páginas × três larguras (1440, 768 e 390 px), mais drawer nas três larguras: 21 verificações, zero violações automatizadas WCAG A/AA detectadas e nenhum transbordamento horizontal da página.
- Preferências após recarregar, limpar filtros, abrir drawer, preencher sem salvar, Escape e Ctrl+K verificados. Nenhum erro de execução capturado nesses percursos.
- Nenhuma escrita de teste executada em produção.

Nenhuma dependência adicionada ao projeto; `package.json` e lockfile intactos. Playwright, axe e Lighthouse foram instalados apenas no ambiente temporário de qualidade na nuvem.

## Lighthouse: resultados reais

Lighthouse 13.6.0, perfil mobile padrão, uma execução por rota, build otimizado de produção, sem builds concorrentes durante a rodada final. Medições de 10/11/2026, entre 16:12:00 e 16:12:38 UTC.

| Página | Performance | Acessibilidade | Boas Práticas | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Visão geral | 87 | 100 | 100 | 3060 ms | 323 ms | 0 |
| Joias | 95 | 100 | 100 | 1919 ms | 256 ms | 0 |
| Coleções | 98 | 100 | 100 | 939 ms | 174 ms | 0 |
| Estoque | 97 | 100 | 100 | 947 ms | 188 ms | 0 |
| Precificação | 92 | 100 | 100 | 940 ms | 352 ms | 0 |
| Catálogo | 90 | 100 | 100 | 937 ms | 405 ms | 0 |

Evidência durável: [resumo JSON](quality/lighthouse-mobile.json), com commit, horários e métricas.

O ensaio usou uma cópia isolada do build com 60 joias sintéticas, coleções, precificações e insumos compatíveis com o modelo. O transporte de dados e a sessão foram substituídos apenas nessa cópia privada, que bloqueia gravações. Essas substituições não foram commitadas nem publicadas na prévia. As notas medem a renderização do painel nesse cenário de laboratório; não medem a latência real do Supabase, o MFA, a sessão real ou fotos reais. Não são dados de clientes nem métricas de uso em campo.

Na primeira rodada a Visão Geral marcou 79 e Joias 83, com CLS 0,345 e 0,293. A revisão eliminou esses deslocamentos. As notas finais acima são da implementação final, sem selecionar o melhor resultado entre várias execuções.

### O que ainda impede superar 90

- **Visão geral (87):** LCP de 3,06 s e TBT de 323 ms. O elemento LCP é o card de estoque ao custo de aquisição. O relatório registra tarefas longas nos blocos de React e do cliente durante a montagem da página. Há custo de hidratação/renderização e leitura no cliente antes de aparecer o conteúdo definitivo. Uma próxima otimização deve reduzir o trabalho inicial e consolidar leituras repetidas sem mudar os contratos existentes.
- **Catálogo (90):** TBT de 405 ms, apesar do LCP baixo e CLS zero. A montagem e execução inicial do editor no cliente limitam a nota. Separar partes do editor sob demanda é a próxima hipótese a validar.
- A auditoria também aponta JavaScript não utilizado e código legado gerado pelo conjunto de dependências. Não foram alteradas dependências nem o acesso aos dados para perseguir uma nota.
- Os números variam com CPU, rede, volume e conteúdo. Não há garantia de nota acima de 90 com dados e autenticação reais.

## Pendências e limites

- Aferição autenticada com rede, imagens e volume reais permanece pendente: os ensaios atuais priorizaram isolamento de produção.
- Zero violações automatizadas e nota 100 não certificam conformidade integral WCAG AA. Falta uma auditoria humana completa com leitor de tela e todos os estados possíveis.
- Testes de gravação ponta a ponta exigem banco/Storage de homologação. Não foram realizados contra produção para preservar os cadastros.
- Não foram criadas exclusão, publicação ou precificação em lote; somente o vínculo já existente em Coleções foi exposto na seleção.
- Histórico, tendências financeiras, calendário de campanhas e lucro realizado não foram introduzidos porque não há base suficiente neste escopo.

## Como validar na prévia sem gravar em produção

Prévia verificada desta implementação: [abrir painel](https://eleganciapratas-flnokk8p4-99caio.vercel.app/admin).
Revisão dos commits: [PR 12](https://github.com/caioamaralcpa-oss/Elegancia-Pratas/pull/12).

A prévia mantém a autenticação normal e pode compartilhar as configurações do banco de produção. Ser uma prévia não torna os botões de gravação inofensivos.

1. Entrar normalmente e conferir os KPIs e a cobertura de margem. Abrir cada insight e verificar o destino.
2. Em Joias, mudar busca, situação, ordenação, tabela/grade, densidade e colunas; recarregar e confirmar persistência. Essas preferências ficam na URL.
3. Usar Limpar filtros e conferir a tabela em celular, tablet e desktop.
4. Abrir Nova joia ou editar uma ficha, conferir campos e validações; fechar com Escape ou Fechar. Não enviar o formulário.
5. Selecionar joias e abrir a vinculação em Coleções apenas para revisar a seleção. Não confirmar vínculo nem arrastar fichas entre colunas.
6. Conferir Estoque, Precificação, Catálogo, Integrações e frete por leitura. Não salvar, excluir, ajustar saldo, publicar, enviar/remover/reordenar fotos, conectar serviços, cotar frete ou trocar senha durante essa revisão.
7. Para testar qualquer gravação, criar uma implantação de homologação apontada exclusivamente a um projeto Supabase/Storage de teste e contas de integrações de teste; conferir a separação antes de executar ações. Isso não foi configurado automaticamente neste trabalho.

A versão oficial e os dados existentes permanecem preservados. Esta entrega fica na branch de revisão; não foi integrada à produção.
