'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { brl } from '@/lib/products';
import { useManagement } from '../layout';

type Jewelry = { id: string; registration_code: string; name: string; model: string | null; stock: number; price_cents: number; workflow_stage: string; jewelry_intake: { acquisition_cost_cents: number } | null };

export default function PricingPage() {
  const { db } = useManagement();
  const [items, setItems] = useState<Jewelry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await db.from('products')
        .select('id,registration_code,name,model,stock,price_cents,workflow_stage,jewelry_intake(acquisition_cost_cents)')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) setError('Não foi possível carregar a fila de precificação. Confira sua sessão.');
      else setItems((data ?? []).map(row => ({ ...row,
        jewelry_intake: Array.isArray(row.jewelry_intake) ? row.jewelry_intake[0] ?? null : row.jewelry_intake ?? null,
      })).filter(row => row.jewelry_intake) as Jewelry[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [db]);

  const pending = items.filter(item => item.workflow_stage === 'aguardando_precificacao');
  const priced = items.filter(item => item.workflow_stage !== 'aguardando_precificacao');
  return <main className="management-page"><p className="eyebrow">ETAPA 03 · FILA DE TRABALHO</p><h1>Precificação</h1><p className="management-intro">Toda joia salva aparece aqui imediatamente. O valor de venda ainda será definido na próxima etapa; nenhuma peça pendente entra no catálogo.</p><div className="pricing-queue-summary"><div><strong>{pending.length}</strong><span>Aguardando preço</span></div><div><strong>{priced.length}</strong><span>Precificadas</span></div></div>{error && <p role="alert" className="management-status">{error}</p>}{loading ? <p>Carregando joias...</p> : pending.length === 0 ? <div className="management-card management-pending"><h2>Nenhuma joia pendente</h2><p>Cadastre uma joia para vê-la nesta fila.</p><Link className="management-outline" href="/admin/joias">Cadastrar joia →</Link></div> : <section className="management-card pricing-queue"><h2>Joias para precificar</h2><div className="pricing-queue-list">{pending.map(item => <article key={item.id}><div><strong>{item.name}</strong><small>{item.registration_code} · {item.model ?? 'Modelo não informado'} · {item.stock} unidade(s)</small></div><div><span>Custo unitário</span><strong>{brl(item.jewelry_intake?.acquisition_cost_cents ?? 0)}</strong></div><span className="management-badge">Preço pendente</span></article>)}</div></section>}{priced.length > 0 && <section className="management-card pricing-queue"><h2>Com preço definido</h2><div className="pricing-queue-list">{priced.map(item => <article key={item.id}><div><strong>{item.name}</strong><small>{item.registration_code}</small></div><div><span>Preço de venda</span><strong>{brl(item.price_cents)}</strong></div><span className="management-badge">Aguardando catálogo</span></article>)}</div></section>}<p className="pricing-queue-note">O formulário para calcular margem, embalagem e insumos será a próxima implementação. Esta tela já recebe os cadastros e não altera o preço de venda.</p></main>;
}
