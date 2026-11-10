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
