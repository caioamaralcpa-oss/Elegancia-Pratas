# Financeiro e repasses mensais aos sócios

**Publicado no sistema oficial após autorização do usuário. Estado conferido em 13/11/2026.**

[Publicação, verificações e pendências atuais](FINANCEIRO-PRODUCAO.md). As medições da homologação abaixo são históricas.

## Regras confirmadas pelo usuário
- Período: dezembro de 2026 a maio de 2027, seis competências.
- Fundo mensal: 50% do lucro líquido apurado; os demais 50% permanecem na empresa.
- Aurizinete: 60% do fundo; Elizabete: 25%; Caio: 15%.
- Lucro líquido: vendas menos custos, taxas e despesas do mês. A implementação inicial registra vendas já recebidas, a data do recebimento e o frete cobrado/pago; não presume receita em pedidos ainda pendentes.
- Valores e fechamento por competência. Nenhum Pix ou transferência bancária é executado pelo sistema.
- Cadastros das sócias e respectivos repasses somente para consulta individual.

## Implementado
/admin/financeiro: resumo, contas e saldos, vendas recebidas, entradas/saídas, transferências entre contas, demonstração do resultado mensal, quadro de sócios e registro de pagamento realizado.

As vendas registram custo histórico e evidência da conferência. Vendas sem custo ficam pendentes, sem lucro inventado, até a gestão conferir o custo. Pedidos do site exigem ID de pedido pago e valores compatíveis; o vínculo único impede duplicação. A integração atual é por registro conferido, sem novos webhooks ou alterações no checkout.

Origem (site/presencial/outro) e entrega (envio/retirada) são campos diferentes. Uma venda enviada não é registrada duas vezes. A entrada de caixa da venda é gerada automaticamente; taxas e frete já pago geram saídas nas contas explicitamente escolhidas, sem dupla dedução no lucro. Esses lançamentos usam a data informada. Não registrar novamente essas mesmas saídas em Movimentações. As compras de estoque não são novamente consideradas como despesa operacional quando o custo já integra a venda.

O fechamento exige confirmação explícita de que todas as vendas recebidas e despesas foram conferidas, além da confirmação final do administrador. Ele bloqueia competências fora do plano, meses não encerrados, participações inválidas, custos pendentes e lucro negativo. Com prejuízo, não é gerado repasse automático; compensação futura de perdas ainda requer uma regra do usuário. Os registros de uma competência fechada ficam protegidos pelas funções transacionais; ajustes devem ser registrados e justificados em competência aberta.

Pagamentos só podem ser marcados como já realizados, uma vez por repasse, em data não futura e conta escolhida. A saída correspondente é contabilizada sem reduzir novamente o lucro. O histórico financeiro registra ator, ação, horário e alterações de registros financeiros. Dados pessoais de cadastro não são duplicados nesse histórico.

/admin/financeiro/cadastros: cadastro inicial privado e único pela gestão. O CPF é validado; telefone e chave Pix são obrigatórios. O e-mail deve corresponder a uma conta de autenticação existente. Aurizinete e Elizabete não podem ser vinculadas a contas com perfil administrativo. Cadastros já preenchidos não podem ser substituídos por essa operação.

/socios: portal com login e segundo fator. Cada pessoa consulta somente o próprio nome, CPF, telefone, chave Pix, percentual e histórico mensal. O mesmo endereço /socios atende as duas sócias: a conta autenticada determina o cadastro e os repasses visíveis, sem seleção de pessoa por URL. As views finance_my_partner_profile e finance_my_payouts usam security_invoker=true e RLS por auth.uid; sócias não têm concessões de INSERT/UPDATE/DELETE. A proteção não depende de ocultar botões.

## Operação e dados pessoais
Os e-mails reais das sócias foram recebidos separadamente e não constam do repositório público. Uma conta administrativa adicional e duas contas de consulta foram preparadas em produção para os endereços fornecidos pelo usuário; as três aguardam ativação. Não foram inventados nem cadastrados CPF, telefone ou chave Pix reais, e os cadastros privados das sócias ainda não foram preenchidos ou vinculados. Não há persistência financeira em localStorage; somente a sessão de autenticação segue o comportamento já utilizado pelo Supabase. Não colocar dados pessoais no chat, em SQL público, no GitHub ou em logs.

O cadastro inicial da gestão é o local para preencher os dados privados depois que o ambiente for aprovado e preparado. Criar as contas de consulta sem acesso de administrador; elas não devem compartilhar credenciais.

