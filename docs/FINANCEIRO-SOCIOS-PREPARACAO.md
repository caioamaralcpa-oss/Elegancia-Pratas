# Financeiro e repasses aos sócios — preparação

## Estado
Rascunho de implementação. Não publicado; nenhuma alteração de banco, RPC, permissão ou dado em produção. A página financeira completa e os acessos das sócias ainda não estão implementados. O usuário pediu a implementação, mas três definições foram solicitadas e continuam pendentes: percentuais (os informados somam 105%), primeiro mês do período de seis meses e base do lucro (líquido ou margem das vendas).

## Pedido registrado
- Financeiro com entradas, saídas, fluxo de caixa, contas e relatórios.
- Repasses mensais aos três sócios: Aurizinete, Elizabete e Caio.
- Reserva de 50% do lucro mensal para os repasses, durante seis competências.
- Percentuais informados: 65%, 25% e 15%. NÃO normalizar nem corrigir silenciosamente.
- Aurizinete e Elizabete devem ter telas de consulta com nome, CPF, telefone, chave Pix e seus repasses, sem edição.
- Acesso individual e segregado deve ser confirmado no fluxo de implantação; não conceder papel de administrador às sócias para contornar a falta de permissões.
- Nenhuma transferência bancária ou pagamento Pix automático foi solicitado.

## O que foi preparado
app/admin/financeiro/distribution.ts é um módulo matemático puro, sem interface de produção, banco, rede ou pagamentos. Ele aceita lucro previamente apurado e validado; não calcula lucro a partir do faturamento atual. Exige três identificadores distintos, centavos inteiros não negativos, percentuais exatos de 100% e competências dentro dos seis meses. Usa BigInt internamente para evitar erros de precisão.

Proposta técnica de arredondamento: o fundo fica com a metade inteira em centavos; eventual meio centavo permanece na empresa. O rateio usa maiores restos, com desempate pelo identificador estável. Essas regras de fechamento precisam integrar a especificação aprovada antes da ativação. Período encerrado, lucro negativo ou configuração incompleta impedem o cálculo; não há política posterior aos seis meses presumida.

Sete testes sintéticos passaram em ambiente novo na nuvem: cálculo do fundo, rejeição dos 105%, limites dos seis meses cruzando o ano, entradas inválidas, lucro zero, conservação em 1.000 valores e independência da ordem, e limite seguro de inteiros. Nenhum teste usou dados reais.

## Lacunas confirmadas no modelo atual
A inspeção somente por leitura identificou pedidos com status, valores e data de criação; order_items contém quantidade e preço de venda. Não há custo histórico por linha de venda nem data de recebimento suficiente para um fechamento mensal confiável. Os custos em product_pricing são atuais; usá-los retroativamente mudaria o lucro de vendas anteriores.

O painel existente resume faturamento de pedidos por criação e inclui frete. Isso não pode ser apresentado como lucro distribuível. A data do pedido não deve substituir silenciosamente a data de recebimento.

## Implementação a concluir após as respostas
1. Definir os dados financeiros aditivos e suas regras em homologação: contas, lançamentos, recebimentos, despesas/taxas, vendas locais, custos históricos por item, competência e estornos.
2. Integrar vendas do site com vínculo único ao pedido para não duplicar recebimentos. Registrar a origem da venda e a modalidade de entrega separadamente: uma venda do site também pode ter envio.
3. Apurar o resultado mensal com cobertura explícita; vendas sem custo comprovado impedem o fechamento, sem preencher custos desconhecidos com zero.
4. Criar fechamento mensal auditável: prévia, conferência, fechamento, aprovação e pagamento registrado. Um mês fechado mantém valores/percentuais e histórico; correções geram ajustes rastreáveis. O mesmo repasse não pode ser registrado duas vezes.
5. Exibir fundo de 50%, parcela retida na empresa e valor de cada sócio. Não inferir participação de capital societário a partir dos percentuais de repasse.
6. Cadastro inicial dos dados pessoais por fluxo administrativo seguro separado. Nas telas de consulta não haverá formulário de edição. CPF, telefone e chave Pix não serão preenchidos com exemplos nem guardados no código, URLs, logs ou localStorage.
7. Portal de consulta com autenticação própria e acesso no banco restrito ao titular, inclusive contra alteração de URL ou chamadas diretas. Sem INSERT, UPDATE ou DELETE para sócias. Verificar MFA e não reutilizar o layout administrativo que exige acesso amplo à gestão.
8. Preparar SQL aditivo e rollback para revisão, segundo o procedimento de fases do usuário; não alterar lib/, supabase/, app/api/, RPCs ou validações existentes por este rascunho. Não executar SQL novo em produção.
9. Testar isoladamente contas distintas, negativa de edição, bloqueio de consulta cruzada, fechamento, estornos, precisão dos centavos e conservação dos testes atuais. Disponibilizar uma prévia com dados sintéticos, sem gravar na produção.

## Pendências de informação
- Corrigir os três percentuais para total de 100%.
- Informar o primeiro mês e ano.
- Escolher a definição do lucro que alimentará o fundo.
- Mais adiante: dia de vencimento do repasse, destino dos prejuízos/ajustes e identificação segura dos logins das sócias; os dados pessoais devem ser informados em fluxo privado, não em comentário de PR público.
