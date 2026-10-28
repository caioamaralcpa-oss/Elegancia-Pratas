'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'dark' | 'light';
const storageKey = 'elegancia-store-theme';

export default function ThemeToggle() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(storageKey); } catch { /* Navegação privada pode bloquear armazenamento. */ }
    const selected: Theme = saved === 'light' ? 'light' : 'dark';
    setTheme(selected);
    document.documentElement.dataset.storeTheme = selected;
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.storeTheme = next;
    try { localStorage.setItem(storageKey, next); } catch { /* A escolha ainda vale nesta sessão. */ }
  }

  if (pathname?.startsWith('/admin')) return null;
  return <div className="store-theme-toggle" role="group" aria-label="Tema da loja"><button type="button" onClick={() => choose('light')} aria-pressed={theme === 'light'} aria-label="Usar tema claro" title="Tema claro">☼ <span>Claro</span></button><button type="button" onClick={() => choose('dark')} aria-pressed={theme === 'dark'} aria-label="Usar tema escuro" title="Tema escuro">☾ <span>Escuro</span></button></div>;
}
