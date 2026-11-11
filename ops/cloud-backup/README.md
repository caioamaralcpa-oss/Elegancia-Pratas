# Backup privado da Elegância Pratas

**Estado em 11/11/2026: rotinas preparadas e testadas; nenhum backup real concluído. Merge do PR 12 continua bloqueado.**
O usuário autorizou a execução dos backups. As credenciais foram cadastradas como Sensitive no projeto separado, mas as verificações identificaram conexão PostgreSQL de outro projeto e uma chave de Storage de formato não reconhecido. As senhas/chaves não foram exibidas. A existência das variáveis não equivale a uma cópia concluída.

## Ambiente separado

- Projeto Vercel: `elegancia-backup-privado` (`prj_vC695Zpqu6c5Qe6vInSCKZ9OItdL`).
- [Cadastrar credenciais](https://vercel.com/99caio/elegancia-backup-privado/settings/environment-variables).
- Armazenamento Vercel Blob: `elegancia-backups-privados` (`store_yroVHhRBhJB7TcEo`), acesso **private**, ligado somente ao projeto de backup.
- Projeto Supabase de origem fixado: `sltohhqejguauhanjhfj`.
- Proteção Vercel Authentication em todos os endereços do projeto de backup; a página não expõe arquivos nem executa backups por requisição HTTP.
- A implantação da loja, o PR 12, seus diretórios protegidos, banco, RPCs, permissões e variáveis de ambiente permanecem inalterados por esta preparação.
- Nenhum dado real ou credencial foi salvo no repositório nem na máquina do usuário.

## Correções de acesso pendentes

No link acima, corrigir as duas variáveis existentes **somente no projeto elegancia-backup-privado**, ambiente Production, marcadas como **Sensitive**:

| Nome | Conteúdo |
| --- | --- |
| BACKUP_DATABASE_URL | Conexão PostgreSQL completa, com a senha, do projeto da Elegância. Usar Supabase → Connect → Session pooler, porta 5432, do projeto sltohhqejguauhanjhfj. O host direto foi confirmado, mas o teste no ambiente de backup retornou ENETUNREACH por ser IPv6; não usar esse caminho neste ambiente. Não usar a URL HTTP da API, chave anon ou pooler de transações. |
| BACKUP_STORAGE_SERVICE_KEY | A chave de servidor service_role (JWT) ou sb_secret_ do mesmo Supabase, usada para ler as fotos privadas. Não usar chave anon/publicável, senha ou URL de conexão. |

As credenciais devem ser cadastradas diretamente no painel seguro da Vercel, usando o salvamento do usuário; não colar no chat, no código, em links públicos ou em documentos do repositório. Não redefinir a senha do banco para esta tarefa sem uma decisão separada.

Quando estiverem cadastradas, o responsável pela execução deve iniciar uma nova implantação **deste projeto de backup**, usando os arquivos desta pasta e npm ci. Uma edição de variável sozinha não dispara a cópia; não promover nenhum deployment da loja para fazer backup.

## O que a rotina faz quando houver credenciais

1. Abre uma sessão PostgreSQL com transação repeatable read e read only. As ferramentas pg_dump/pg_dumpall também recebem default_transaction_read_only=on; não há SQL de escrita contra a origem.
2. Exporta o snapshot para pg_dump, produzindo um archive custom consistente; guarda roles sem senhas e confere o archive com pg_restore --list.
3. Lê o inventário de todos os buckets/objetos no mesmo snapshot. Copia os bytes pelo Storage API, conferindo tamanho, ETag MD5 quando aplicável e SHA-256. Os nomes originais ficam no manifest; os arquivos físicos usam nomes hash para impedir travessia de diretórios.
4. Empacota banco, roles, manifest e objetos; grava o pacote no Blob privado; baixa a cópia e compara tamanho e SHA-256. Confere também que acesso sem autenticação é negado.
5. Só então grava VERIFIED.json com contagens, horário, caminho e checksum. Se qualquer etapa falhar, não registra sucesso e não libera merge.
6. Encerra o ambiente temporário; as cópias ficam no armazenamento privado persistente. As credenciais são usadas apenas no ambiente do processo e não entram no pacote.

A rotina não restaura produção, não muda preços/saldos, não publica joias e não executa migrações. A confirmação de um backup não autoriza avançar de fase sem observar o portão definido pelo usuário.

## Evidências de preparação em 10/11/2026

Inventário real, consultado somente por leitura:

| Bucket | Visibilidade | Objetos | Bytes |
| --- | --- | ---: | ---: |
| jewelry-identification | Privado | 65 | 2955876 |
| product-images | Público | 1 | 69740 |
| Total | — | 66 | 3025616 |

Isso é um inventário, não uma cópia e não uma conferência de integridade dos arquivos reais.

Validação da rotina: PostgreSQL 17.11 em ambiente isolado na nuvem, dois testes aprovados. Foram testados os bloqueios de origem incorreta, espera por credenciais, exportação, restauração de banco sintético, preservação de valores, impedimento de escrita pela sessão de leitura, conferência de arquivos e rejeição de readback corrompido.

Dependências fixadas com lockfile: @vercel/sandbox 3.9.1, @vercel/blob 2.9.0, pg 8.23.1. Foi aplicado override de Zod 4.6.6 à ferramenta de backup para corrigir o alerta da dependência transitiva; npm audit final informou **0 vulnerabilidades**. Nenhuma dependência da loja foi alterada.

A prova de armazenamento usa um objeto sintético temporário, confere leitura autenticada/negação sem autenticação e remove apenas esse próprio objeto do projeto separado. Não exporta nenhum dado da produção e não equivale a um backup concluído.


## Execuções e bloqueios em 11/11/2026

- A conexão PostgreSQL cadastrada passou na validação sintática, mas a proteção de origem retornou WRONG_SOURCE_PROJECT antes de conectar ao banco (deployment dpl_HfeL9xqShjc58C6YDfa6f8Jobzfs). Não foi testada a senha contra outro projeto.
- O host oficial foi confirmado pelo conector Supabase e pela URL pública configurada na loja. O teste de rede isolado do endereço direto encontrou apenas IPv6 e retornou ENETUNREACH, sem tentar autenticação.
- O conector atual não fornece o host Session pooler, nem permite ler as variáveis Sensitive. Esse host deve ser copiado de Connect no projeto correto; não pode ser deduzido a partir da região.
- A execução independente de Storage foi interrompida na etapa initialize: INVALID_STORAGE_CREDENTIAL. A classificação segura retornou formato unrecognized, sem revelar o valor e antes de fazer solicitações à origem. Remover aspas, espaços ou uma atribuição reconhecida não resolveu o valor cadastrado.
- As cinco verificações da rotina independente passaram no build de produção isolado: reconstrução de bytes, rejeição de corrupção, projeto/caminhos duplicados/inválidos, tamanho/ETag/alterações concorrentes e tratamento de invólucros de credenciais. Instalação com lockfile: 0 vulnerabilidades.
- Deployment de evidência: dpl_Am9UVtJepBbBuBsKzUU6qcQPuUoc. O build terminou com erro porque a credencial real não passou na validação; testes aprovados não significam backup concluído.
- Blob privado conferido novamente: 0 objetos e 0 bytes. Produção oficial segue READY em c771eeaa, deployment dpl_9viaa8ivUuzJ9XwN2HqwfJbXNrLN. PR 12 permanece rascunho e sem merge.

## Cópia independente das imagens

storage-only.mjs permite copiar o Storage sem depender da conexão PostgreSQL. Executar exclusivamente no projeto de backup, com buildCommand definido como:

`node --check storage-only.mjs && node --test storage-only.test.mjs && node storage-only.mjs`

A rotina lista todos os buckets e percorre as pastas com paginação, baixa cada arquivo por leitura e verifica tamanho, ETag MD5 aplicável e SHA-256. Repete o inventário para detectar mudanças durante a cópia. Nomes originais e configurações dos buckets ficam no pacote JSON comprimido; as credenciais não integram o pacote.

O pacote é enviado somente ao Blob privado. A cópia é baixada, descomprimida e cada arquivo é reconstruído/verificado; o acesso anônimo deve ser negado. VERIFIED.json é gravado apenas depois dessas verificações e também tem sua leitura conferida. Sua marcação contém kind=storage_only e databaseBackupIncluded=false.

Uma cópia independente das imagens **não atende sozinha o requisito de backup do banco e do Storage**. Só liberar a etapa seguinte quando os dois estiverem concluídos e conferidos. Não restaurar imagens nem banco em produção para testar. Nenhuma biblioteca adicional foi necessária para essa rotina.

## Recuperação e limites

O pacote conterá database.dump, roles.sql, manifest.json e objects/. O manifest preserva bucket, nome original, tamanho e SHA-256 de cada objeto. pg_restore e a recriação dos objetos do Storage devem ser feitos em destino autorizado, preservando o caráter privado de jewelry-identification.

Senhas de roles não integram roles.sql. Configurações externas, chaves de provedores e raízes de criptografia de serviços gerenciados não são substituídas por um dump PostgreSQL; recuperações para outro projeto Supabase exigem as etapas específicas do provedor. A restauração sintética da rotina não prova uma recuperação integral da produção. Qualquer restauração em produção exige autorização própria.

[Procedimento do Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) · [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) · [Armazenamento privado](https://vercel.com/docs/vercel-blob/private-storage).
