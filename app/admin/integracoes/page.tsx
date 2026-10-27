'use client';

import { useCallback, useEffect, useState } from 'react';
import { useManagement } from '../layout';

type Status = { configured: boolean; connected: boolean; environment: 'sandbox' };

export default function IntegrationsPage() {
  const { db } = useManagement();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setMessage('');
    const { data: { session } } = await db.auth.getSession();
    if (!session) { setMessage('Entre novamente na gestão.'); return; }
    try {
      const response = await fetch('/api/admin/integrations/melhor-envio/start', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) { setMessage(typeof result.error === 'string' ? result.error : `Falha na consulta (${response.status}).`); return; }
      setStatus(result);
    } catch { setMessage('Não foi possível acessar o servidor da loja. Tente novamente.'); }
  }, [db]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function connect() {
    if (busy || !status?.configured) return;
    setBusy(true); setMessage('');
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) throw new Error('Entre novamente na gestão.');
      const response = await fetch('/api/admin/integrations/melhor-envio/start', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
      });
      if (!response.ok) throw new Error('Não foi possível iniciar a autorização. Confira as credenciais na Vercel.');
      const result = await response.json();
      if (typeof result.authorizationUrl !== 'string' || !result.authorizationUrl.startsWith('https://sandbox.melhorenvio.com.br/oauth/authorize?')) throw new Error('URL de autorização inválida.');
      window.location.assign(result.authorizationUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro ao conectar.'); setBusy(false); }
  }

  return <main className="management-page"><p className="eyebrow">SERVIÇOS DA LOJA</p><h1>Integrações</h1><p className="management-intro">Conecte os serviços externos sem colocar senhas ou chaves no navegador. O Melhor Envio está configurado inicialmente apenas para o Sandbox.</p>
    <section className="management-card management-pending"><h2>Melhor Envio · Sandbox</h2>{!status ? <p>Verificando configuração...</p> : <><p><strong>Credenciais na Vercel:</strong> {status.configured ? 'configuradas' : 'pendentes'}</p><p><strong>Autorização:</strong> {status.connected ? 'conectada no Sandbox' : 'não conectada'}</p><p>Escopo solicitado: somente cotação de frete (<code>shipping-calculate</code>). Nenhum frete real ou etiqueta será comprado nesta etapa.</p>{!status.configured ? <p>Adicione as variáveis privadas <code>MELHOR_ENVIO_CLIENT_ID</code>, <code>MELHOR_ENVIO_CLIENT_SECRET</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> nas configurações de ambiente da Vercel para Produção. Depois, faça uma nova implantação. Não compartilhe os valores no chat.</p> : <button className="botao" type="button" disabled={busy} onClick={() => void connect()}>{busy ? 'Aguarde...' : status.connected ? 'Renovar autorização no Sandbox' : 'Autorizar no Sandbox'}</button>}</>}
    </section><p role="status" className="management-status">{message}</p>{message && !status && <button type="button" className="management-outline" onClick={() => void refresh()}>Tentar novamente</button>}<p className="pricing-queue-note">Mesmo após autorizar, o carrinho continuará sem checkout até a cotação de frete, pagamento e testes completos estarem conectados.</p>
  </main>;
}
