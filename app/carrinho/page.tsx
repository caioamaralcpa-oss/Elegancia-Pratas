'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readCart, writeCart, type CartItem } from '@/lib/cart';
import { brl } from '@/lib/products';
import './carrinho.css';

type VerifiedQuote = { subtotalCents: number; items: { productId: string; name: string; quantity: number; unitPriceCents: number; totalCents: number }[] };

export default function Carrinho() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [quote, setQuote] = useState<VerifiedQuote | null>(null);
  const [quoteStatus, setQuoteStatus] = useState('');

  useEffect(() => { setItems(readCart()); }, []);
  useEffect(() => {
    if (!items.length) { setQuote(null); setQuoteStatus(''); return; }
    const controller = new AbortController();
    setQuote(null); setQuoteStatus('Confirmando preço e estoque...');
    fetch('/api/checkout/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(item => ({ productId: item.productId, quantity: item.quantity })) }),
      signal: controller.signal,
    }).then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data: VerifiedQuote) => { if (!controller.signal.aborted) { setQuote(data); setQuoteStatus('Preços e estoque conferidos com o catálogo atual.'); } })
      .catch(() => { if (!controller.signal.aborted) { setQuote(null); setQuoteStatus('Não foi possível confirmar preço e estoque agora. Revise o carrinho.'); } });
    return () => controller.abort();
  }, [items]);

  function update(productId: string, quantity: number) {
    const next = items.map(item => item.productId === productId ? { ...item, quantity: Math.min(quantity, 10) } : item).filter(item => item.quantity > 0);
    setQuote(null); setItems(next); writeCart(next);
  }
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return <main className="shop-cart"><div className="shop-cart-inner"><p className="eyebrow">ELEGÂNCIA PRATAS · SUA SELEÇÃO</p><h1>Suas joias</h1><p className="shop-cart-intro">Uma seleção para acompanhar os seus momentos.</p>
    {items.length ? <div className="shop-cart-layout"><div className="cart-list">{items.map(item => {
      const verified = quote?.items.find(line => line.productId === item.productId);
      return <article key={item.productId}><div className="cart-thumb">{item.imageUrl ? <img src={item.imageUrl} alt=""/> : 'Foto em breve'}</div><div className="shop-cart-line-details"><p className="shop-cart-category">ELEGÂNCIA PRATAS</p><h2><Link href={`/produto/${item.slug}`}>{verified?.name ?? item.name}</Link></h2><p>{brl(verified?.unitPriceCents ?? item.priceCents)}{!verified && ' · estimado'}</p><label>Quantidade <input type="number" min="1" max="10" value={item.quantity} onChange={event => update(item.productId, Math.max(1, Math.min(10, Number(event.target.value) || 1)))}/></label><button type="button" onClick={() => update(item.productId, 0)}>Remover</button></div><strong>{brl(verified?.totalCents ?? item.priceCents * item.quantity)}</strong></article>;
    })}<Link className="shop-cart-continue" href="/catalogo">← Continuar explorando joias</Link></div><aside className="cart-total"><h2>Resumo da seleção</h2><p>Subtotal {quote ? '(confirmado)' : '(estimado)'} <strong>{brl(quote?.subtotalCents ?? subtotal)}</strong></p><small role="status">{quoteStatus}</small><div className="shop-cart-pending"><strong>Compras online em preparação</strong><p>Frete e pagamento ainda não estão disponíveis. Não é possível concluir a compra neste momento.</p></div></aside></div> : <div className="shop-cart-empty"><span aria-hidden="true">✦</span><h2>Sua seleção começa aqui</h2><p>Encontre uma joia que combina com você.</p><Link href="/catalogo">Explorar joias →</Link></div>}
  </div></main>;
}
