import type { Metadata } from 'next';
import Link from 'next/link';
import { brl, products } from '@/lib/products';
import './catalogo.css';

export const metadata: Metadata = { title: 'Joias | Catálogo', description: 'Explore as joias da Elegância Pratas.' };

export default async function Catalogo({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; colecao?: string }> }) {
  const { q, categoria, colecao } = await searchParams;
  const all = await products();
  const query = (q ?? '').trim().toLocaleLowerCase('pt-BR');
  const categories = [...new Set(all.map(product => product.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const selectedCategory = categories.includes(categoria ?? '') ? categoria ?? '' : '';
  const collections = [...new Map(all.filter(product => product.collection_id && product.collections?.name).map(product => [product.collection_id!, product.collections!.name])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  const selectedCollection = collections.some(([id]) => id === colecao) ? colecao ?? '' : '';
  const items = all.filter(product => (!query || `${product.name} ${product.description ?? ''}`.toLocaleLowerCase('pt-BR').includes(query)) && (!selectedCategory || product.category === selectedCategory) && (!selectedCollection || product.collection_id === selectedCollection));
  const categoryUrl = (category: string) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set('q', q.trim());
    if (category) params.set('categoria', category);
    if (selectedCollection) params.set('colecao', selectedCollection);
    return `/catalogo${params.size ? `?${params}` : ''}`;
  };
  const collectionUrl = (id: string) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set('q', q.trim());
    if (selectedCategory) params.set('categoria', selectedCategory);
    if (id) params.set('colecao', id);
    return `/catalogo${params.size ? `?${params}` : ''}`;
  };

  return <main className="shop-catalog">
    <div className="shop-catalog-banner"><span>CURADORIA ELEGÂNCIA</span><span aria-hidden="true">✦</span><span>PEÇAS PARA BRILHAR TODOS OS DIAS</span></div>
    <div className="shop-catalog-inner">
      <div className="shop-catalog-intro"><p className="shop-catalog-kicker">ELEGÂNCIA PRATAS <span aria-hidden="true">✦</span> NOSSA SELEÇÃO</p><h1>Joias que contam<br/><em>a sua história.</em></h1><p>Encontre a peça certa para cada momento. Explore nossa seleção e descubra os detalhes de cada joia.</p></div>
      <form className="shop-catalog-search" role="search"><label htmlFor="catalog-search">Encontre sua joia</label><div><input id="catalog-search" name="q" type="search" placeholder="Busque por nome ou detalhe" defaultValue={q ?? ''}/>{selectedCategory && <input type="hidden" name="categoria" value={selectedCategory}/>} {selectedCollection && <input type="hidden" name="colecao" value={selectedCollection}/>}<button type="submit" aria-label="Buscar joias">Buscar <span aria-hidden="true">→</span></button></div></form>
      <nav className="shop-catalog-categories" aria-label="Filtrar por categoria"><Link href={categoryUrl('')} aria-current={!selectedCategory ? 'page' : undefined}>Todas as joias</Link>{categories.map(category => <Link key={category} href={categoryUrl(category)} aria-current={selectedCategory === category ? 'page' : undefined}>{category}</Link>)}</nav>
      <nav id="colecoes" className="shop-catalog-categories" aria-label="Filtrar por coleção"><Link href={collectionUrl('')} aria-current={!selectedCollection ? 'page' : undefined}>Todas as coleções</Link>{collections.map(([id, name]) => <Link key={id} href={collectionUrl(id)} aria-current={selectedCollection === id ? 'page' : undefined}>{name}</Link>)}</nav>
      <div className="shop-catalog-results"><div><p className="shop-catalog-kicker">EXPLORE A COLEÇÃO</p><h2>{collections.find(([id]) => id === selectedCollection)?.[1] || selectedCategory || 'Todas as joias'}</h2></div><span>{items.length} {items.length === 1 ? 'joia encontrada' : 'joias encontradas'}</span></div>
      {items.length ? <div className="shop-catalog-grid">{items.map(product => <Link className="shop-product" href={`/produto/${product.slug}`} key={product.id} aria-label={`Ver ${product.name}, ${brl(product.price_cents)}`}><div className="shop-product-image">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy"/> : <span className="shop-product-placeholder">E <small>FOTO EM BREVE</small></span>}<span className="shop-product-arrow" aria-hidden="true">↗</span></div><div className="shop-product-info"><span className="shop-product-category">{product.collections?.name ?? product.category}</span><h3>{product.name}</h3><p>{brl(product.price_cents)}</p><span className="shop-product-link">Ver detalhes <span aria-hidden="true">→</span></span></div></Link>)}</div> : <div className="shop-catalog-empty"><span aria-hidden="true">✦</span><h2>Nenhuma joia encontrada</h2><p>Experimente outra busca ou veja a coleção completa.</p><Link href="/catalogo">Ver todas as joias →</Link></div>}
    </div>
  </main>;
}
