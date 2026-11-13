# Financeiro publicado no sistema oficial

Estado conferido em 13/11/2026, horário de Brasília.

## Publicação
- [Financeiro oficial](https://eleganciapratas.vercel.app/admin/financeiro).
- [Consulta das sócias](https://eleganciapratas.vercel.app/socios).
- [Ativação de senha](https://eleganciapratas.vercel.app/ativar-acesso).
- PR 14 integrado em 77d4ea86fd4c122e7937f86e9836ee8312c7f566; PR 15 em e1015a11e72564e1e79233a2b8799abc0961dbac.
- Build funcional verificado: dpl_F7aU3uZ6zHvD7wUxNo2grDgw6Jii, READY. Este relatório altera somente documentação.
- Supabase oficial sltohhqejguauhanjhfj. SQL financeiro aditivo aplicado após autorização posterior do usuário para publicar no sistema oficial. Nenhuma migração criada ou RPC antigo alterado.
- Sete tabelas financeiras com RLS; nenhuma função financeira executável por anon. Views de consulta preservam isolamento por usuário e MFA.
- Flag financeira ativa apenas em Production do projeto oficial; paleta e dados anteriores preservados.

## Backup anterior à publicação
Executor separado elegancia-backup-privado, dpl_ABKVLHbgP39on3ZTKwhxnCh5KHj8. Backup privado verificado em 12/11/2026 às 18:27 de Brasília:
- Execução 2026-11-12T21-27-23.953Z-a3d2db8e-fbfd-4494-a07d-97c16caa2cfd.
- 51 tabelas inventariadas e 66 imagens copiadas; pacote 3.172.869 bytes.
- SHA256 8c7626bb06fe9d176f78356cd303ce79393b67837077e43841ae681b67414f79.
- Leitura de volta e checksum conferidos; armazenamento privado; zero gravações na origem pela rotina.
- Dump analisado por pg_restore --list; não foi feita restauração integral real.
- Guardado no Blob privado já existente, sem cópia na máquina do usuário.

## Verificações
- Comparação das 14 tabelas existentes antes/depois do SQL: conteúdo idêntico.
- 36 testes numéricos passaram. Lint sem erros; quatro avisos preexistentes de imagens públicas.
- Login administrativo com senha e MFA reais no endereço oficial: passou usando conta temporária exclusiva da verificação.
- Financeiro sem overflow horizontal ou erros de página em 1440, 768 e 390 px.
- Quatro verificações da API oficial passaram: acesso anônimo recusado, resumo sem MFA recusado, resumo com MFA permitido e três participações totalizando 100%.
- Nenhum lançamento financeiro sintético foi gravado na produção.
- Ativação: oito verificações na prévia passaram, incluindo sessão obrigatória, confirmação de senha, destino restrito e três larguras. A atualização de senha foi interceptada no teste; nenhuma senha real foi alterada.
- HTTP oficial: loja, catálogo, portal e ativação retornaram 200; Financeiro sem sessão retornou 307 para login.
- Consulta de logs error/fatal nos 20 minutos após a publicação não retornou grupos. Trata-se da janela observada, não de monitoramento permanente.
- Conta temporária e respectivo papel administrativo removidos; função temporária de configuração encerrada com HTTP 410.
- Rechecagem em 13/11: 65 produtos, zero vendas e zero lançamentos financeiros, três contas novas pendentes de ativação e nenhuma conta temporária restante.

## Acessos e pendências
O administrador anterior continua preservado. A nova conta administrativa e as duas contas de consulta foram criadas sem senha e sem confirmação automática de e-mail. As sócias não receberam perfil administrativo. Endereços pessoais não constam deste repositório.

O envio de mensagens de ativação ainda não foi autorizado nem executado. A página de ativação está publicada e os redirecionamentos oficiais foram conferidos sem envio. A pendência de configuração de URLs era da homologação; não deve ser aplicada ao projeto oficial.

CPF, telefone e chave Pix reais não foram inventados ou cadastrados. A gestão deverá preenchê-los no cadastro privado e único antes de as sócias consultarem seus perfis. Contas não vinculadas não enxergam cadastros de terceiros.

Os repasses continuam baseados em 50% do lucro líquido mensal entre dezembro/2026 e maio/2027: Aurizinete 60%, Elizabete 25%, Caio 15% do fundo. Dezembro só poderá fechar a partir de janeiro/2027. O sistema registra pagamentos já realizados; não executa Pix.

As duas medições de desempenho pendentes e os apontamentos de acessibilidade/segurança da estrutura-base permanecem documentados no [relatório de homologação](FINANCEIRO-HOMOLOGACAO-2026-11-12.md). Notas da homologação não são apresentadas como medições da produção com dados reais. Nada foi salvo na máquina do usuário.
