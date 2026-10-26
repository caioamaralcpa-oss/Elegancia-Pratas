import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = { title: { default: 'Elegância Pratas', template: '%s | Elegância Pratas' }, description: 'Joias para iluminar todos os seus momentos.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><header className="topo"><Link className="marca" href="/" aria-label="Elegância Pratas, início"><span>ELEGÂNCIA <i aria-hidden>✦</i></span><small>PRATAS</small></Link><nav aria-label="Navegação principal"><Link href="/catalogo">Coleção</Link><Link href="/#sobre">Sobre</Link><Link href="/carrinho">Carrinho</Link></nav></header>{children}<footer><strong>ELEGÂNCIA <small>PRATAS</small></strong><p>O brilho que acompanha a sua história.</p></footer></body></html>;
}
