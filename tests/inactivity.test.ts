import test from 'node:test';
import assert from 'node:assert/strict';
import {IDLE_TIMEOUT_MS,IDLE_WARNING_MS,initialActivity,activityState,recordActivity,readActivity,sessionIdentity} from '../app/security/inactivity.ts';
const start=1800000000000;
const sessionId='10000000-0000-4000-8000-000000000001';
const record={sessionId,lastActive:start,locked:false};
test('warns at fourteen minutes and expires at fifteen, without a grace extension',()=>{
 assert.equal(activityState(record,start+IDLE_TIMEOUT_MS-IDLE_WARNING_MS-1),'active');
 assert.equal(activityState(record,start+IDLE_TIMEOUT_MS-IDLE_WARNING_MS),'warning');
 assert.equal(activityState(record,start+IDLE_TIMEOUT_MS-1),'warning');
 assert.equal(activityState(record,start+IDLE_TIMEOUT_MS),'expired');
});
test('real activity before deadline renews it; activity at or after deadline never revives it',()=>{
 const renewed=recordActivity(record,start+5000);
 assert.equal(activityState(renewed,start+IDLE_TIMEOUT_MS),'warning');
 assert.equal(activityState(renewed,start+IDLE_TIMEOUT_MS+5000),'expired');
 assert.equal(recordActivity(record,start+IDLE_TIMEOUT_MS).locked,true);
 assert.equal(recordActivity({...record,locked:true},start+1).locked,true);
});
test('reload and suspension retain the original timestamp',()=>{
 const restored=readActivity(JSON.stringify(record),sessionId)!;
 assert.equal(activityState(restored,start+2*IDLE_TIMEOUT_MS),'expired');
 assert.equal(readActivity(JSON.stringify({...record,locked:true}),sessionId)?.locked,true);
});
test('clock reversal, invalid timestamps and malformed checkpoints fail closed',()=>{
 for(const lastActive of [0,NaN,Infinity,start+1])assert.equal(activityState({...record,lastActive},start),'expired');
 assert.equal(readActivity('{',sessionId)?.locked,true);
 assert.equal(readActivity(JSON.stringify({sessionId,lastActive:'x',locked:false}),sessionId)?.locked,true);
});
test('session scope survives JWT refresh and isolates a newly authenticated session',()=>{
 const token=(id:string,exp:number)=>'header.'+btoa(JSON.stringify({session_id:id,exp}))+'.signature';
 assert.equal(sessionIdentity(token(sessionId,1)),sessionIdentity(token(sessionId,2)));
 assert.equal(sessionIdentity('invalid'),null);
 assert.equal(sessionIdentity(token('not-a-session',2)),null);
 assert.equal(readActivity(JSON.stringify(record),'10000000-0000-4000-8000-000000000002'),null);
});

test('a reopened browser without a checkpoint cannot grant a new idle period to an old sign-in',()=>{
 const old=initialActivity(sessionId,new Date(start).toISOString());
 assert.equal(activityState(old,start+IDLE_TIMEOUT_MS),'expired');
 assert.equal(activityState(initialActivity(sessionId,undefined),start),'expired');
});
