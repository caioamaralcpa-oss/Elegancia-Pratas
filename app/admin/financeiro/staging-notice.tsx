export default function StagingNotice() {
  if (process.env.NEXT_PUBLIC_FINANCE_ENVIRONMENT !== 'homologacao') return null;
  return (
    <aside className="management-card finance-staging-notice" aria-label="Ambiente de homologação">
      <strong>Ambiente de homologação</strong>
      <p>Use somente dados de teste. Não cadastre informações pessoais ou vendas reais neste ambiente.</p>
    </aside>
  );
}
