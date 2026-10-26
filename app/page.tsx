import Image from 'next/image';
import Link from 'next/link';
import { brl, products } from '@/lib/products';

// Produtos publicados no painel devem aparecer sem exigir um novo deploy.
export const dynamic = 'force-dynamic';

const categories = [
  { name: 'Colares', image: '/images/category-colares.png', href: '/catalogo?categoria=Colares' },
  { name: 'Anéis', image: '/images/category-aneis.png', href: '/catalogo?categoria=Anéis' },
  { name: 'Brincos', image: '/images/category-brincos.png', href: '/catalogo?categoria=Brincos' },
];

export default async function Home() {
  const items = await products();
  return <main className="home-editorial">
    <section className="editorial-hero" aria-labelledby="hero-title">
      <Image className="editorial-hero-image" src="/images/editorial-hero.png" alt="Modelo usando joias prateadas em uma produção editorial vinho" fill priority sizes="100vw"/>
      <div className="editorial-hero-shade" aria-hidden="true"/>
      <div className="editorial-hero-content"><p className="editorial-kicker">PRATAS QUE REALÇAM A SUA ESSÊNCIA</p><h1 id="hero-title">Beleza em cada detalhe<span className="editorial-star" aria-hidden="true">✦</span></h1><p>Peças para expressar o que torna você única.</p><Link className="editorial-button" href="/catalogo">Ver coleção <span aria-hidden="true">↗</span></Link></div>
      <a className="editorial-scroll" href="#categorias">Descubra mais <span aria-hidden="true">↓</span></a>
    </section>
    <section id="categorias" className="editorial-categories" aria-labelledby="categories-title"><div className="editorial-section-heading"><p className="editorial-kicker">ESCOLHA SEU BRILHO</p><h2 id="categories-title">Joias para cada momento</h2><p>Encontre o estilo que combina com você.</p></div><div className="editorial-category-grid">{categories.map(category => <Link className="editorial-category" href={category.href} key={category.name}><Image src={category.image} alt={`Imagem conceitual de ${category.name.toLowerCase()} prateados`} fill sizes="(max-width: 700px) 100vw, 33vw"/><span className="editorial-category-overlay"><strong>{category.name}</strong><span>Explorar <span aria-hidden="true">↗</span></span></span></Link>)}</div><p className="editorial-image-note">Imagens de ambientação. As peças à venda serão exibidas com fotos e informações próprias no catálogo.</p></section>
    <section className="editorial-products" aria-labelledby="products-title"><div className="editorial-products-head"><div><p className="editorial-kicker">NOSSAS JOIAS</p><h2 id="products-title">Escolhas que encantam</h2></div><Link href="/catalogo">Ver todas as peças <span aria-hidden="true">↗</span></Link></div>{items.length ? <div className="editorial-product-grid">{items.slice(0, 4).map(product => <Link className="editorial-product" href={`/produto/${product.slug}`} key={product.id}><div className="editorial-product-image">{product.image_url ? <Image src={product.image_url} alt={product.name} fill unoptimized sizes="(max-width: 700px) 50vw, 25vw"/> : <span>Foto em breve</span>}</div><h3>{product.name}</h3><p>{brl(product.price_cents)}</p></Link>)}</div> : <div className="editorial-empty"><span aria-hidden="true">✦</span><p>A coleção está sendo preparada. Em breve, as peças estarão aqui.</p></div>}</section>
    <section id="sobre" className="editorial-about"><span className="editorial-about-star" aria-hidden="true">✦</span><p className="editorial-kicker">ELEGÂNCIA PRATAS</p><h2>O essencial nunca deixa de brilhar.</h2><p>Uma curadoria para celebrar seus momentos e a beleza dos detalhes.</p><Link href="/catalogo">Conhecer a coleção <span aria-hidden="true">↗</span></Link></section>
  </main>;
}
