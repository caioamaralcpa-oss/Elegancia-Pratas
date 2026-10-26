import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Carrinho' };
export default function Carrinho() { return <main className="secao"><h1>Carrinho</h1><p className="aviso">O carrinho será ativado junto com o checkout, após a configuração de pagamentos, frete e estoque.</p></main> }
