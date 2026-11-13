# Sessão por inatividade
Implementação de 13/11/2026. Prazo adotado: 15 minutos, com aviso no último minuto e botão Continuar conectado.

## Comportamento
- Gestão (/admin) e consulta individual (/socios) compartilham a mesma regra. A loja pública não recebe temporizador.
- Interações reais de ponteiro, teclado, rolagem, toque e entrada de texto em página visível renovam o prazo. Refresh de tokens, renovação do cookie administrativo e requisições em segundo plano não contam como atividade.
- Ao expirar, o conteúdo autenticado é desmontado imediatamente, campos de autenticação/perfil são limpos, o endpoint DELETE de sessão já existente é chamado e signOut({scope:'local'}) é solicitado ao Supabase. Outros dispositivos não são encerrados por esse comando.
- Abas do mesmo navegador comunicam atividade e encerramento por BroadcastChannel, separadas pelo projeto Supabase e session_id. Não há polling de atividade no banco.
- Recarga conserva a marca de atividade por sessionStorage. Sem marca, uma aba pede o estado às demais antes de decidir; sem resposta usa a data de login já existente, jamais uma nova janela automática para uma sessão antiga.
- Retorno de suspensão, foco, pageshow/BFCache e mudança de visibilidade conferem o tempo transcorrido antes de aceitar nova atividade. Atividade após expiração não ressuscita a sessão.
- Login explícito com senha inicia um novo período. A verificação de usuário, administrador e MFA existente continua obrigatória.
- Se o armazenamento da sessão estiver indisponível, a retomada automática é recusada. Um login explícito ainda pode funcionar em memória.

## Dados e compatibilidade
Nenhuma tabela, registro financeiro, RPC, migração, fórmula, cor, dependência do produto ou arquivo em lib/, supabase/ e app/api/ foi alterado. O DELETE do cookie usa a rota já existente.
Nenhum arquivo do sistema ou credencial foi salvo na máquina do usuário. O navegador mantém somente um marcador temporário de sessão (ID da sessão, horário e bloqueio), sem conteúdo de cadastros, CPF, Pix ou senha; a persistência de autenticação Supabase já existente não foi substituída. Não há novo localStorage para os marcadores.
Formulários não enviados podem ser descartados ao sair; o aviso pede para salvar antes. Não há gravação automática de lançamentos financeiros.

## Verificação
- 51 testes da aplicação: passaram, incluindo seis testes novos de limites temporais, renovação, recarga, suspensão, dados inválidos, identidade estável após refresh e reabertura sem marcador.
- 12 verificações em Chromium passaram com o hook React real, relógio controlado, sessionStorage e BroadcastChannel reais: aviso, atividade, expiração, remoção de conteúdo, signOut local, ausência de ressurreição, recarga, reinício explícito, abas e retorno de suspensão/BFCache. Zero erros de página.
- O navegador dessa etapa usa um adaptador Auth sintético isolado; não é um novo teste de login/MFA contra contas reais ou uma auditoria de revogação de JWT no servidor. Nenhuma credencial pessoal ou transação real foi usada.
- Lint sem erros, com quatro avisos de imagens públicas preexistentes. Build otimizado e TypeScript executados no sandbox da nuvem; build Vercel deve estar READY antes de considerar publicado.
- Durante o ensaio, o relógio do Playwright foi ajustado para avançar uma única vez por contexto; a coordenação de uma aba nova foi corrigida para aguardar a resposta das outras antes de expirar o marcador inicial.
- Bibliotecas de QA (Playwright, Chromium e esbuild) ficaram somente no sandbox, sem alterações em package.json ou lockfile do produto.

## Limite de segurança
Esta é uma proteção de sessão na interface do navegador. Não substitui um timeout central no servidor nem a autorização das APIs. O encerramento remove refresh tokens quando o Supabase atende a solicitação, mas um access token JWT previamente emitido pode continuar válido até expirar. Sem rede, o conteúdo é bloqueado na interface e a marca impede retomada automática; não se declara revogação instantânea no servidor.
Referências: https://supabase.com/docs/guides/auth/signout e https://supabase.com/docs/guides/auth/sessions.
Não foram alterados o prazo de JWT, o plano Supabase, RLS ou verificações dos RPCs existentes.

## Validação na prévia
Usar homologação isolada e conta sintética, nunca registros financeiros de produção. Entrar com senha e MFA; observar aviso aos 14 minutos, renovar com interação e depois deixar 15 minutos sem uso. Conferir que dados desaparecem, recarga não retoma acesso e novo login exige senha/MFA. Conferir uma segunda aba e retorno de suspensão. Para automação, usar relógio apenas no navegador de teste, sem mudar o relógio do banco nem constantes do produto.
