'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Fotos privadas: URLs temporárias apenas para a sessão administrativa com MFA. */
export function useIdentificationPhotos(db: SupabaseClient, paths: (string | null | undefined)[]) {
  const key = [...new Set(paths.filter((path): path is string => Boolean(path)))].sort().join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const uniquePaths = key ? key.split('|') : [];
    async function load() {
      if (!uniquePaths.length) { if (active) setUrls({}); return; }
      const { data, error } = await db.storage.from('jewelry-identification').createSignedUrls(uniquePaths, 600);
      if (!active || error) return;
      setUrls(Object.fromEntries((data ?? []).filter(photo => photo.signedUrl).map(photo => [photo.path, photo.signedUrl])));
    }
    void load();
    const timer = window.setInterval(() => { void load(); }, 8 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [db, key]);

  return urls;
}
