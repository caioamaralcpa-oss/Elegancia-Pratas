export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const IDLE_WARNING_MS = 60 * 1000;
export type ActivityRecord = {sessionId:string;lastActive:number;locked:boolean};

export function activityState(record:ActivityRecord,now:number):'active'|'warning'|'expired' {
  if(record.locked||!Number.isFinite(now)||!Number.isFinite(record.lastActive)||record.lastActive<=0||now<record.lastActive)
    return 'expired';
  const elapsed=now-record.lastActive;
  if(elapsed>=IDLE_TIMEOUT_MS)return 'expired';
  return elapsed>=IDLE_TIMEOUT_MS-IDLE_WARNING_MS?'warning':'active';
}

export function recordActivity(record:ActivityRecord,now:number):ActivityRecord {
  return activityState(record,now)==='expired'?{...record,locked:true}:{...record,lastActive:now};
}

// Token decoding is only a channel/storage namespace, never an authorization decision.
export function sessionIdentity(token:string):string|null {
  try {
    const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return typeof payload.session_id==='string'&&/^[a-f0-9-]{36}$/i.test(payload.session_id)?payload.session_id:null;
  }catch{return null}
}

export function readActivity(raw:string|null,sessionId:string):ActivityRecord|null {
  if(raw===null)return null;
  try {
    const value=JSON.parse(raw) as ActivityRecord;
    if(value.sessionId!==sessionId)return null;
    if(typeof value.locked!=='boolean'||typeof value.lastActive!=='number')
      return {sessionId,lastActive:0,locked:true};
    return {sessionId,lastActive:value.lastActive,locked:value.locked};
  }catch{return {sessionId,lastActive:0,locked:true}}
}
