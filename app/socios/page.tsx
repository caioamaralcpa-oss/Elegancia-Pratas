'use client';
import StagingNotice from '../admin/financeiro/staging-notice';

import Image from 'next/image';
import {useState,useEffect,useRef,type FormEvent} from 'react';
import {createClient} from '@supabase/supabase-js';
import {brl} from '@/lib/products';
import '../admin/management.css';
import '../admin/ui/tokens.css';
import '../admin/financeiro/finance.css';
type Profile={id:string;name:string;cpf:string|null;phone:string|null;pix_key:string|null;share_bps:number};
type Payout={id:string;month:string;amount_cents:number;paid_at:string|null};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db=url&&key?createClient(url,key):null;
export default function PartnerPortal(){
 const enabled=process.env.NEXT_PUBLIC_FINANCE_ENABLED==='true';const owner=useRef('');const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[factor,setFactor]=useState(''),[qr,setQr]=useState('');const[profile,setProfile]=useState<Profile|null>(null),[payouts,setPayouts]=useState<Payout[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!db)return;const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{if(!session||owner.current&&session.user.id!==owner.current){owner.current='';setProfile(null);setPayouts([]);setFactor('');setQr('')}});return()=>subscription.unsubscribe()},[]);
 async function consult(){if(!db||!enabled)return;const{data:{user}}=await db.auth.getUser();if(!user)throw Error('Entre com sua conta de consulta.');owner.current=user.id;
 const{data:assurance,error}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;
 if(assurance?.currentLevel!=='aal2'){
  const{data,error}=await db.auth.mfa.listFactors();if(error)throw error;
  const existing=data.totp.find(f=>f.status==='verified');if(existing){setFactor(existing.id);setQr('');return}
  const unverified=data.all.find(f=>f.factor_type==='totp'&&f.status==='unverified');if(unverified){setMessage('Conclua a configuração do autenticador com o responsável pelo acesso.');return}
  const enrolled=await db.auth.mfa.enroll({factorType:'totp'});if(enrolled.error)throw enrolled.error;setFactor(enrolled.data.id);setQr(enrolled.data.totp.qr_code);return;
 }
 const[p,v]=await Promise.all([db.from('finance_my_partner_profile').select('id,name,cpf,phone,pix_key,share_bps').maybeSingle(),db.from('finance_my_payouts').select('id,month,amount_cents,paid_at').order('month',{ascending:false})]);
 if(p.error||v.error)throw Error('Não foi possível consultar os dados.');if(!p.data)throw Error('Sua conta ainda não foi vinculada a um cadastro de sócio.');if(owner.current!==user.id)return;setProfile(p.data as Profile);setPayouts(v.data as Payout[]);setFactor('');setQr('');
 }
 async function signIn(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!db||busy)return;setBusy(true);setMessage('');try{const r=await db.auth.signInWithPassword({email,password});if(r.error)throw r.error;setPassword('');await consult()}catch{setMessage('Não foi possível entrar. Confira o acesso e o vínculo do cadastro com o administrador.')}finally{setBusy(false)}}
 async function verify(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!db||busy)return;setBusy(true);setMessage('');try{const c=await db.auth.mfa.challenge({factorId:factor});if(c.error)throw c.error;const r=await db.auth.mfa.verify({factorId:factor,challengeId:c.data.id,code});if(r.error)throw r.error;setCode('');await consult()}catch{setMessage('Não foi possível confirmar o código ou consultar o cadastro.')}finally{setBusy(false)}}
 return <div className="management-shell"><main className="management-page finance-page"><StagingNotice/><p className="eyebrow">ELEGÂNCIA PRATAS · ÁREA DO SÓCIO</p><h1>Meus repasses</h1>{!enabled?<section className="management-card"><h2>Portal em homologação</h2><p>O acesso individual será disponibilizado após a validação do ambiente e do vínculo da conta.</p></section>:!profile?<section className="management-auth">{factor?<><h2>Verificação em duas etapas</h2>{qr&&<><p>Cadastre este código no seu aplicativo autenticador.</p><Image unoptimized src={qr} alt="Configuração do autenticador" width={180} height={180}/></>}<form onSubmit={verify}><label>Código de seis dígitos<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={e=>setCode(e.target.value)}/></label><button className="botao" disabled={busy}>Confirmar</button></form></>:<><h2>Acesso de consulta</h2><form onSubmit={signIn}><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="botao" disabled={busy||!db}>Entrar</button></form></>}</section>:<><section className="management-card"><h2>{profile.name}</h2><p>Cadastro disponível somente para consulta. Solicite correções ao responsável pela gestão.</p><dl className="finance-profile">{[['CPF',profile.cpf],['Telefone',profile.phone],['Chave Pix',profile.pix_key]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??'Não cadastrado'}</dd></div>)}</dl><p>Participação no fundo de repasses: {profile.share_bps/100}%.</p></section><section className="management-card"><h2>Histórico mensal</h2><p>Plano de dezembro/2026 a maio/2027. O fundo corresponde a 50% do lucro líquido apurado pela gestão.</p>{payouts.length?payouts.map(p=><article className="finance-list-row" key={p.id}><strong>{p.month.slice(0,7)}</strong><span>{brl(p.amount_cents)}</span><span>{p.paid_at?'Pagamento registrado':'Aguardando pagamento'}</span></article>):<p>Seus repasses aparecerão após o fechamento da competência pela gestão.</p>}</section><button className="management-outline" onClick={async()=>{await db?.auth.signOut();setProfile(null);setPayouts([]);setFactor('');setQr('')}}>Sair</button></>}<p role="status">{message}</p></main></div>;
}
