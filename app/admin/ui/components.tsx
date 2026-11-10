'use client';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="erp-page-header"><div><h1>{title}</h1>{description && <p className="management-intro">{description}</p>}</div>{actions && <div className="erp-actions">{actions}</div>}</header>;
}
export function Badge({ children }: { children: ReactNode }) { return <span className="erp-badge">{children}</span>; }
export function Skeleton({ label = 'Carregando informações' }: { label?: string }) { return <div className="erp-skeleton" role="status" aria-label={label}><span/><span/><span/><span className="sr-only">{label}</span></div>; }
export function EmptyState({ title, children, href, action }: { title: string; children?: ReactNode; href?: string; action?: string }) { return <div className="erp-empty"><h2>{title}</h2>{children}<p>{href && <Link className="management-outline" href={href}>{action}</Link>}</p></div>; }
export function Workflow({ collection, priced, published }: { collection: boolean; priced: boolean; published: boolean }) {
  return <ol className="erp-stepper" aria-label="Andamento da joia">{['Cadastrada','Em coleção','Precificada','Publicada'].map((label,index) => <li key={label} data-done={[true,collection,priced,published][index]}><span aria-hidden="true">{index + 1}</span>{label}</li>)}</ol>;
}
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (open && el && !el.open) el.showModal(); else if (!open && el?.open) el.close(); }, [open]);
  return <dialog ref={ref} className="erp-dialog" aria-label={title} onCancel={onClose} onClose={onClose}><div className="erp-dialog-header"><h2>{title}</h2><button type="button" className="management-outline" onClick={onClose}>Fechar</button></div>{children}</dialog>;
}
