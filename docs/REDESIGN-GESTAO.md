# Reestruturação da experiência de gestão

Base: c771eeaa1e35cd7388c55fc7bac49a20659b458a.

## Diagnóstico

Rotas: /admin (vendas e operação); /admin/joias (cadastro, foto privada, edição e exclusão confirmada); /admin/colecoes (criação, renomeação e distribuição em lote); /admin/estoque (embalagens, lotes de insumos, modelos e movimentações); /admin/precificacao (custos e preço); /admin/catalogo (revisão, fotos públicas, publicação e medidas de envio); /admin/integracoes e /frete; /admin/acesso (login/MFA).

Estados atuais: carregamento, seleção/edição, gravação, erro e confirmação. O acesso usa administrador com MFA. Fotos privadas usam URLs assinadas; fotos comerciais são públicas. A consulta e gravação dependem das políticas existentes do Supabase.

Problemas: várias folhas sobrescrevem os mesmos componentes; páginas grandes misturam leitura, edição e ações; busca e hierarquia variam; indicadores de andamento não acompanham todo o fluxo.

## Etapas

1. Tokens extraídos das cores existentes, escala de espaçamento e componentes comuns.
2. Navegação agrupada e recolhível, breadcrumbs, busca global e comandos.
3. Dashboard de pendências com dados reais disponíveis.
4. Joias: filtros, ordenação, modos de visualização e fluxo legível.
5. Coleções: visão de organização mantendo as atribuições atuais.
6. Estoque e precificação: composição de custos clara e fórmulas intactas.
7. Catálogo: completude e prévia visual com o mesmo contrato de publicação.
8. Regressão, teclado, telas pequenas e build.

## Decisões seguras

Não criar histórico, tendência, calendário, limiar mínimo ou lucro realizado onde não existe dado. Não habilitar arquivamento, desfazer exclusão, precificação em lote, autosave financeiro ou escrita otimista sem suporte transacional existente. Datas, parâmetros de RPC, validações e fórmulas atuais devem ser preservados. O fluxo de coleção é por produto, não por fração do saldo. Qualquer mudança dessa regra depende de outro trabalho de dados.

Nenhuma migração de banco ou dado de produção faz parte desta implementação. Recursos visuais serão avaliados em cópia isolada com dados simulados. Metas Lighthouse serão reportadas apenas quando medidas, não presumidas.

## Estado desta versão

Implementado: tokens com a paleta atual; cabeçalhos, diálogo com foco nativo, skeleton e stepper; sidebar agrupada/recolhível; busca de joias/coleções e páginas por Ctrl/Cmd+K; atalhos e menu de conta; dashboard com pendências; filtros, ordenação, grade e paginação em Joias; resumos e quadro por coleção; busca e saldo zero no Estoque; composição e comparação de preço; completude, arrastar arquivos, prévia e reordenação de fotos no Catálogo.

Não é uma entrega integral do briefing: ainda faltam filtros persistidos, tabela configurável completa, tela de cadastro em drawer, implementação de todas as ações em lote, gráficos avançados, revisão completa WCAG e medição Lighthouse. Campanhas com calendário e evolução histórica não têm dados próprios no modelo atual.

Verificações: 24 testes aprovados, incluindo cenários numéricos fixos; build aprovado; nenhum diff em lib/, supabase/ ou app/api/. Verificação de páginas e algumas interações em 1440, 768 e 390 pixels com dados simulados. Lint sem erros no painel; quatro avisos de imagens preexistentes no site público continuam. Não foi medida nota Lighthouse nem realizada escrita de teste em produção.

Nenhuma biblioteca adicionada. Fontes do sistema evitam requisições externas. Fotos de identificação continuam privadas e usam URLs assinadas; imagens administrativas recebem dimensões explícitas.

## Validação da prévia

1. Acessar a prévia Vercel e entrar pela autenticação normal da loja.
2. Conferir menu expandido/recolhido, menu de celular e Ctrl/Cmd+K.
3. Buscar por uma joia e uma coleção; conferir resultados e filtros.
4. Alternar tabela/grade, situação, ordenação e paginação de Joias.
5. Conferir os valores atuais e os cenários de teste antes de qualquer gravação.
6. Revisar quadro de coleções e a alternativa por tabela; movimentar só quando desejar alterar o vínculo.
7. Conferir custos e modelos no Estoque, comparação na Precificação e checklist/fotos no Catálogo.
8. A prévia usa as permissões e configurações do projeto; ações de salvar são operações reais quando conectadas ao banco. Para testar escritas, usar ambiente próprio de homologação.
