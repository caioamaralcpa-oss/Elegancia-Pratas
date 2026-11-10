'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="erp-page-header"><div><h1>{title}</h1>{description && <p className="management-intro">{description}</p>}</div>{actions && <div className="erp-actions">{actions}</div>}</header>;
}
export function Badge({ children }: { children: ReactNode }) { return <span className="erp-badge">{children}</span>; }
export function Skeleton({ label = 'Carregando informações' }: { label?: string }) { return <div className="erp-skeleton" role="status" aria-label={label}><span/><span/><span/><span className="sr-only">{label}</span></div>; }
export function EmptyState({ title, children, href, action }: { title: string; children?: ReactNode; href?: string; action?: string }) { return <div className="erp-empty"><h2>{title}</h2>{children}<p>{href && <Link className="management-outline" href={href}>{action}</Link>}</p></div>; }
export function Workflow({ collection, priced, published }: { collection: boolean; priced: boolean; published: boolean }) {
  return <ol className="erp-stepper" aria-label="Andamento da joia">{['Cadastrada','Em coleção','Precificada','Publicada'].map((label,index) => <li key={label} data-done={[true,collection,priced,published][index]}><span aria-hidden="true">{index + 1}</span>{label}</li>)}</ol>;
}
export function Modal({ open, onClose, title, children, variant='modal' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; variant?: 'modal'|'drawer' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (open && el && !el.open) {el.showModal();el.querySelector<HTMLElement>('input:not([type=checkbox]),select,textarea')?.focus();} else if (!open && el?.open) el.close(); }, [open]);
  return <dialog ref={ref} className={variant==='drawer'?'erp-dialog erp-drawer':'erp-dialog'} aria-label={title} onCancel={event=>{event.preventDefault();onClose();}} onClose={onClose}><div className="erp-dialog-header"><h2>{title}</h2><button type="button" className="management-outline" onClick={onClose}>Fechar</button></div>{children}</dialog>;
}

export function ErrorState({onRetry,message='Não foi possível carregar os dados.'}:{onRetry:()=>void;message?:string}){return <div className="erp-empty erp-load-error" role="alert"><h2>Não foi possível carregar</h2><p>{message}</p><button type="button" className="management-outline" onClick={onRetry}>Tentar novamente</button></div>;}
export function Feedback({message}:{message:string}){
 const [visible,setVisible]=useState(false);
 const success=Boolean(message)&&!/(não|falh|erro|mas |confira|informe|selecione|aguarde|enviando)/i.test(message)&&/(salv|registrad|confirmad|publicad|vinculad|movid|retirada|excluíd|definida)/i.test(message);
 useEffect(()=>{setVisible(true);const id=setTimeout(()=>setVisible(false),7000);return()=>clearTimeout(id)},[message]);
 return <><p role="status" className="management-status">{message}</p>{success&&visible&&<aside className="erp-toast" aria-label="Notificação de sucesso"><strong>Operação concluída</strong><p>{message}</p><button type="button" onClick={()=>setVisible(false)}>Fechar notificação</button></aside>}</>;
}
