import fs from 'node:fs/promises';
import { Sandbox } from '@vercel/sandbox';
import { safeError } from './safe-errors.mjs';
const required=['BACKUP_DATABASE_URL','BACKUP_STORAGE_SERVICE_KEY'];
const missing=required.filter(name=>!process.env[name]);
await fs.mkdir('public',{recursive:true});
await fs.writeFile('public/index.html','<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Backup privado</title><body><h1>Backup privado — Elegância Pratas</h1><p>As cópias são guardadas em armazenamento privado e nunca publicadas neste endereço.</p><p>Consulte o relatório privado na sua conta Vercel.</p></body></html>');
const setupOnly=missing.length>0&&process.env.BACKUP_SETUP_CHECK==='1';
if(missing.length&&!setupOnly){console.log('BACKUP_PENDING_CREDENTIALS: '+missing.join(', '));process.exit(0);}
if(!process.env.BLOB_STORE_ID&&!process.env.BLOB_READ_WRITE_TOKEN)throw Error('PRIVATE_STORE_REQUIRED');
let sandbox,stage='create_environment';
try{
 const env={};for(const key of [...required,'BLOB_STORE_ID','BLOB_READ_WRITE_TOKEN','VERCEL_OIDC_TOKEN','VERCEL_PROJECT_ID','VERCEL_TEAM_ID'])if(process.env[key])env[key]=process.env[key];
 sandbox=await Sandbox.create({runtime:'node24',timeout:15*60*1000,resources:{vcpus:2},persistent:false,env});
 stage='install_tools';const install=await sandbox.runCommand({cmd:'dnf',args:['install','-y','postgresql17'],sudo:true});
 if(install.exitCode!==0)throw Error('BACKUP_RUNTIME_SETUP_FAILED');
 stage='upload_source';const files=await Promise.all(['package.json','package-lock.json','worker.mjs','safe-errors.mjs'].map(async name=>({path:name,content:await fs.readFile(name)})));await sandbox.writeFiles(files);
 stage='install_dependencies';const npm=await sandbox.runCommand({cmd:'npm',args:['ci','--ignore-scripts']});if(npm.exitCode!==0)throw Error('BACKUP_DEPENDENCY_SETUP_FAILED');
 if(setupOnly)await sandbox.writeFiles([{path:'probe.mjs',content:Buffer.from("import {put,get,del} from '@vercel/blob';import{randomUUID}from'node:crypto';const name='_verificacao/setup-'+randomUUID()+'.json';const data=JSON.stringify({synthetic:true,noCustomerData:true});const b=await put(name,data,{access:'private',addRandomSuffix:false,allowOverwrite:false});const r=await get(b.pathname,{access:'private',useCache:false});if(r?.statusCode!==200||await new Response(r.stream).text()!==data)throw Error('READBACK_FAILED');const noAuth=await fetch(b.url,{redirect:'manual'});if(noAuth.ok||noAuth.status<400||noAuth.status>=500)throw Error('NOT_PRIVATE');await del(b.url);console.log(JSON.stringify({status:'setup_verified',backupDone:false,privateAccessVerified:true}));")}]);
 stage='run_backup';const run=await sandbox.runCommand({cmd:'node',args:[setupOnly?'probe.mjs':'worker.mjs']});
 stage='parse_result';const output=await run.stdout();let summary;try{summary=JSON.parse(output.trim())}catch{throw Error('BACKUP_RESULT_INVALID')}
 if(run.exitCode!==0||summary.status!==(setupOnly?'setup_verified':'verified'))throw Object.assign(Error('BACKUP_NOT_COMPLETED'),{code:summary.code,backupStage:summary.stage});
 console.log(JSON.stringify(summary));
}catch(error){console.error(JSON.stringify({status:'failed',...safeError(error,error?.backupStage??stage)}));process.exitCode=1;}
finally{await sandbox?.stop();}
