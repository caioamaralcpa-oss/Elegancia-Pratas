import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import './storefront-theme.css';
import './preview-layout.css';
import ConsentManager from './consent';
import ThemeToggle from './theme-toggle';

export const metadata: Metadata = { title: { default: 'Elegância Pratas', template: '%s | Elegância Pratas' }, description: 'Joias para iluminar todos os seus momentos.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const legalReviewed = process.env.LEGAL_PAGES_REVIEWED === 'true';
  return <html lang="pt-BR" data-store-theme="light" suppressHydrationWarning><body><div className="editorial-announcement">ELEGÂNCIA PRATAS <span aria-hidden="true">✦</span> JOIAS PARA ACOMPANHAR SEUS MOMENTOS</div><header className="topo"><div className="store-header-main"><Link className="marca" href="/" aria-label="Elegância Pratas, início"><span>ELEGÂNCIA <i aria-hidden>✦</i></span><small>PRATAS</small></Link><form className="store-header-search" action="/catalogo" role="search"><label className="sr-only" htmlFor="store-search">Buscar joias</label><input id="store-search" type="search" name="q" placeholder="Buscar joias pelo nome ou detalhe"/><button type="submit" aria-label="Buscar">⌕</button></form><div className="store-header-utility"><Link href="/carrinho" aria-label="Abrir carrinho">Sacola <span aria-hidden="true">♧</span></Link><ThemeToggle/></div></div><nav className="store-header-nav" aria-label="Navegação principal"><Link href="/catalogo">Todas as joias</Link><Link href="/catalogo?categoria=Anel">Anéis</Link><Link href="/#categorias">Coleções</Link><Link href="/#sobre">Sobre a marca</Link></nav></header>{children}<footer><strong>ELEGÂNCIA <small>PRATAS</small></strong><p>O brilho que acompanha a sua história.</p>{legalReviewed && <nav aria-label="Informações da loja"><Link href="/legal/sobre">Quem somos</Link><Link href="/legal/privacidade">Privacidade</Link><Link href="/legal/termos">Termos</Link><Link href="/legal/trocas">Trocas</Link><Link href="/legal/contato">Contato</Link></nav>}</footer><ConsentManager enabled={legalReviewed}/></body></html>;
}
