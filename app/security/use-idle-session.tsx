'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import {activityState,readActivity,recordActivity,sessionIdentity,type ActivityRecord} from './inactivity';

type Reason='inactivity'|'signed-out';
export const IDLE_MESSAGE='Sua sessão foi encerrada após 15 minutos de inatividade. Entre novamente.';
const namespace='elegancia-idle-v1:'+process.env.NEXT_PUBLIC_SUPABASE_URL;

export function useIdleSession(db:SupabaseClient|null,onExpired:(reason:Reason)=>void){
 const current=useRef<ActivityRecord|null>(null);
 const channel=useRef<BroadcastChannel|null>(null);
 const provisional=useRef(false);
 const epoch=useRef(0);
 const onExpiredRef=useRef(onExpired);
 const [warning,setWarning]=useState(false);
 useEffect(()=>{onExpiredRef.current=onExpired},[onExpired]);

 const persist=useCallback(()=>{
   try{if(current.current)sessionStorage.setItem(namespace,JSON.stringify(current.current))}catch{/* Memory-only until reload; resuming without storage is refused. */}
 },[]);
 const send=useCallback((type:string)=>{
   try{channel.current?.postMessage({type,record:current.current})}catch{/* Other tabs also run their own deadline. */}
 },[]);
 const clearCookie=useCallback(()=>{
   void fetch('/api/admin/session',{method:'DELETE',cache:'no-store',keepalive:true,signal:AbortSignal.timeout(5000)}).catch(()=>{});
 },[]);
 const expire=useCallback((reason:Reason='inactivity',broadcast=true,revoke=true)=>{
   if(!current.current||current.current.locked)return;
   current.current={...current.current,locked:true};epoch.current++;provisional.current=false;
   persist();setWarning(false);onExpiredRef.current(reason);
   if(broadcast)send('expired');
   clearCookie();
   if(revoke&&db)void db.auth.signOut({scope:'local'}).catch(()=>{});
 },[clearCookie,db,persist,send]);
 const check=useCallback(()=>{
   if(!current.current)return false;
   const state=activityState(current.current,Date.now());
   if(state==='expired'){
     // A persisted lock must still remove any old authenticated view on reload.
     if(current.current.locked){setWarning(false);return false}
     expire();return false;
   }
   setWarning(state==='warning');return true;
 },[expire]);

 const ensureSession=useCallback(async(session:Session|null,fresh=false)=>{
   if(!session)return false;
   const sessionId=sessionIdentity(session.access_token);
   if(!sessionId)return false;
   if(fresh||current.current?.sessionId!==sessionId){
     epoch.current++;const generation=epoch.current;
     let stored:ActivityRecord|null=null,storageAvailable=true;
     try{stored=readActivity(sessionStorage.getItem(namespace),sessionId)}catch{storageAvailable=false}
     current.current=fresh?{sessionId,lastActive:Date.now(),locked:false}:
       stored??{sessionId,lastActive:storageAvailable?Date.now():0,locked:false};
     if(stored?.locked&&!fresh){
       current.current={...stored,locked:false};expire();return false;
     }
     provisional.current=!fresh&&!stored&&storageAvailable;
     if(fresh){provisional.current=false;persist();send('activity')}
     else{
       send('request');
       // A new tab asks existing tabs for the original deadline, rather than silently resetting it.
       await new Promise(resolve=>window.setTimeout(resolve,180));
       if(generation!==epoch.current)return false;
       provisional.current=false;
     }
   }
   const active=check();
   if(active)persist();
   return active;
 },[check,expire,persist,send]);

 const extend=useCallback(()=>{
   if(!current.current||document.visibilityState!=='visible'||!check())return;
   current.current=recordActivity(current.current,Date.now());persist();send('activity');setWarning(false);
 },[check,persist,send]);

 useEffect(()=>{
   if(!db)return;
   let connection:BroadcastChannel|null=null;
   try{connection=new BroadcastChannel(namespace);channel.current=connection}catch{/* Per-tab deadline remains enforced. */}
   if(connection)connection.onmessage=(event:MessageEvent)=>{
     const value=event.data;
     if(!value||!current.current||value.record?.sessionId!==current.current.sessionId)return;
     if(value.type==='request'){send('state');return}
     if(value.type==='expired'){expire('inactivity',false);return}
     if(value.type!=='state'&&value.type!=='activity')return;
     const remote=readActivity(JSON.stringify(value.record),current.current.sessionId);
     if(!remote||current.current.locked)return;
     if(remote.locked){expire('inactivity',false);return}
     if(!Number.isFinite(remote.lastActive)||remote.lastActive>Date.now())return;
     if(provisional.current||remote.lastActive>current.current.lastActive){
       current.current=remote;provisional.current=false;persist();check();
     }
   };
   const activity=(event:Event)=>{
     if(!event.isTrusted||document.visibilityState!=='visible'||!current.current)return;
     if(!check())return; // An event after the deadline never revives the session.
     if(Date.now()-current.current.lastActive<1000)return;
     extend();
   };
   const resume=()=>{check()};
   const events=['pointerdown','pointermove','keydown','wheel','touchstart','input'];
   for(const event of events)window.addEventListener(event,activity,{capture:true,passive:true});
   document.addEventListener('visibilitychange',resume);
   window.addEventListener('pageshow',resume);
   window.addEventListener('focus',resume);
   const interval=window.setInterval(check,1000);
   const{data:{subscription}}=db.auth.onAuthStateChange((event)=>{
     if(event==='SIGNED_OUT')expire('signed-out',true,false);
   });
   return()=>{
     for(const event of events)window.removeEventListener(event,activity,true);
     document.removeEventListener('visibilitychange',resume);
     window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume);
     window.clearInterval(interval);subscription.unsubscribe();connection?.close();
     if(channel.current===connection)channel.current=null;
   };
 },[check,db,expire,extend,persist,send]);
 return {ensureSession,warning,extend,endSession:()=>expire('signed-out')};
}

export function IdleWarning({onContinue}:{onContinue:()=>void}){
 return <aside className="management-card" aria-label="Aviso de sessão">
   <p role="status">Sua sessão será encerrada em menos de um minuto por inatividade. Salve o que estiver preenchendo.</p>
   <button className="management-outline" type="button" onClick={onContinue}>Continuar conectado</button>
 </aside>;
}
