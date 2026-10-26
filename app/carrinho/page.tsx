'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readCart, writeCart, type CartItem } from '@/lib/cart';
import { brl } from '@/lib/products';
export default function Carrinho() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { setItems(readCart()); }, []);
  function update(productId: string, quantity: number) { const next = items.map(i => i.productId === productId ? { ...i, quantity } : i).filter(i => i.quantity > 0); setItems(next); writeCart(next); }
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  return <main className="secao carrinho"><p className="eyebrow">SUA SELEÇÃO</p><h1>Carrinho</h1>{items.length ? <><div className="cart-list">{items.map(item => <article key={item.productId}><div className="cart-thumb">{item.imageUrl ? <img src={item.imageUrl} alt=""/> : 'Foto em breve'}</div><div><h2><Link href={`/produto/${item.slug}`}>{item.name}</Link></h2><p>{brl(item.priceCents)}</p><label>Quantidade <input type="number" min="1" max="99" value={item.quantity} onChange={e => update(item.productId, Math.max(1, Math.min(99, Number(e.target.value) || 1)))}/></label><button type="button" onClick={() => update(item.productId, 0)}>Remover</button></div><strong>{brl(item.priceCents * item.quantity)}</strong></article>)}</div><div className="cart-total"><p>Subtotal <strong>{brl(subtotal)}</strong></p><small>O preço e o estoque serão confirmados pelo servidor antes do pagamento. O frete será calculado pelo CEP.</small><p className="aviso">Checkout em preparação. Ainda não é possível concluir compras.</p></div></> : <div className="aviso"><p>Seu carrinho está vazio.</p><Link className="botao" href="/catalogo">Ver coleção</Link></div>}</main>;
}
