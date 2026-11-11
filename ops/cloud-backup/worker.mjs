import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID, X509Certificate } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import pg from 'pg';
import { safeError } from './safe-errors.mjs';
import { put, get } from '@vercel/blob';
const PROJECT='sltohhqejguauhanjhfj';
export function verifySupabaseCa(pem,now=Date.now()){
 let cert;try{cert=new X509Certificate(pem)}catch{throw Error('INVALID_SUPABASE_CA')}
 if(!cert.ca||cert.fingerprint256!=='80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA'||!cert.verify(cert.publicKey)||now<Date.parse(cert.validFrom)||now>Date.parse(cert.validTo))throw Error('INVALID_SUPABASE_CA');
 return pem;
}
export function storageHeaders(value){
 let key=(value??'').trim();
 const assignment=key.match(/^(?:export\s+)?(?:BACKUP_STORAGE_SERVICE_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)\s*=\s*([\s\S]*)$/);
 if(assignment)key=assignment[1].trim();
 if(key.length>=2&&((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'"))))key=key.slice(1,-1).trim();
 if(!key)throw Error('MISSING_STORAGE_CREDENTIAL');
 return key.startsWith('sb_secret_')?{apikey:key}:{apikey:key,Authorization:'Bearer '+key};
}
export function validateConnection(value, fixture=false){
 const u=new URL(value);
 if(!['postgres:','postgresql:'].includes(u.protocol))throw Error('INVALID_CONNECTION');
 const user=decodeURIComponent(u.username);
 const local=fixture&&['127.0.0.1','localhost'].includes(u.hostname)&&u.pathname==='/backup_fixture';
 if(!local&&!(u.hostname==='db.'+PROJECT+'.supabase.co'||u.hostname.endsWith('.pooler.supabase.com')&&user.endsWith('.'+PROJECT)))throw Error('WRONG_SOURCE_PROJECT');
 return {u,local};
}
export const sha=data=>createHash('sha256').update(data).digest('hex');
async function command(cmd,args,env,cwd){
 await new Promise((resolve,reject)=>{const p=spawn(cmd,args,{env,cwd,stdio:['ignore','ignore','pipe']});let failed=false;p.stderr.on('data',()=>{failed=true});p.on('error',()=>reject(Error('COMMAND_UNAVAILABLE')));p.on('close',code=>code===0&&!failed?resolve():reject(Error('DUMP_OR_ARCHIVE_FAILED')));});
}
const ident=s=>'"'+s.replaceAll('"','""')+'"';
export async function createBackup({databaseUrl,storageKey,adapter,download,fixture=false}){
 const {u,local}=validateConnection(databaseUrl,fixture);
 if(!fixture&&!storageKey)throw Error('MISSING_STORAGE_CREDENTIAL');
 const caPath=fileURLToPath(new URL('./supabase-ca.crt',import.meta.url));
 const ca=local?undefined:verifySupabaseCa(await fs.readFile(caPath,'utf8'));
 const readOnly='-c default_transaction_read_only=on -c statement_timeout=600000 -c lock_timeout=10000';
 const env={...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGOPTIONS:readOnly,PGSSLMODE:local?'disable':'verify-full',PGSSLROOTCERT:local?'':caPath};
 const client=new pg.Client({host:env.PGHOST,port:Number(env.PGPORT),database:env.PGDATABASE,user:env.PGUSER,password:env.PGPASSWORD,options:readOnly,connectionTimeoutMillis:15000,ssl:local?false:{ca,rejectUnauthorized:true}});
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'elegancia-backup-'));
 const dir=path.join(root,'bundle');await fs.mkdir(path.join(dir,'objects'),{recursive:true});
 const runId=new Date().toISOString().replaceAll(':','-')+'-'+randomUUID();
 const manifest={project:PROJECT,runId,startedAt:new Date().toISOString(),snapshotAt:null,sourceWrites:0,tableCounts:[],files:[],buckets:[]};
 let transaction=false,stage='connect';
 try{
  await client.connect();await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');transaction=true;
  stage='snapshot';const snap=(await client.query('select pg_export_snapshot() as id, transaction_timestamp() as at')).rows[0];manifest.snapshotAt=snap.at;
  stage='inventory';manifest.buckets=(await client.query('select id,name,public,file_size_limit,allowed_mime_types from storage.buckets order by id')).rows;
  const objects=(await client.query('select bucket_id,name,metadata,updated_at from storage.objects order by bucket_id,name')).rows;
  const tables=(await client.query("select schemaname,tablename from pg_tables where schemaname in ('public','auth','storage','supabase_migrations') order by schemaname,tablename")).rows;
  stage='row_counts';for(const t of tables){const r=await client.query('select count(*)::text as count from '+ident(t.schemaname)+'.'+ident(t.tablename));manifest.tableCounts.push({...t,count:r.rows[0].count});}
  stage='database_dump';await command('pg_dump',['--format=custom','--snapshot='+snap.id,'--file='+path.join(dir,'database.dump')],env,dir);
  stage='archive_check';await command('pg_restore',['--list',path.join(dir,'database.dump')],env,dir);
  stage='roles_dump';await command('pg_dumpall',['--roles-only','--no-role-passwords','--file='+path.join(dir,'roles.sql')],env,dir);
  const sizes=await fs.stat(path.join(dir,'database.dump'));if(sizes.size<100)throw Error('EMPTY_DATABASE_ARCHIVE');
  stage='storage_download';for(const object of objects){
   const buffer=download?await download(object):Buffer.from(await (await fetch('https://'+PROJECT+'.supabase.co/storage/v1/object/'+encodeURIComponent(object.bucket_id)+'/'+object.name.split('/').map(encodeURIComponent).join('/'),{headers:storageHeaders(storageKey),redirect:'error'}).then(r=>{if(!r.ok)throw Error('STORAGE_DOWNLOAD_FAILED');return r})).arrayBuffer());
   const expected=Number(object.metadata?.size);if(!Number.isSafeInteger(expected)||expected!==buffer.length)throw Error('STORAGE_SIZE_MISMATCH');
   const etag=object.metadata?.eTag??object.metadata?.etag;if(typeof etag==='string'&&/^[a-f0-9]{32}$/i.test(etag.replaceAll('"',''))&&createHash('md5').update(buffer).digest('hex')!==etag.replaceAll('"','').toLowerCase())throw Error('STORAGE_ETAG_MISMATCH');
   const file='objects/'+sha(Buffer.from(object.bucket_id+'\0'+object.name))+'.bin';
   await fs.writeFile(path.join(dir,file),buffer,{flag:'wx',mode:0o600});
   manifest.files.push({bucket:object.bucket_id,name:object.name,archivePath:file,bytes:buffer.length,sha256:sha(buffer),metadata:object.metadata,updatedAt:object.updated_at});
  }
  await client.query('COMMIT');transaction=false;
  manifest.completedAt=new Date().toISOString();
  stage='local_integrity';for(const f of manifest.files)if(sha(await fs.readFile(path.join(dir,f.archivePath)))!==f.sha256)throw Error('LOCAL_FILE_CHECKSUM_MISMATCH');
  manifest.databaseBytes=sizes.size;manifest.databaseSha256=sha(await fs.readFile(path.join(dir,'database.dump')));
  manifest.rolesSha256=sha(await fs.readFile(path.join(dir,'roles.sql')));
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  stage='package';const archive=path.join(root,'backup.tar.gz');await command('tar',['-czf',archive,'-C',dir,'.'],env,root);
  const bytes=await fs.readFile(archive),hash=sha(bytes),prefix=PROJECT+'/'+runId;
  const storage=adapter??{put:(name,data)=>put(name,data,{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/octet-stream'}),read:async name=>{const r=await get(name,{access:'private',useCache:false});if(r?.statusCode!==200)throw Error('CLOUD_READBACK_FAILED');return Buffer.from(await new Response(r.stream).arrayBuffer())}};
  stage='cloud_upload';const uploaded=await storage.put(prefix+'/backup.tar.gz',createReadStream(archive));
  stage='cloud_readback';const restored=await storage.read(uploaded.pathname??prefix+'/backup.tar.gz');
  if(sha(restored)!==hash||restored.length!==bytes.length)throw Error('CLOUD_CHECKSUM_MISMATCH');
  stage='private_access';if(!fixture){const r=await fetch(uploaded.url,{redirect:'manual'});if(r.ok||r.status<400||r.status>=500)throw Error('PRIVATE_ACCESS_CHECK_FAILED');}
  const summary={status:'verified',project:PROJECT,runId,snapshotAt:manifest.snapshotAt,completedAt:new Date().toISOString(),files:manifest.files.length,sourceFileBytes:manifest.files.reduce((n,f)=>n+f.bytes,0),tables:manifest.tableCounts.length,archiveBytes:bytes.length,sha256:hash,privateStorage:true,sourceWrites:0,pathname:uploaded.pathname??prefix+'/backup.tar.gz',restoreTest:'Archive parsed with pg_restore --list; production was not restored'};
  stage='completion_marker';await storage.put(prefix+'/VERIFIED.json',Buffer.from(JSON.stringify(summary,null,2)));
  return summary;
 }catch(error){const info=safeError(error,stage);throw Object.assign(Error(info.code),{code:info.code,backupStage:info.stage});}finally{if(transaction)await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const summary=await createBackup({databaseUrl:process.env.BACKUP_DATABASE_URL,storageKey:process.env.BACKUP_STORAGE_SERVICE_KEY});console.log(JSON.stringify(summary));}
 catch(error){console.log(JSON.stringify({status:'failed',...safeError(error,error?.backupStage??'validate_connection')}));process.exitCode=1;}
}
