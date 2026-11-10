import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import pg from 'pg';
import { createBackup,validateConnection,sha } from './worker.mjs';
const base={host:'127.0.0.1',port:5544,user:os.userInfo().username,database:'backup_fixture'};
const uri='postgresql://'+encodeURIComponent(base.user)+'@127.0.0.1:5544/backup_fixture';
test('guard blocks other projects and local sources unless explicitly used by fixture tests',()=>{
 assert.throws(()=>validateConnection('postgresql://u:p@elsewhere.example/postgres'),/WRONG_SOURCE_PROJECT/);
 assert.throws(()=>validateConnection(uri),/WRONG_SOURCE_PROJECT/);
 assert.equal(validateConnection(uri,true).local,true);
 const r=spawnSync(process.execPath,['backup.mjs'],{env:{...process.env,BACKUP_DATABASE_URL:'',BACKUP_STORAGE_SERVICE_KEY:''},encoding:'utf8'});
 assert.equal(r.status,0);assert.match(r.stdout,/BACKUP_PENDING_CREDENTIALS/);
});
test('exports consistent database and objects, restores fixture, and rejects corrupt cloud bytes',async()=>{
 const c=new pg.Client(base);await c.connect();
 await c.query("create schema storage;create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text,metadata jsonb,updated_at timestamptz);create table public.products(id int primary key,price_cents int,stock int);insert into public.products values(1,1250,3),(2,2400,4);insert into storage.buckets values('private','private',false,null,null),('public','public',true,null,null)");
 const payloads=new Map([['private/a',Buffer.from('private fixture photo')],['public/../unsafe',Buffer.from('public fixture photo')]]);
 for(const [key,bytes] of payloads){const i=key.indexOf('/');await c.query('insert into storage.objects values($1,$2,$3,now())',[key.slice(0,i),key.slice(i+1),{size:bytes.length}]);}
 await c.end();
 const cloud=await fs.mkdtemp(path.join(os.tmpdir(),'cloud-fixture-'));const files=new Map();let verified=0,corrupt=false;
 const adapter={put:async(name,data)=>{let b;if(Buffer.isBuffer(data))b=data;else{const chunks=[];for await(const x of data)chunks.push(x);b=Buffer.concat(chunks)}const p=path.join(cloud,sha(Buffer.from(name)));await fs.writeFile(p,b);files.set(name,p);if(name.endsWith('VERIFIED.json'))verified++;return{pathname:name,url:'https://fixture.invalid/'+name}},read:async name=>{const b=await fs.readFile(files.get(name));if(corrupt)b[0]^=1;return b}};
 const run=()=>createBackup({databaseUrl:uri,fixture:true,adapter,download:async o=>payloads.get(o.bucket_id+'/'+o.name)});
 const result=await run();assert.equal(result.status,'verified');assert.equal(result.files,2);assert.equal(result.sourceWrites,0);assert.equal(verified,1);
 const restored=await fs.mkdtemp(path.join(os.tmpdir(),'restore-fixture-'));execFileSync('tar',['-xzf',files.get(result.pathname),'-C',restored]);
 const manifest=JSON.parse(await fs.readFile(path.join(restored,'manifest.json'),'utf8'));assert.equal(manifest.files.length,2);
 for(const f of manifest.files)assert.equal(sha(await fs.readFile(path.join(restored,f.archivePath))),f.sha256);
 execFileSync('createdb',['-h','127.0.0.1','-p','5544','backup_restored']);
 execFileSync('pg_restore',['-h','127.0.0.1','-p','5544','--no-owner','--exit-on-error','--dbname=backup_restored',path.join(restored,'database.dump')]);
 const check=new pg.Client({...base,database:'backup_restored'});await check.connect();assert.deepEqual((await check.query('select sum(price_cents*stock)::int as total from public.products')).rows,[{total:13350}]);await check.end();
 const readOnly=new pg.Client({...base,options:'-c default_transaction_read_only=on'});await readOnly.connect();await assert.rejects(readOnly.query('delete from public.products'),e=>e.code==='25006');assert.equal((await readOnly.query('select count(*)::int as n from public.products')).rows[0].n,2);await readOnly.end();
 corrupt=true;await assert.rejects(run(),/CLOUD_CHECKSUM_MISMATCH/);assert.equal(verified,1);
});
