# Campanhas, calendário e IA — preparação

Primeira versão construída integralmente na nuvem. Não altera lib/, supabase/, app/api/, fórmulas ou RPCs antigos. O novo SQL fica em docs/sql para revisão e homologação. A página existente de coleções mantém seus fluxos e ganha links para /admin/colecoes/campanhas.

## Funcionalidades
- Calendário mensal, datas comerciais fixas e móveis, datas próprias e repetição anual. 29/02 anual é lembrado em 28/02 em anos comuns.
- Datas móveis: segundo domingo de maio e agosto; Black Friday no dia seguinte à quarta quinta-feira de novembro. Natal e virada do ano atravessam corretamente o ano.
- Maio aparece como mês das noivas; Dia da Noiva pode ser cadastrado como ação própria, sem inventar uma data nacional.
- Lembretes dentro da página em faixas de 30, 15 e 7 dias, atualizados ao acessar. Não há push, e-mail, WhatsApp ou agendamento pessoal do Codex.
- Planejamento com coleção, objetivo, público, responsável, período e andamento.
- Inspirações editáveis de post, carrossel, Stories, roteiro de Reels e conceito de promoção, salvas apenas por ação da gestão.
- Histórico dos 30 registros mais recentes nesta primeira versão; registros não são excluídos por esse limite de exibição.

## IA e dados
Integração HTTP com AI Gateway da Vercel, usando autenticação OIDC por requisição ou uma chave privada configurada no servidor. Sem dependência de IA adicionada ao produto; Zod existente valida entrada e resposta. Modelo selecionado do catálogo ao vivo: google/gemini-3.5-flash-lite.

Apenas nome da coleção, objetivo, público, ocasião e nomes/modelos de até 30 peças publicadas com saldo positivo entram no contexto. Não são consultados CPF, telefone, Pix, custos, margens ou fotos privadas para enviar ao modelo. Coleção sem peças elegíveis recebe apenas conceitos genéricos. Nenhum preço, desconto ou estoque é alterado pela IA; ofertas exigem revisão na Precificação.

Há 60 tentativas mensais por loja, cinco diárias por administrador, intervalo mínimo de um minuto e saída máxima de 1.800 tokens. A reserva é transacional no banco; tentativas com erro contam. Esses limites controlam consumo, não constituem um teto monetário contratual com o provedor. Não foi habilitada recarga automática nem alterado plano de cobrança.

## Verificação até esta preparação
- 45 testes da aplicação passaram (36 anteriores, cinco de calendário e quatro de contrato de entrada/saída da IA).
- Lint sem erros após correção; quatro avisos preexistentes no site público.
- 13 verificações da API hospedada passaram: MFA/permissões, persistência, datas, vínculo de coleção e limites configurados.
- Calendário, campanha, persistência após recarga, edição de eventos/campanhas/inspirações e toast de sucesso passaram pela interface.
- Nove verificações de largura em três abas passaram em 1440/768/390, sem erros da página.
- A conexão real foi exercitada e o Gateway retornou HTTP 403 exigindo cartão válido na conta Vercel para liberar acesso, inclusive aos créditos gratuitos. Não houve geração concluída nem resposta simulada apresentada como IA. A IA permanece desabilitada em produção até essa habilitação externa.
- Limites diário e mensal foram testados no banco de homologação com preenchimento sintético do contador; ambas as solicitações foram bloqueadas antes de consultar o provedor.
- Advisor: RLS habilitada nas quatro tabelas; funções de escrita usam autorização administrativa com MFA. Avisos genéricos de SECURITY DEFINER são documentados e não equivalem a concessão a qualquer usuário autenticado.

Fontes de calendário: https://cliente.sebraees.com.br/calendario-promocional e tradição comercial de maio descrita em https://jacquesjanine.com.br/noticias/mes-das-noivas-conheca-a-historia-da-tradicao-e-a-origem-do-dia-da-noiva/.

Nenhum código, banco, imagem ou credencial foi salvo na máquina do usuário. As credenciais de testes ficam somente no sandbox descartável na nuvem. Contas e registros sintéticos devem ser removidos ao encerrar os testes.

## Publicação e dados existentes
Backup novo e verificado antes da estrutura aditiva: execução 2026-11-13T12-42-20.345Z-81d1feb0-dd9b-4fb4-bd07-cc59dd599dcb, 58 tabelas inventariadas, 66 imagens, 3.182.038 bytes, SHA256 c9bc96269fefece413414be2c80bd6cd26a4ee3acea8a8496a57dce426ca0408. Armazenamento privado; leitura de volta conferida; zero gravações na origem pela rotina. O dump foi analisado, sem restauração integral real.

O SQL foi aplicado de forma aditiva ao projeto oficial após homologação. As 21 tabelas públicas existentes tiveram contagens e checksums comparados antes/depois, sem diferença. Os eventos comerciais são calculados em código; não foram inseridas campanhas ou dados de teste na produção.

Calendário e planejamento foram publicados com NEXT_PUBLIC_CAMPAIGN_ENABLED=true. CAMPAIGN_AI_ENABLED=false e NEXT_PUBLIC_CAMPAIGN_AI_READY=false impedem requisições pagas enquanto a conta aguarda habilitação. O modelo está configurado somente no servidor. A Vercel recusou a geração por exigir cartão; não foi alterado plano, cadastrado pagamento ou habilitada recarga automática. O usuário foi informado e a decisão sobre essa configuração permanece com ele.

## Uso no sistema oficial
Abra Coleções → Calendário e campanhas. Cadastre ocasiões próprias e planos de divulgação; o conteúdo salvo fica no Supabase. A seção de IA mostra a pendência de habilitação e mantém o botão desabilitado enquanto o provedor não liberar a conta. Depois dessa liberação, é necessário habilitar as flags de IA e concluir um teste real antes de declarar a geração operacional.

## Encerramento da implementação
PR 16 integrado em 4cb9fa83c7bd4eb5be518a2d04c000f728d39213. Build funcional dpl_AoLebhHQRRoF1gsQD5FEtjo2d8HV: READY. Loja pública retornou 200; Coleções, Campanhas e Financeiro sem sessão retornaram 307 para o acesso administrativo. A consulta de erros/fatal da implantação nos dez minutos observados não retornou grupos; não é monitoramento permanente.

As duas contas Auth sintéticas e seus vínculos administrativos foram removidos. Eventos, planos, inspirações e contadores sintéticos foram limpos do banco de homologação; a função temporária foi substituída por HTTP 410. A produção ficou com zero registros novos de campanha até o início do uso real, sem transferência dos testes.

A geração real continua pendente da exigência externa de cartão válido pela Vercel. Só deve ser considerada operacional após habilitação e uma geração real validada. O calendário e o planejamento não dependem dessa habilitação.
