import type { Metadata } from 'next';
import Link from 'next/link';
import { brl, products } from '@/lib/products';
import './catalogo.css';
import './preview-catalog.css';

export const metadata: Metadata = { title: 'Joias | Catálogo', description: 'Explore as joias da Elegância Pratas.' };

export default async function Catalogo({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; ordem?: string; preco?: string }> }) {
  const { q, categoria, ordem, preco } = await searchParams;
  const all = await products();
  const query = (q ?? '').trim().toLocaleLowerCase('pt-BR');
  const categories = [...new Set(all.map(product => product.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const selectedCategory = (categoria ?? '').trim().slice(0, 40);
  const maxPrice = preco === '200' ? 20000 : preco === '500' ? 50000 : null;
  const items = all.filter(product => (!query || `${product.name} ${product.description ?? ''}`.toLocaleLowerCase('pt-BR').includes(query)) && (!selectedCategory || product.category === selectedCategory) && (!maxPrice || product.price_cents <= maxPrice));
  if (ordem === 'menor-preco') items.sort((a, b) => a.price_cents - b.price_cents);
  if (ordem === 'maior-preco') items.sort((a, b) => b.price_cents - a.price_cents);
  const categoryUrl = (category: string) => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set('q', q.trim());
    if (category) params.set('categoria', category);
    if (ordem) params.set('ordem', ordem);
    if (preco) params.set('preco', preco);
    return `/catalogo${params.size ? `?${params}` : ''}`;
  };

  return <main className="shop-catalog preview-catalog"><div className="shop-catalog-inner"><nav className="preview-breadcrumb" aria-label="Caminho da página"><Link href="/">Início</Link> <span>›</span> <span>Joias</span></nav><div className="preview-catalog-heading"><div><p>ELEGÂNCIA PRATAS</p><h1>{selectedCategory || 'Todas as joias'}</h1><span>{items.length} {items.length === 1 ? 'joia encontrada' : 'joias encontradas'}</span></div></div><div className="preview-catalog-layout"><aside className="preview-filters"><h2>Filtrar por</h2><nav aria-label="Filtrar por categoria"><h3>Categoria</h3><Link href={categoryUrl('')} aria-current={!selectedCategory ? 'page' : undefined}>Todas as joias</Link>{categories.map(category => <Link key={category} href={categoryUrl(category)} aria-current={selectedCategory === category ? 'page' : undefined}>{category}</Link>)}</nav><form><h3>Preço máximo</h3>{q && <input type="hidden" name="q" value={q}/>}{selectedCategory && <input type="hidden" name="categoria" value={selectedCategory}/>}{ordem && <input type="hidden" name="ordem" value={ordem}/>}<select name="preco" defaultValue={preco ?? ''} aria-label="Preço máximo"><option value="">Qualquer preço</option><option value="200">Até R$ 200</option><option value="500">Até R$ 500</option></select><button type="submit">Aplicar filtro</button></form></aside><div className="preview-catalog-content"><form className="preview-sort"><label htmlFor="catalog-order">Ordenar por</label>{q && <input type="hidden" name="q" value={q}/>}{selectedCategory && <input type="hidden" name="categoria" value={selectedCategory}/>}{preco && <input type="hidden" name="preco" value={preco}/>}<select id="catalog-order" name="ordem" defaultValue={ordem ?? ''}><option value="">Mais recentes</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option></select><button type="submit">Aplicar</button></form>{items.length ? <div className="shop-catalog-grid">{items.map(product => <Link className="shop-product" href={`/produto/${product.slug}`} key={product.id} aria-label={`Ver ${product.name}, ${brl(product.price_cents)}`}><div className="shop-product-image">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy"/> : <span className="shop-product-placeholder">E <small>FOTO EM BREVE</small></span>}</div><div className="shop-product-info"><span className="shop-product-category">{product.category}</span><h3>{product.name}</h3><p>{brl(product.price_cents)}</p></div></Link>)}</div> : <div className="shop-catalog-empty"><h2>Nenhuma joia encontrada</h2><p>Experimente outra busca ou veja a coleção completa.</p><Link href="/catalogo">Ver todas as joias →</Link></div>}</div></div></div></main>;
}
