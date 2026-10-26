'use client';
import { useState } from 'react';
import Link from 'next/link';
import { addToCart, type CartItem } from '@/lib/cart';
export default function AddToCart({ item, stock }: { item: Omit<CartItem, 'quantity'>; stock: number }) {
  const [added, setAdded] = useState(false);
  return <div><button className="botao" type="button" disabled={stock < 1} onClick={() => { addToCart(item); setAdded(true); }}>{stock < 1 ? 'Indisponível' : 'Adicionar ao carrinho'}</button>{added && <p role="status">Adicionado. <Link href="/carrinho"><u>Ver carrinho</u></Link></p>}</div>;
}
