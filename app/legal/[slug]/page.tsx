// RASCUNHOS JURÍDICOS: exigem revisão de advogado antes da publicação.
import { notFound } from 'next/navigation';
import { legalDocuments } from '@/lib/legal';

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  if (process.env.LEGAL_PAGES_REVIEWED !== 'true') notFound();
  const { slug } = await params;
  const document = legalDocuments[slug];
  if (!document) notFound();
  return <main className="secao legal shop-legal"><p className="eyebrow">ELEGÂNCIA PRATAS</p><h1>{document.title}</h1><p>Última atualização: {document.updated}</p>{document.sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</main>;
}
