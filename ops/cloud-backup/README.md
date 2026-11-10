# Backup privado da Elegância Pratas

**Estado: preparado e testado com dados sintéticos; nenhum backup dos dados reais foi criado ainda.**
O usuário delegou os três passos de backup, mas informou que a conexão/senha está salva no WhatsApp. Não há conexão do WhatsApp disponível nesta sessão; os conectores atuais também não revelam a chave sensível de produção da Vercel.

## Ambiente separado

- Projeto Vercel: `elegancia-backup-privado` (`prj_vC695Zpqu6c5Qe6vInSCKZ9OItdL`).
- [Cadastrar credenciais](https://vercel.com/99caio/elegancia-backup-privado/settings/environment-variables).
- Armazenamento Vercel Blob: `elegancia-backups-privados` (`store_yroVHhRBhJB7TcEo`), acesso **private**, ligado somente ao projeto de backup.
- Projeto Supabase de origem fixado: `sltohhqejguauhanjhfj`.
- Proteção Vercel Authentication em todos os endereços do projeto de backup; a página não expõe arquivos nem executa backups por requisição HTTP.
- A implantação da loja, o PR 12, seus diretórios protegidos, banco, RPCs, permissões e variáveis de ambiente permanecem inalterados por esta preparação.
- Nenhum dado real ou credencial foi salvo no repositório nem na máquina do usuário.

## Única etapa pendente de acesso

No link acima, criar as duas variáveis **somente no projeto elegancia-backup-privado**, ambiente Production, marcadas como **Sensitive**:

| Nome | Conteúdo |
| --- | --- |
| BACKUP_DATABASE_URL | Conexão PostgreSQL completa, com a senha, do projeto da Elegância. Usar Supabase → Connect → Session pooler, porta 5432, ou a conexão direta acessível. Não usar a URL HTTP da API, chave anon ou pooler de transações. |
| BACKUP_STORAGE_SERVICE_KEY | A chave de servidor service_role do mesmo Supabase, usada para ler as fotos privadas. |

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

## Recuperação e limites

O pacote conterá database.dump, roles.sql, manifest.json e objects/. O manifest preserva bucket, nome original, tamanho e SHA-256 de cada objeto. pg_restore e a recriação dos objetos do Storage devem ser feitos em destino autorizado, preservando o caráter privado de jewelry-identification.

Senhas de roles não integram roles.sql. Configurações externas, chaves de provedores e raízes de criptografia de serviços gerenciados não são substituídas por um dump PostgreSQL; recuperações para outro projeto Supabase exigem as etapas específicas do provedor. A restauração sintética da rotina não prova uma recuperação integral da produção. Qualquer restauração em produção exige autorização própria.

[Procedimento do Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) · [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) · [Armazenamento privado](https://vercel.com/docs/vercel-blob/private-storage).