## Precisão e limites
O módulo matemático usa inteiros/BigInt e rejeita percentuais diferentes de 100%. O PostgreSQL executa os mesmos cálculos em inteiros/numeric. O fundo é metade inteira em centavos; eventual meio centavo permanece na empresa. Centavos restantes no rateio são distribuídos pelo método de maiores restos, com desempate por ID estável.

Para o primeiro fechamento, a competência de dezembro/2026 só pode ser encerrada a partir de janeiro/2027. O sistema não estima a data de pagamento como uma obrigação já cumprida.

A versão inicial não implementa contas futuras parceladas, conciliação bancária automática, importação automática retroativa de custos, emissão fiscal ou pagamentos Pix. Essas etapas não são simuladas por números fictícios nem apresentadas como concluídas. Recebimentos e despesas precisam ser conferidos pela gestão.

## Banco e ativação
[SQL aditivo para revisão](sql/financeiro-socios.review.sql) e [rollback](sql/financeiro-socios.rollback.sql). O SQL foi testado em PostgreSQL descartável na nuvem e, após aprovação, aplicado no Supabase separado de homologação cgcaykrtfxlkrbopycyn. Foram usadas a estrutura-base existente e contas sintéticas com autenticação e MFA reais, sem copiar pedidos, clientes ou imagens de produção. Depois da autorização posterior para publicar no sistema oficial e de um novo backup verificado, o mesmo SQL foi aplicado ao projeto de produção sltohhqejguauhanjhfj. A comparação das 14 tabelas existentes antes/depois da aplicação confirmou seu conteúdo preservado.

Não há alteração de lib/, supabase/, app/api/, cálculos antigos, dependências ou RPCs existentes. Novas funções têm prefixo finance_; as tabelas novas têm RLS e escrita somente por funções com administrador e MFA. O rollback remove somente objetos novos listados, sem mudar os objetos antigos. Antes de um rollback real, preservar os novos registros financeiros.

NEXT_PUBLIC_FINANCE_ENABLED=true está configurada em Production no projeto oficial autorizado. NEXT_PUBLIC_FINANCE_ENVIRONMENT=producao mantém a sinalização de homologação fora do sistema oficial. Não usar prévias que compartilham o banco de produção para testes de escrita.

A preparação inicial manteve o SQL fora de produção para revisão e homologação. A publicação ocorreu somente após a instrução posterior do usuário para levar o módulo ao sistema oficial, com backup novo e validação autenticada. Não foram alterados RPCs antigos, fórmulas ou diretórios protegidos.

## Validação
- 36 testes da aplicação (28 anteriores + 8 de rateio), 0 falhas.
- 14 testes de PostgreSQL isolado: permissões/MFA, lucro, transferências, custo pendente/comprovado, duplicação de pedidos, datas de fechamento, CPF/cadastro único, segregação das sócias, pagamento duplicado, auditoria e fechamento mensal.
- O teste positivo de fechamento usa relógio fixo somente no banco sintético; o SQL de aplicação usa o horário real do servidor.
- Rollback testado: zero tabelas financeiras restantes e duas tabelas-base sintéticas preservadas.
- Lint: zero erros; quatro avisos preexistentes de imagens no site público.
- Build de produção com configuração sintética e a flag habilitada, sem acesso a dados reais.
- 18 verificações da API hospedada com usuários reais de teste e MFA passaram: permissões, isolamento, bloqueio de edição, cálculo do lucro, saldos, duplicação, datas e cadastro único.
- Login administrativo e das duas contas de consulta passou pelo navegador com MFA real. Nove verificações de enquadramento em 1440/768/390 passaram, sem overflow horizontal ou erros de página.
- As quatro abas financeiras foram navegadas nos três tamanhos; cadastro de conta pela interface e feedback de sucesso confirmados.
- Lighthouse executado no build de produção da homologação: Financeiro 96/100/100 (Desempenho/Acessibilidade/Boas Práticas). Resultados das outras rotas e limitações de captura constam no relatório específico.
- Registros, dados pessoais sintéticos e três contas Auth de teste foram removidos após os ensaios. Bootstrap temporário encerrado com HTTP 410.
- Nenhum código ou dado foi gravado na máquina do usuário.

Para uso real, acesse /admin/financeiro no sistema oficial com a conta administrativa existente. A nova conta administrativa aguarda ativação; seu envio por e-mail depende de autorização explícita. As contas de consulta também estão pendentes de ativação, e CPF, telefone e Pix devem ser preenchidos no cadastro privado da gestão. /ativar-acesso permite definir senha com uma sessão válida de autenticação; não envia mensagens. As URLs oficiais foram conferidas por geração de link sintético sem envio. Não há necessidade de alterar as URLs da produção com base na pendência antiga da homologação.
