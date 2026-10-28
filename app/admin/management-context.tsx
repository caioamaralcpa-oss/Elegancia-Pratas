'use client';

import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ManagementContext = createContext<{ db: SupabaseClient } | null>(null);

export function useManagement() {
  const value = useContext(ManagementContext);
  if (!value) throw new Error('Acesso administrativo não disponível');
  return value;
}
