import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brl, products } from '@/lib/products';
import AddToCart from './add-to-cart';
import './produto.css';
import './preview-product.css';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await products()).find(item => item.slug === slug);
  return { title: product?.name ?? 'Joia', description: product?.description ?? 'Conheça esta joia da Elegância Pratas.' };
}

export default async function Produto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = await products();
  const product = all.find(item => item.slug === slug);
  if (!product) notFound();
  const photos = product.commercial_image_urls?.length ? product.commercial_image_urls : product.image_url ? [product.image_url] : [];
  const related = all.filter(item => item.id !== product.id && item.category === product.category).slice(0, 3);

  return <main className="shop-detail">
    <div className="shop-detail-inner">
      <nav className="shop-detail-breadcrumb" aria-label="Caminho da página"><Link href="/">Início</Link><span>/</span><Link href="/catalogo">Joias</Link><span>/</span><span aria-current="page">{product.name}</span></nav>
      <div className="shop-detail-layout">
        <div className="shop-detail-gallery" aria-label={`Fotos de ${product.name}`}>
          {photos.length ? photos.map((url, index) => <figure className={index === 0 ? 'shop-detail-photo shop-detail-photo-main' : 'shop-detail-photo'} key={url}><img src={url} alt={`${product.name} — foto ${index + 1}`} loading={index === 0 ? 'eager' : 'lazy'}/></figure>) : <div className="shop-detail-photo shop-detail-photo-main shop-detail-placeholder">E <small>FOTO EM BREVE</small></div>}
        </div>
        <section className="shop-detail-summary" aria-labelledby="product-name"><p className="shop-detail-kicker">ELEGÂNCIA PRATAS <span aria-hidden="true">✦</span> {product.category}</p><h1 id="product-name">{product.name}</h1><div className="shop-detail-price">{brl(product.price_cents)}</div><p className="shop-detail-stock"><span aria-hidden="true">●</span> {product.stock > 0 ? 'Disponível' : 'Indisponível no momento'}</p>
          {product.description && <div className="shop-detail-description"><h2>Sobre a joia</h2><p>{product.description}</p></div>}
          {(product.measurements || product.material) && <div className="shop-detail-specs"><h2>Detalhes da peça</h2>{product.measurements && <div><span>Medidas</span><strong>{product.measurements}</strong></div>}{product.material && <div><span>Material</span><strong>{product.material}</strong></div>}</div>}
          <div className="shop-detail-purchase"><AddToCart item={{ productId: product.id, slug: product.slug, name: product.name, priceCents: product.price_cents, imageUrl: product.image_url }} stock={product.stock}/><p>O carrinho está disponível para consulta. Frete e pagamento online ainda não foram ativados.</p></div>
          <Link className="shop-detail-back" href="/catalogo">← Continuar explorando joias</Link>
        </section>
      </div>
      {related.length > 0 && <section className="shop-detail-related"><div><p className="shop-detail-kicker">PARA COMPLETAR SUA ESCOLHA</p><h2>Outras joias para você</h2></div><div className="shop-detail-related-grid">{related.map(item => <Link key={item.id} href={`/produto/${item.slug}`}><div className="shop-detail-related-image">{item.image_url ? <img src={item.image_url} alt={item.name} loading="lazy"/> : <span>Foto em breve</span>}</div><h3>{item.name}</h3><p>{brl(item.price_cents)}</p></Link>)}</div></section>}
    </div>
  </main>;
}
