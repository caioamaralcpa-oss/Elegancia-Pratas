import Link from 'next/link';

export default function PendingSection({ number, title, description }: { number: string; title: string; description: string }) {
  return <main className="management-page"><p className="eyebrow">ETAPA {number} · EM PREPARAÇÃO</p><h1>{title}</h1><div className="management-card management-pending"><p>{description}</p><p>Esta seção será ligada às joias cadastradas. Ela ainda não permite alterar preços, estoque ou publicar peças.</p><Link className="management-outline" href="/admin/joias">Voltar às joias →</Link></div></main>;
}
