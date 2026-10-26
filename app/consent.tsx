'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';

type Consent = { analytics: boolean; marketing: boolean; updatedAt: string };
const key = 'elegancia-consent-v1';

export default function ConsentManager({ enabled }: { enabled: boolean }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: Consent = JSON.parse(saved);
        if (typeof parsed.analytics === 'boolean' && typeof parsed.marketing === 'boolean') { setConsent(parsed); return; }
      }
    } catch { /* Sem consentimento válido: não carregar rastreadores. */ }
    setOpen(true);
  }, [enabled]);
  function save(choices: Pick<Consent, 'analytics' | 'marketing'>) {
    const next = { ...choices, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { setConsent(null); setOpen(true); return; }
    if ((consent?.analytics && !next.analytics) || (consent?.marketing && !next.marketing)) { window.location.reload(); return; }
    setConsent(next); setOpen(false);
  }
  if (!enabled) return null;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const metaId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const validGa = gaId && /^G-[A-Z0-9]+$/.test(gaId) ? gaId : null;
  const validMeta = metaId && /^[0-9]{8,20}$/.test(metaId) ? metaId : null;
  return <>
    {consent?.analytics && validGa && <><Script src={`https://www.googletagmanager.com/gtag/js?id=${validGa}`} strategy="afterInteractive"/><Script id="ga-consent" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${validGa}');`}</Script></>}
    {consent?.marketing && validMeta && <Script id="meta-consent" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${validMeta}');fbq('track','PageView');`}</Script>}
    <button className="cookie-settings" type="button" onClick={() => { setAnalytics(consent?.analytics ?? false); setMarketing(consent?.marketing ?? false); setOpen(true); }}>Preferências de cookies</button>
    {open && <section className="cookie-banner" aria-label="Preferências de cookies"><h2>Suas preferências de privacidade</h2><p>Cookies essenciais são necessários para o funcionamento da loja. Analytics e marketing são opcionais e só serão ativados com sua escolha. Leia a <Link href="/legal/privacidade">Política de Privacidade</Link>.</p><label><input type="checkbox" checked={analytics} onChange={event => setAnalytics(event.target.checked)}/> Analytics</label><label><input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)}/> Marketing</label><div className="cookie-actions"><button type="button" onClick={() => save({ analytics: false, marketing: false })}>Recusar opcionais</button><button type="button" onClick={() => save({ analytics, marketing })}>Salvar escolhas</button><button type="button" onClick={() => { setAnalytics(true); setMarketing(true); save({ analytics: true, marketing: true }); }}>Aceitar opcionais</button></div></section>}
  </>;
}
