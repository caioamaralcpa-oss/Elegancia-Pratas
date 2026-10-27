'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { brl } from '@/lib/products';
import { useManagement } from '../layout';

type CatalogJewelry = { id: string; registration_code: string; name: string; model: string | null; price_cents: number; active: boolean; workflow_stage: string; jewelry_intake: { product_id: string } | null };

export default function CatalogManagementPage() {
  const { db } = useManagement();
  const [items, setItems] = useState<CatalogJewelry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await db.from('products')
        .select('id,registration_code,name,model,price_cents,active,workflow_stage,jewelry_intake(product_id)')
        .in('workflow_stage', ['aguardando_catalogo', 'pronto'])
        .gt('price_cents', 0)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) setError('Não foi possível carregar o catálogo de gestão. Confira sua sessão.');
      else setItems((data ?? []).map(row => ({ ...row,
        jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
      })).filter(row => row.jewelry_intake) as CatalogJewelry[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [db]);

  return <main className="management-page"><p className="eyebrow">ETAPA 04 · REVISÃO COMERCIAL</p><h1>Catálogo</h1><p className="management-intro">Só entram nesta página as joias cadastradas que já têm preço de venda definido. Estar aqui não publica a peça na loja.</p>{error && <p role="alert" className="management-status">{error}</p>}{loading ? <p>Carregando catálogo...</p> : items.length === 0 ? <div className="management-card management-pending"><h2>Nenhuma joia pronta para esta etapa</h2><p>As joias salvas permanecem na fila de precificação. Depois de definir o preço, aparecerão aqui para revisão de nome, descrição, medidas e fotos comerciais.</p><Link className="management-outline" href="/admin/precificacao">Ver fila de precificação →</Link></div> : <section className="management-card pricing-queue"><h2>Joias para revisão</h2><div className="pricing-queue-list">{items.map(item => <article key={item.id}><div><strong>{item.name}</strong><small>{item.registration_code} · {item.model ?? 'Modelo não informado'}</small></div><div><span>Preço de venda</span><strong>{brl(item.price_cents)}</strong></div><span className="management-badge">{item.active ? 'Publicada' : 'Não publicada'}</span></article>)}</div></section>}<p className="pricing-queue-note">A edição de fotos comerciais e a aprovação final serão liberadas após a implementação da precificação. Visitantes continuam vendo apenas produtos publicados.</p></main>;
}
