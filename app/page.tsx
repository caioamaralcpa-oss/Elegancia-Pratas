import Image from 'next/image';
import Link from 'next/link';
import { brl, products } from '@/lib/products';
import './preview-home.css';

// Produtos publicados no painel devem aparecer sem exigir um novo deploy.
export const dynamic = 'force-dynamic';

const categories = [
  { name: 'Anéis', image: '/images/category-aneis.png', href: '/catalogo?categoria=Anel' },
  { name: 'Colares', image: '/images/category-colares.png', href: '/catalogo?categoria=Colar' },
  { name: 'Brincos', image: '/images/category-brincos.png', href: '/catalogo?categoria=Brinco' },
];

export default async function Home() {
  const items = await products();
  return <main className="preview-home">
    <section className="preview-hero" aria-labelledby="hero-title"><Image src="/images/preview-hero.png" alt="Modelo usando joias prateadas em cenário claro" fill priority sizes="100vw"/><div className="preview-hero-copy"><p>JOIAS PARA TODOS OS SEUS MOMENTOS</p><h1 id="hero-title">Beleza em cada detalhe</h1><span>Peças que acompanham a sua história.</span><Link href="/catalogo">Conheça a coleção <span aria-hidden="true">→</span></Link></div></section>
    <section id="categorias" className="preview-categories"><div className="preview-section-heading"><div><p>EXPLORE A ELEGÂNCIA</p><h2>Encontre sua joia</h2></div><Link href="/catalogo">Ver todas as joias →</Link></div><div className="preview-categories-grid">{categories.map(category => <Link href={category.href} key={category.name}><div><Image src={category.image} alt={`Imagem conceitual da categoria ${category.name}`} fill sizes="(max-width: 600px) 30vw, 180px"/></div><span>{category.name}</span></Link>)}</div><small>Imagens das categorias são ilustrativas; as peças à venda aparecem abaixo com suas próprias fotos.</small></section>
    <section className="preview-featured"><div className="preview-section-heading"><div><p>SELEÇÃO ELEGÂNCIA</p><h2>Joias em destaque</h2></div><Link href="/catalogo">Explorar catálogo →</Link></div>{items.length ? <div className="preview-featured-grid">{items.slice(0, 4).map(product => <Link href={`/produto/${product.slug}`} key={product.id}><div className="preview-featured-image">{product.image_url ? <Image src={product.image_url} alt={product.name} fill unoptimized sizes="(max-width: 600px) 50vw, 25vw"/> : <span>Foto em breve</span>}</div><p>{product.category}</p><h3>{product.name}</h3><strong>{brl(product.price_cents)}</strong></Link>)}</div> : <p className="preview-featured-empty">As joias aparecerão aqui após a publicação no catálogo.</p>}</section>
    <section id="sobre" className="preview-about"><p>ELEGÂNCIA PRATAS</p><h2>Detalhes que fazem parte da sua história.</h2><Link href="/catalogo">Descubra nossas joias →</Link></section>
  </main>;
}
