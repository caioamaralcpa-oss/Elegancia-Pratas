'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'dark' | 'light';
const storageKey = 'elegancia-store-theme';

export default function ThemeToggle() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('light');
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* Navegação privada pode bloquear armazenamento. */ }
    const selected: Theme = saved === 'dark' ? 'dark' : 'light';
    setTheme(selected);
    document.documentElement.dataset.storeTheme = selected;
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.storeTheme = next;
    try { localStorage.setItem(storageKey, next); } catch { /* A escolha ainda vale nesta sessão. */ }
    if (details.current) details.current.open = false;
  }

  if (pathname?.startsWith('/admin')) return null;
  return <details className="store-theme-menu" ref={details}><summary aria-label={`Aparência da loja: ${theme === 'light' ? 'clara' : 'escura'}`}>Aparência <span aria-hidden="true">⌄</span></summary><div role="group" aria-label="Escolha o tema da loja"><button type="button" onClick={() => choose('light')} aria-pressed={theme === 'light'}>Claro {theme === 'light' && <span aria-hidden="true">✓</span>}</button><button type="button" onClick={() => choose('dark')} aria-pressed={theme === 'dark'}>Escuro {theme === 'dark' && <span aria-hidden="true">✓</span>}</button></div></details>;
}
