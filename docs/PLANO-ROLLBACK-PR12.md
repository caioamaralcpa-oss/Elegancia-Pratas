# Plano de rollback — painel Elegância Pratas

Referência de segurança anterior ao PR 12; verificada em 10/11/2026. Não executar este plano durante a Fase 0.

**Alvo preservado:** `dpl_9viaa8ivUuzJ9XwN2HqwfJbXNrLN` · commit `c771eeaa1e35cd7388c55fc7bac49a20659b458a` · estado READY · produção.
[Deployment](https://vercel.com/99caio/eleganciapratas/9viaa8ivUuzJ9XwN2HqwfJbXNrLN) · [URL do build](https://eleganciapratas-f8s7mcuk4-99caio.vercel.app) · [site oficial](https://eleganciapratas.vercel.app).
Projeto `prj_XOaNHsZk3BWsSOY0sVb3WkXXQfGh`; equipe `team_BfTyhb8v1soUs4PyynpUurG9` / `99caio`.

## 1. Quando acionar

Após a liberação da Fase 1: divergência numérica, falha de login/MFA ou tela que não carrega. Interromper os testes; registrar erro, horário e novo deployment. Não tentar corrigir salvando dados ou alterando permissões.

## 2. Restaurar o site pela Vercel

Abrir o projeto eleganciapratas → Production Deployment → Instant Rollback. Selecionar exatamente o alvo acima; conferir que o domínio oficial está incluído e confirmar o retorno. A API também aceita esse deployment como destino de rollback. Nunca selecionar a última prévia por engano.

Verificado na Fase 0: `isRollbackCandidate: true`, READY, domínio oficial associado e acesso OWNER confirmado. O recurso e a elegibilidade foram conferidos por leitura; nenhum retorno foi executado ou cronometrado.

A Vercel redireciona os domínios para o build anterior, sem reconstruí-lo. Não atualiza variáveis antigas e não restaura banco ou arquivos. O rollback suspende a atribuição automática de novos deploys ao domínio; uma promoção deliberada posterior restabelece esse comportamento. [Procedimento oficial](https://vercel.com/docs/instant-rollback).

## 3. Reverter também o código no GitHub

Na Fase 1, usar **Create a merge commit** no PR 12 e registrar o SHA resultante. Para desfazer: abrir o PR já integrado → Revert → revisar o PR de reversão → executar os testes → integrar a reversão. O repositório permite merge commit e a conta conectada tem permissão de escrita.

Alternativa, em checkout limpo **na nuvem**, após substituir o marcador pelo SHA real:

```sh
git switch -c revert/pr-12 origin/main
git revert -m 1 <SHA_REAL_DO_MERGE_DO_PR_12>
```

Abrir PR para main; não fazer reset nem force push. O SHA do merge ainda não existe e não deve ser substituído pelo SHA da ponta da branch. [Reversão no GitHub](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/reverting-a-pull-request).

## 4. Verificar e encerrar

Confirmar pela Vercel que o domínio oficial serve o deployment esperado. Com autenticação normal, conferir páginas e valores apenas por leitura. Registrar o rollback, a reversão e a decisão sobre futuras promoções. Manter os backups intactos; restaurar dados seria uma operação separada, com autorização própria.
