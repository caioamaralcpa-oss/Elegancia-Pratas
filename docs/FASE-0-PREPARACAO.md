# Fase 0 — preparação de segurança do PR 12

**Situação:** verificações técnicas concluídas; aguardando a execução e verificação dos backups. Nenhum merge, deploy de produção, migração, alteração de ambiente ou gravação no banco/Storage foi realizado nesta fase.

O usuário autorizou a execução da Fase 0 e informou nesta conversa que **ainda precisa fazer os backups**. O item 5 da Fase 0 do documento de trabalho exige aguardar essa confirmação antes do merge.

## Escopo verificado

- PR: [12](https://github.com/caioamaralcpa-oss/Elegancia-Pratas/pull/12), aberto e em rascunho; merge sem conflitos informado pelo GitHub.
- Branch: `redesign/experiencia-erp`.
- Commit testado do zero: [c1332b406ce354a6f309ea7d2f98921447827e11](https://github.com/caioamaralcpa-oss/Elegancia-Pratas/commit/c1332b406ce354a6f309ea7d2f98921447827e11).
- Base e produção: `c771eeaa1e35cd7388c55fc7bac49a20659b458a`.
- Comparação: 22 arquivos alterados; nenhum SQL, migração, schema ou configuração de ambiente.
- Nenhum diff em `lib/`, `supabase/`, `app/api/`, `package.json` ou lockfile.
- Os 19 corpos de funções originais de gravação, conversão e validação comparados permaneceram idênticos.
- Contratos RPC mantidos: nenhum nome ou conjunto de parâmetros adicionado/removido. Há 15 pontos de chamada contra 14 na base: o quadro de Coleções reutiliza `assign_jewelry_collection` com os mesmos parâmetros `p_product_ids` e `p_collection_id`. Não há nova função SQL nem alteração da RPC. Arrastar nesse quadro grava um vínculo e fica fora dos testes de leitura.

Foram acrescentados após o commit testado apenas documentos de preparação, evidências e retorno; nenhum arquivo funcional foi alterado nesta fase.

## Execução limpa na nuvem

Ambiente temporário novo da Vercel, sem reaproveitar node_modules, Node 24.22.1 e npm 11.19.1. O projeto Vercel está configurado para Node 24.x.

Horário: 10/11/2026, 17:50:13–17:50:52 UTC (14:50:13–14:50:52 de Brasília). Tempos arredondados:

| Comando | Resultado | Tempo |
| --- | --- | ---: |
| npm ci | Código 0; 339 pacotes instalados; auditoria automática informou 0 vulnerabilidades | 8 s |
| npm test | 28 aprovados; 0 falhas | 1 s |
| npm run lint | 0 erros; 4 avisos preexistentes no site público | 3 s |
| npm run build | Aprovado; código 0 | 27 s |

O npm também exibiu avisos de descontinuação do ESLint instalado e de postinstall não liberado de unrs-resolver. Não foram atualizadas dependências nem liberados scripts adicionais; todas as verificações passaram.

Os comandos usaram apenas uma URL Supabase deliberadamente inválida e uma chave sem acesso no processo isolado. Isso não altera variáveis do projeto Vercel. O ensaio confirma instalação/testes/build, sem usar credenciais do banco de produção e sem atestar login/MFA ou acesso aos dados reais.

Evidências: [JSON da preparação](quality/phase0-preflight.json).

## Produção e retorno preservados

- Deployment ativo: `dpl_9viaa8ivUuzJ9XwN2HqwfJbXNrLN`, READY, alvo production.
- [Painel do deployment](https://vercel.com/99caio/eleganciapratas/9viaa8ivUuzJ9XwN2HqwfJbXNrLN).
- [URL imutável do build](https://eleganciapratas-f8s7mcuk4-99caio.vercel.app).
- Domínio oficial associado: [eleganciapratas.vercel.app](https://eleganciapratas.vercel.app).
- A Vercel retornou `isRollbackCandidate: true`; a conta conectada tem papel OWNER. O GitHub permite merge commit.
- Elegibilidade e acesso foram conferidos por leitura. Não foi executado rollback para provar funcionamento, pois isso alteraria produção.

[Plano de rollback de uma página](PLANO-ROLLBACK-PR12.md): retorno imediato na Vercel, reversão do commit de merge no GitHub e verificação por leitura.

## Checklist de backup — a concluir antes do merge

Manter as cópias em armazenamento seguro na nuvem, separado do projeto de produção, conforme a preferência de não guardar o sistema ou os dados nesta máquina. Não colocar backups, fotos privadas ou credenciais no repositório público.

- [ ] **Projeto correto:** confirmar no Supabase o projeto usado pela loja; anotar o identificador, a data/hora de corte e o responsável. Não compartilhar senhas ou chaves nesta conversa.
- [ ] **Banco:** em Supabase → projeto → Database → Backups, conferir o backup recente, o horário e a retenção. Se não houver backup disponível no plano, providenciar uma exportação lógica completa em ambiente de backup na nuvem; CSV de uma tabela não basta. Guardar schema, funções/políticas, dados e informações necessárias de permissões/roles para recuperação, de acordo com o procedimento do Supabase.
- [ ] **Storage:** copiar separadamente todos os objetos, preservando nomes e caminhos, incluindo os buckets `product-images` (fotos comerciais) e `jewelry-identification` (identificação privada), além de qualquer outro bucket existente. Esses nomes foram identificados no código; o inventário real deve ser confirmado no projeto. Registrar configuração dos buckets e políticas sem tornar imagens privadas públicas.
- [ ] **Integridade:** registrar quantidade e tamanho total por bucket e conferir amostras das cópias; para a exportação do banco, verificar que os arquivos não estão vazios e guardar seus checksums. Não restaurar nem sobrescrever produção para testar o backup.
- [ ] **Disponibilidade:** conferir que a cópia está concluída, protegida e acessível ao responsável pela recuperação, com retenção suficiente até o encerramento da implantação.
- [ ] **Confirmação:** informar nesta conversa que os backups **do banco e do Storage** estão concluídos, com horário e identificação da cópia, sem anexar dados de clientes ou credenciais.

O Supabase esclarece que o backup do banco **não inclui os objetos do Storage**; o backup de fotos precisa ser separado. Os backups automáticos e sua retenção dependem do plano. [Banco e limites](https://supabase.com/docs/guides/platform/backups) · [Exportação e recuperação](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## O que falta e como validar

**Pendente agora:** os dois backups e a confirmação do usuário. Nenhum backup foi criado ou presumido por esta auditoria.

**Reservado para a Fase 1:** merge commit, acompanhamento do deploy READY, logs e testes autenticados somente por leitura, incluindo comparação dos valores conhecidos com a versão anterior. Isso não foi antecipado.

Para revisar esta fase: abrir o PR e comparar os arquivos com a base; conferir o JSON das quatro execuções; abrir o deployment preservado no painel Vercel e consultar o plano de retorno. Não usar botões de salvar, publicar, ajustar saldo ou arrastar coleções durante a revisão.

**Portão mantido fechado para produção enquanto os backups estiverem pendentes.** Não é necessário repetir a aprovação já dada para executar estes preparativos.


## Execução dos backups delegada ao assistente

O usuário solicitou que o assistente execute os três passos de backup e informou que a conexão/senha está salva no WhatsApp. Foram confirmados o projeto Supabase EleganciaPratas e o inventário real: 65 objetos privados em jewelry-identification (2955876 bytes) e 1 público em product-images (69740 bytes). Não houve exportação dos dados reais.

Foi preparado o projeto Vercel separado **elegancia-backup-privado**, com Blob privado próprio, sem alterar configurações da loja. A rotina passou em dois testes de exportação/restauração sintética e proteção de integridade; auditoria de dependências final com zero vulnerabilidades. Falta cadastrar as credenciais de exportação no ambiente seguro do projeto separado; a chave sensível da loja não é revelada pelos conectores atuais e não há WhatsApp conectado nesta sessão.

[Rotina, evidências e instruções](https://github.com/caioamaralcpa-oss/Elegancia-Pratas/blob/ops/backup-seguro/ops/cloud-backup/README.md) · [Cadastro seguro no projeto de backup](https://vercel.com/99caio/elegancia-backup-privado/settings/environment-variables).

**Os backups de banco e Storage continuam pendentes. O merge não está liberado.**
