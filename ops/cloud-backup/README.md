# Backup privado da Elegância Pratas

**Estado em 11/11/2026: backups do banco e do Storage concluídos e verificados.**

Conclusão do pacote completo: **18:51:28 de Brasília (21:51:28 UTC)**. A conexão atualizada pelo usuário autenticou com sucesso. Não houve gravação na origem, restauração em produção, migração ou alteração de configuração da loja. O PR 12 permanece rascunho e sem merge; a implantação oficial segue em c771eeaa.

## Onde estão as cópias

- Projeto de origem: Supabase **sltohhqejguauhanjhfj**, EleganciaPratas.
- Projeto executor separado: Vercel **elegancia-backup-privado** (prj_vC695Zpqu6c5Qe6vInSCKZ9OItdL).
- [Painel do projeto de backup](https://vercel.com/99caio/elegancia-backup-privado).
- Blob **elegancia-backups-privados** (store_yroVHhRBhJB7TcEo), região iad1, acesso **private**, ligado somente ao projeto de backup.
- Arquivos não publicados no endereço da implantação. Vercel Authentication protege os endereços do executor.
- Nenhum código da loja, dado real, backup ou credencial foi salvo na máquina do usuário. O repositório guarda somente código da ferramenta e evidências sem conteúdo de clientes ou segredos.

## Identificação do backup completo

| Campo | Valor medido |
| --- | --- |
| Execução | 2026-11-11T21-51-07.696Z-cd530846-b2ef-4e83-9762-9b8446c61e37 |
| Deployment executor | dpl_8qhXPbei6JxCSGoE6vYoo8UoRjzt — READY |
| Snapshot do banco | 2026-11-11T21:51:07.811Z |
| Conclusão | 2026-11-11T21:51:28.934Z |
| Tabelas com contagem no manifest | 51 |
| Objetos de Storage copiados | 66 |
| Bytes dos objetos de origem | 3025616 |
| Bytes do pacote completo | 3172388 |
| Gravações na origem pela rotina | 0 |

Caminho no armazenamento privado:

`sltohhqejguauhanjhfj/2026-11-11T21-51-07.696Z-cd530846-b2ef-4e83-9762-9b8446c61e37/backup.tar.gz`

Confirmação da execução: VERIFIED.json na mesma pasta.

SHA-256 do pacote:

`fff2ee3326c7935a1b14088ef34d5ed0d7af9348f71e35e68c05e6abb08a4e30`

O pacote backup.tar.gz contém database.dump, roles.sql, manifest.json e objects/. O dump usa o formato custom do PostgreSQL; roles.sql não inclui senhas. O manifest preserva contagens de tabelas, configurações dos buckets, nomes/caminhos originais, tamanhos e checksums. Os arquivos físicos de imagens recebem nomes hash para impedir travessia de diretórios.

Contagens de tabelas abrangem public, auth, storage e supabase_migrations. Esse número não é uma contagem declarada de todas as tabelas internas do PostgreSQL.

## Conferências executadas

1. A origem é validada contra o projeto esperado antes de conectar. A autenticação funcionou usando o Session pooler e a senha atualizada, sem exibir seu conteúdo.
2. Sessão PostgreSQL repeatable read e read only, com snapshot exportado para pg_dump. As ferramentas também recebem default_transaction_read_only=on e limites de espera.
3. database.dump não vazio e aceito por pg_restore --list; exportação de roles sem senhas concluída.
4. Todos os 66 objetos do Storage copiados. Tamanho, ETag MD5 quando aplicável e SHA-256 conferidos; buckets privados preservados como privados no manifest.
5. Pacote enviado ao Blob privado, baixado de volta e conferido por tamanho e SHA-256. O acesso sem autenticação foi negado.
6. VERIFIED.json gravado apenas depois dessas verificações. O ambiente temporário é encerrado ao terminar.

Inventário conferido antes da execução:

| Bucket | Visibilidade na origem | Objetos | Bytes |
| --- | --- | ---: | ---: |
| jewelry-identification | Privado | 65 | 2955876 |
| product-images | Público | 1 | 69740 |
| Total | — | 66 | 3025616 |

O inventário dos arquivos é lido no snapshot do banco. Os bytes do Storage não participam de uma transação PostgreSQL; alterações concorrentes que resultem em diferença de tamanho/ETag interrompem a rotina, sem sucesso presumido.

## Cópia independente das imagens

Uma cópia anterior de Storage foi concluída às **18:41:18 de Brasília**, sem depender do banco:

- Execução: `2026-11-11T21-40-52.716Z-654b6746-a70a-40d9-b73a-864006842cd9`.
- Deployment: `dpl_4dyJjbVNYna1yysYguvzwUJwjQ5x`.
- Caminho: `sltohhqejguauhanjhfj/storage-only/2026-11-11T21-40-52.716Z-654b6746-a70a-40d9-b73a-864006842cd9/storage-backup.json.gz`.
- Pacote JSON comprimido: 3064163 bytes, 66 arquivos, 2 buckets.
- SHA-256: `ef62fc2f7dca9330e66fa8cfc63de169d000ee31618e900c7b79e4bbd929946a`.
- Arquivo privado baixado, descomprimido e todos os objetos reconstruídos/verificados. Inventário antes/depois comparado; acesso anônimo negado; confirmação também lida de volta.
- kind=storage_only e databaseBackupIncluded=false. Essa cópia isolada não substitui o pacote completo.

Após as duas execuções, o Blob privado foi consultado e retornou **4 objetos e 6.237.931 bytes**, incluindo os dois pacotes e suas confirmações.

## Segurança da conexão e dependências

A CA pública supabase-ca.crt foi obtida via HTTPS no endereço configurado pelo [Studio oficial](https://github.com/supabase/supabase/blob/f38928ad90f1c2bd44f668411fb1d2312754d258/apps/studio/hooks/custom-content/custom-content.json):

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

A rotina confere CA, autoassinatura, validade e fingerprint SHA-256 **807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA**. Node usa rejectUnauthorized=true; pg_dump usa verify-full com a mesma CA. A configuração SSL de produção não foi modificada.

Chaves sb_secret_ usam apenas o header apikey. Chaves legadas mantêm o Bearer correspondente. Credenciais são usadas somente no processo privado e não entram nos pacotes, páginas, código ou logs.

Dependências da ferramenta: @vercel/sandbox 3.9.1, @vercel/blob 2.9.0 e pg 8.23.1; override Zod 4.6.6. Nenhuma dependência da loja foi alterada.

Na execução completa: **5 testes de ocultação de dados sensíveis em erros e 4 de headers/CA aprovados; 0 falhas e 0 vulnerabilidades no npm audit**. Na execução independente: **5 testes aprovados**. A preparação anterior também testou exportação/restauração de banco sintético, preservação de valores, bloqueio de escrita e rejeição de corrupção em ambiente isolado.

## Repetir ou recuperar

Executar novamente somente no projeto de backup, com arquivos desta pasta, npm ci --ignore-scripts e npm run backup. São necessárias BACKUP_DATABASE_URL e BACKUP_STORAGE_SERVICE_KEY como Sensitive/Production, além do token do Blob privado. Não alterar o projeto da loja para fazer backup. A rotina não agenda cópias automáticas.

Para uma cópia independente de imagens: node --check storage-only.mjs && node --test storage-only.test.mjs && node storage-only.mjs, definindo esse comando apenas no executor separado.

Os pacotes ficam no Blob privado sem exclusão automática pela rotina. Preservá-los até o encerramento da implantação; nenhuma cópia real foi removida.

**Limite da verificação real:** o dump foi analisado e seu pacote foi conferido por checksum, mas não foi feita restauração integral dos dados reais em outro banco. A restauração sintética anterior não equivale a um ensaio integral de recuperação da produção. Qualquer recuperação deve usar destino autorizado e preservar o caráter privado de jewelry-identification.

Senhas de roles, chaves de provedores e raízes externas de criptografia não são substituídas por um dump PostgreSQL. Seguir o procedimento do provedor para uma recuperação em outro projeto. Restaurar em produção exige autorização própria.

[Evidência da execução](execution-status-2026-11-11.json) · [Recuperação Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) · [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).
