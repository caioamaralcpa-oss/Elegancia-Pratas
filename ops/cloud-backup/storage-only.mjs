import {createHash,randomUUID} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {put,get} from '@vercel/blob';
const PROJECT='sltohhqejguauhanjhfj';
const BASE='https://'+PROJECT+'.supabase.co/storage/v1';
export const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code})};
export function safeSegments(name){
 if(typeof name!=='string'||!name||name.split('/').some(s=>!s||s==='.'||s==='..')||name.includes('\\'))fail('UNSAFE_OBJECT_PATH');
 return name.split('/').map(encodeURIComponent).join('/');
}
export function assertInventory(before,after){
 if(JSON.stringify(before)!==JSON.stringify(after))fail('SOURCE_CHANGED_DURING_BACKUP');
}
export function verifyArchive(bytes,expectedHash){
 if(sha(bytes)!==expectedHash)fail('CLOUD_CHECKSUM_MISMATCH');
 let m;try{m=JSON.parse(gunzipSync(bytes,{maxOutputLength:128*1024*1024}).toString('utf8'))}catch{fail('INVALID_BACKUP_ARCHIVE')}
 if(m.project!==PROJECT||m.kind!=='storage_only'||!Array.isArray(m.files)||!Array.isArray(m.buckets))fail('INVALID_BACKUP_MANIFEST');
 const seen=new Set();
 for(const f of m.files){
  safeSegments(f.name);safeSegments(f.bucket);
  const key=f.bucket+'\0'+f.name;
  if(seen.has(key)||!m.buckets.some(b=>b.id===f.bucket))fail('INVALID_BACKUP_MANIFEST');
  seen.add(key);
  const data=Buffer.from(f.base64,'base64');
  if(data.length!==f.bytes||sha(data)!==f.sha256)fail('OBJECT_CHECKSUM_MISMATCH');
 }
 return {files:m.files.length,bytes:m.files.reduce((n,f)=>n+f.bytes,0),buckets:m.buckets.length};
}
export function verifyObject(data,metadata){
 const size=Number(metadata?.size);
 if(!Number.isSafeInteger(size)||size<0||size!==data.length)fail('STORAGE_SIZE_MISMATCH');
 const etag=metadata?.eTag??metadata?.etag;
 if(typeof etag==='string'&&/^[a-f0-9]{32}$/i.test(etag.replaceAll('"',''))&&createHash('md5').update(data).digest('hex')!==etag.replaceAll('"','').toLowerCase())fail('STORAGE_ETAG_MISMATCH');
 return {bytes:data.length,sha256:sha(data)};
}
export function normalizeCredential(raw){
 let key=(raw??'').trim();
 const assignment=key.match(/^(?:export\s+)?(?:BACKUP_STORAGE_SERVICE_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)\s*=\s*([\s\S]*)$/);
 if(assignment)key=assignment[1].trim();
 if(key.length>=2&&((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'"))))key=key.slice(1,-1).trim();
 return key;
}
function credentialShape(raw){
 const key=normalizeCredential(raw),parts=key.split('.');
 let claims=null;try{if(parts.length===3)claims=JSON.parse(Buffer.from(parts[1],'base64url').toString())}catch{}
 return {format:claims?'jwt':key.startsWith('sb_secret_')?'secret_key':key.startsWith('sb_publishable_')?'publishable_key':/^postgres(?:ql)?:\/\//.test(key)?'database_uri':'unrecognized',
  recognizedServiceRole:claims?.role==='service_role',sourceProjectMatches:claims?claims.ref===PROJECT:null,wrapperRemoved:key!==(raw??'')};
}
async function main(){
 let stage='initialize';
 try{
  await mkdir('public',{recursive:true});
  await writeFile('public/index.html','<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Backup privado</title><p>Área de backup privado.</p></html>');
  const key=normalizeCredential(process.env.BACKUP_STORAGE_SERVICE_KEY);
  if(!key||!process.env.BLOB_READ_WRITE_TOKEN)fail('MISSING_BACKUP_CREDENTIAL');
  const headers={apikey:key};
  if(key.split('.').length===3){
   let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString())}catch{fail('INVALID_STORAGE_CREDENTIAL')}
   if(claims.ref!==PROJECT||claims.role!=='service_role')fail('WRONG_STORAGE_SOURCE');
   headers.Authorization='Bearer '+key;
  }else if(!key.startsWith('sb_secret_'))fail('INVALID_STORAGE_CREDENTIAL');
  const request=async(endpoint,options={})=>{
   const response=await fetch(BASE+endpoint,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(60000)});
   if(!response.ok)fail(response.status===401||response.status===403?'STORAGE_CREDENTIAL_REJECTED':'STORAGE_REQUEST_FAILED');
   return response;
  };
  const inventory=async()=>{
   const buckets=[];for(let offset=0;;offset+=100){
    const page=await(await request('/bucket?limit=100&offset='+offset)).json();
    if(!Array.isArray(page))fail('INVALID_STORAGE_INVENTORY');
    buckets.push(...page);if(page.length<100)break;if(offset>10000)fail('INVENTORY_LIMIT_EXCEEDED');
   }
   buckets.sort((a,b)=>a.id.localeCompare(b.id));
   const objects=[];
   for(const b of buckets){
    safeSegments(b.id);
    const visit=async(prefix,depth=0)=>{
     if(depth>32)fail('INVENTORY_LIMIT_EXCEEDED');
     for(let offset=0;;offset+=1000){
      const page=await(await request('/object/list/'+encodeURIComponent(b.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:1000,offset,sortBy:{column:'name',order:'asc'}})})).json();
      if(!Array.isArray(page))fail('INVALID_STORAGE_INVENTORY');
      for(const o of page){
       const name=prefix?prefix+'/'+o.name:o.name;safeSegments(name);
       if(o.id==null&&o.metadata==null)await visit(name,depth+1);
       else objects.push({bucket:b.id,name,id:o.id,metadata:o.metadata,updated_at:o.updated_at,created_at:o.created_at});
      }
      if(page.length<1000)break;if(offset>100000)fail('INVENTORY_LIMIT_EXCEEDED');
     }
    };await visit('');
   }
   objects.sort((a,b)=>(a.bucket+'\0'+a.name).localeCompare(b.bucket+'\0'+b.name));
   return {buckets,objects};
  };
  stage='storage_inventory';const before=await inventory();
  const runId=new Date().toISOString().replaceAll(':','-')+'-'+randomUUID();
  const manifest={kind:'storage_only',version:1,project:PROJECT,runId,startedAt:new Date().toISOString(),buckets:before.buckets,files:[]};
  stage='storage_download';let sourceBytes=0;
  for(const o of before.objects){
   const bytes=Buffer.from(await(await request('/object/'+encodeURIComponent(o.bucket)+'/'+safeSegments(o.name))).arrayBuffer());
   const checked=verifyObject(bytes,o.metadata);sourceBytes+=bytes.length;
   if(sourceBytes>64*1024*1024)fail('BACKUP_MEMORY_LIMIT_EXCEEDED');
   manifest.files.push({...o,...checked,base64:bytes.toString('base64')});
  }
  stage='source_consistency';assertInventory(before,await inventory());
  manifest.completedAt=new Date().toISOString();
  stage='local_integrity';const archive=gzipSync(Buffer.from(JSON.stringify(manifest))),hash=sha(archive);
  const checked=verifyArchive(archive,hash);
  const prefix=PROJECT+'/storage-only/'+runId;
  const write=(pathname,body,contentType)=>put(pathname,body,{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType});
  stage='cloud_upload';const uploaded=await write(prefix+'/storage-backup.json.gz',archive,'application/gzip');
  stage='cloud_readback';const read=await get(uploaded.pathname,{access:'private',useCache:false});
  if(read?.statusCode!==200)fail('CLOUD_READBACK_FAILED');
  const recovered=Buffer.from(await new Response(read.stream).arrayBuffer());
  if(recovered.length!==archive.length)fail('CLOUD_CHECKSUM_MISMATCH');
  const restored=verifyArchive(recovered,hash);assertInventory(checked,restored);
  stage='private_access';const anonymous=await fetch(uploaded.url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(anonymous.ok||anonymous.status<400||anonymous.status>=500)fail('PRIVATE_ACCESS_CHECK_FAILED');
  const summary={status:'verified',kind:'storage_only',databaseBackupIncluded:false,project:PROJECT,runId,files:restored.files,buckets:restored.buckets,sourceFileBytes:restored.bytes,archiveBytes:archive.length,sha256:hash,privateStorage:true,anonymousAccessDenied:true,sourceWrites:0,pathname:uploaded.pathname,completedAt:new Date().toISOString(),restoreTest:'Private cloud archive downloaded, decompressed; every object size and SHA-256 verified'};
  stage='completion_marker';const marker=Buffer.from(JSON.stringify(summary,null,2));const markerBlob=await write(prefix+'/VERIFIED.json',marker,'application/json');
  const markerRead=await get(markerBlob.pathname,{access:'private',useCache:false});
  if(markerRead?.statusCode!==200||sha(Buffer.from(await new Response(markerRead.stream).arrayBuffer()))!==sha(marker))fail('MARKER_READBACK_FAILED');
  console.log(JSON.stringify(summary));
 }catch(error){
  const safeCodes=new Set(['UNSAFE_OBJECT_PATH','SOURCE_CHANGED_DURING_BACKUP','CLOUD_CHECKSUM_MISMATCH','INVALID_BACKUP_ARCHIVE','INVALID_BACKUP_MANIFEST','OBJECT_CHECKSUM_MISMATCH','STORAGE_SIZE_MISMATCH','STORAGE_ETAG_MISMATCH','MISSING_BACKUP_CREDENTIAL','INVALID_STORAGE_CREDENTIAL','WRONG_STORAGE_SOURCE','STORAGE_CREDENTIAL_REJECTED','STORAGE_REQUEST_FAILED','INVALID_STORAGE_INVENTORY','INVENTORY_LIMIT_EXCEEDED','BACKUP_MEMORY_LIMIT_EXCEEDED','CLOUD_READBACK_FAILED','PRIVATE_ACCESS_CHECK_FAILED','MARKER_READBACK_FAILED']);
  console.log(JSON.stringify({status:'failed',kind:'storage_only',stage,code:safeCodes.has(error?.code)?error.code:'STORAGE_BACKUP_FAILED',backupDone:false,...(stage==='initialize'?{credential:credentialShape(process.env.BACKUP_STORAGE_SERVICE_KEY)}:{})}));process.exitCode=1;
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
