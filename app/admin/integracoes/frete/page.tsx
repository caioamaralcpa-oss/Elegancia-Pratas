'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { brl } from '@/lib/products';
import { useManagement } from '../../layout';

type ShippingService = { id: number | null; name: string; carrier: string; priceCents: number; deliveryDays: number | null };
type Quote = { environment: 'sandbox'; originCep: string; destinationCep: string; services: ShippingService[] };

export default function SandboxShippingPage() {
  const { db } = useManagement();
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('100');
  const [height, setHeight] = useState('10');
  const [width, setWidth] = useState('10');
  const [length, setLength] = useState('15');
  const [insurance, setInsurance] = useState('100,00');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setQuote(null); setMessage('');
    const destinationCep = destination.replace(/\D/g, '');
    const insuranceValue = insurance.trim().replace(',', '.');
    if (!/^\d{8}$/.test(destinationCep) || !/^\d+(?:\.\d{1,2})?$/.test(insuranceValue)) {
      setMessage('Confira o CEP de destino e o valor segurado.'); return;
    }
    setBusy(true);
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) throw new Error('Entre novamente na gestão.');
      const response = await fetch('/api/admin/integrations/melhor-envio/quote', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCep, weightGrams: Number(weight), heightCm: Number(height), widthCm: Number(width),
          lengthCm: Number(length), insuranceCents: Math.round(Number(insuranceValue) * 100),
        }), cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Falha na cotação.');
      setQuote(result);
      setMessage(result.services.length ? 'Cotação de teste recebida do Melhor Envio Sandbox.' : 'O Sandbox não retornou modalidades disponíveis para este pacote e CEP.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha na cotação.'); }
    finally { setBusy(false); }
  }

  return <main className="management-page"><p className="eyebrow">INTEGRAÇÕES · TESTE INTERNO</p><h1>Simular frete</h1><p className="management-intro">Teste uma cotação no Melhor Envio Sandbox. Origem: <strong>29070-530</strong>. Nenhuma etiqueta é comprada e o resultado não aparece no carrinho dos clientes.</p><Link className="management-outline" href="/admin/integracoes">← Voltar às integrações</Link>
    <section className="management-card catalog-shipping"><h2>Pacote de teste</h2><p>Os valores abaixo são apenas um exemplo. Ajuste peso e dimensões para um pacote real pronto para postagem; o valor segurado deve refletir a peça.</p><form onSubmit={calculate}><div className="management-fields"><label>CEP de destino<input required inputMode="numeric" maxLength={9} value={destination} onChange={event => setDestination(event.target.value)} placeholder="00000-000"/></label><label>Peso total embalado (g)<input required type="number" min="1" max="30000" step="1" value={weight} onChange={event => setWeight(event.target.value)}/></label><label>Altura (cm)<input required type="number" min="0.1" max="200" step="0.01" value={height} onChange={event => setHeight(event.target.value)}/></label><label>Largura (cm)<input required type="number" min="0.1" max="200" step="0.01" value={width} onChange={event => setWidth(event.target.value)}/></label><label>Comprimento (cm)<input required type="number" min="0.1" max="200" step="0.01" value={length} onChange={event => setLength(event.target.value)}/></label><label>Valor segurado (R$)<input required inputMode="decimal" value={insurance} onChange={event => setInsurance(event.target.value)}/></label></div><button className="botao" type="submit" disabled={busy}>{busy ? 'Consultando...' : 'Testar cotação no Sandbox'}</button></form></section>
    <p role="status" className="management-status">{message}</p>{quote && quote.services.length > 0 && <section className="management-card pricing-queue"><h2>Opções retornadas · Sandbox</h2><div className="pricing-queue-list">{quote.services.map((service, index) => <article key={`${service.id ?? 'servico'}-${index}`}><div><strong>{service.carrier} · {service.name}</strong><small>{service.deliveryDays === null ? 'Prazo não informado' : `Prazo estimado: ${service.deliveryDays} dia(s)`}</small></div><div><span>Frete estimado</span><strong>{brl(service.priceCents)}</strong></div></article>)}</div><p>Valores de teste. Uma cotação de produção pode variar e depende das medidas finais, da transportadora e das condições vigentes.</p></section>}
  </main>;
}
