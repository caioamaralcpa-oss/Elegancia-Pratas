# Fase 0 — preparação de segurança do PR 12

**Situação em 11/11/2026:** verificações técnicas e backups do banco/Storage concluídos e verificados. Nenhum merge, deploy de produção da loja, migração ou gravação na origem foi realizado. O backup foi executado em projeto separado na nuvem.

O usuário autorizou a Fase 0 e depois delegou a execução dos backups ao assistente. A conexão atualizada autenticou e a cópia completa foi verificada em **11/11/2026, 18:51:28 de Brasília**, atendendo ao requisito de banco e Storage antes do merge. A execução não antecipou a publicação da loja.

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

## Checklist de backup — concluído em 11/11/2026

- [x] **Projeto correto:** Supabase EleganciaPratas, sltohhqejguauhanjhfj; usuário/host validados antes da exportação.
- [x] **Banco:** exportação lógica PostgreSQL custom concluída, com snapshot repeatable read/read only; roles sem senhas e contagens de 51 tabelas no manifest. Archive não vazio e analisado por pg_restore --list.
- [x] **Storage:** 66 arquivos copiados, preservando nomes/caminhos e configurações dos dois buckets: jewelry-identification (65 arquivos, 2.955.876 bytes, privado) e product-images (1 arquivo, 69.740 bytes, público).
- [x] **Integridade:** tamanho/ETag MD5 aplicável/SHA-256 dos arquivos verificados; pacote completo privado baixado e conferido por tamanho/SHA-256; acesso anônimo negado. Não houve restauração em produção.
- [x] **Disponibilidade:** Blob privado separado elegancia-backups-privados, ligado somente ao executor elegancia-backup-privado, com pacote e VERIFIED.json. A rotina não exclui as cópias automaticamente.
- [x] **Registro da execução:** identificação, horários, contagens e checksum publicados no relatório, sem dados de clientes ou credenciais.

Pacote completo: **3.172.388 bytes**. Snapshot: **21:51:07 UTC**; conclusão: **21:51:28 UTC** (18:51:28 de Brasília). Execução: `2026-11-11T21-51-07.696Z-cd530846-b2ef-4e83-9762-9b8446c61e37`; deployment executor `dpl_8qhXPbei6JxCSGoE6vYoo8UoRjzt`, READY.

SHA-256: `fff2ee3326c7935a1b14088ef34d5ed0d7af9348f71e35e68c05e6abb08a4e30`.

Há também uma cópia independente das imagens, verificada às 18:41:18. As duas execuções deixaram 4 objetos e 6.237.931 bytes no Blob privado, incluindo as confirmações. Nenhum código ou dado foi salvo na máquina do usuário.

[Relatório e localização das cópias](https://github.com/caioamaralcpa-oss/Elegancia-Pratas/blob/ops/backup-seguro/ops/cloud-backup/README.md) · [Evidência da execução](https://github.com/caioamaralcpa-oss/Elegancia-Pratas/blob/ops/backup-seguro/ops/cloud-backup/execution-status-2026-11-11.json).

**Limite:** o dump real foi analisado e o pacote privado foi conferido por checksum; não foi feita restauração integral dos dados reais em outro banco. A restauração sintética anterior não substitui um ensaio integral de recuperação da produção.

## O que falta e como validar

**Preparação de backup concluída:** banco e Storage copiados e verificados por execução real na nuvem. Não restam pendências de credenciais para essa cópia.

**Reservado para a Fase 1:** merge commit, acompanhamento do deploy READY, logs e testes autenticados somente por leitura, incluindo comparação dos valores conhecidos com a versão anterior. Isso não foi antecipado.

Para revisar esta fase: abrir o PR e comparar os arquivos com a base; conferir o JSON das quatro execuções; abrir o deployment preservado no painel Vercel e consultar o plano de retorno. Não usar botões de salvar, publicar, ajustar saldo ou arrastar coleções durante a revisão.

**Requisito de backup cumprido.** A publicação continua separada desta execução e deve seguir o processo de fases definido pelo usuário. Não é necessário repetir a aprovação já dada para os preparativos.


## Execução delegada ao assistente

A execução foi feita exclusivamente pelo projeto de backup separado, com credenciais Sensitive/Production fornecidas pelo usuário. Após corrigir a conexão e validar a CA oficial do Supabase, a autenticação e a exportação funcionaram.

Na execução completa: 5 testes de ocultação de dados sensíveis em erros + 4 de headers/CA aprovados, 0 falhas e 0 vulnerabilidades no npm audit. A cópia independente das imagens passou em 5 testes e verificou a reconstrução de todos os arquivos depois da leitura privada.

Produção oficial confirmada em `dpl_9viaa8ivUuzJ9XwN2HqwfJbXNrLN`, READY, commit `c771eeaa`. O PR 12 permanece rascunho e sem merge. Não foram alterados lib/, supabase/, app/api/, fórmulas, RPCs ou validações da loja.
