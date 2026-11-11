import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {sha,verifyArchive,verifyObject,assertInventory,safeSegments,normalizeCredential} from './storage-only.mjs';
const data=Buffer.from('Synthetic fixture only');
const manifest={kind:'storage_only',project:'sltohhqejguauhanjhfj',buckets:[{id:'fixture'}],files:[{bucket:'fixture',name:'folder/peça.jpg',bytes:data.length,sha256:sha(data),base64:data.toString('base64')}]};
const archive=m=>gzipSync(Buffer.from(JSON.stringify(m)));
test('a cloud archive can reconstruct exact binary bytes and names',()=>{
 const bytes=archive(manifest);assert.deepEqual(verifyArchive(bytes,sha(bytes)),{files:1,bytes:data.length,buckets:1});
 assert.equal(safeSegments('folder/peça.jpg'),'folder/pe%C3%A7a.jpg');
});
test('tampered archives and object bytes are rejected',()=>{
 const bytes=archive(manifest);assert.throws(()=>verifyArchive(Buffer.from('invalid'),sha(bytes)),/CLOUD_CHECKSUM_MISMATCH/);
 const bad=structuredClone(manifest);bad.files[0].base64=Buffer.from('tampered').toString('base64');const corrupt=archive(bad);assert.throws(()=>verifyArchive(corrupt,sha(corrupt)),/OBJECT_CHECKSUM_MISMATCH/);
});
test('duplicate paths, wrong projects, path traversal, missing buckets rejected',()=>{
 for(const change of [m=>m.project='wrong',m=>m.files.push({...m.files[0]}),m=>m.files[0].name='../escape',m=>m.buckets=[]]){
  const bad=structuredClone(manifest);change(bad);const bytes=archive(bad);assert.throws(()=>verifyArchive(bytes,sha(bytes)));
 }
});
test('metadata sizes, etags and concurrent source changes checked',()=>{
 assert.deepEqual(verifyObject(data,{size:data.length}),{bytes:data.length,sha256:sha(data)});
 assert.throws(()=>verifyObject(data,{size:0}),/STORAGE_SIZE_MISMATCH/);
 assert.throws(()=>verifyObject(data,{size:data.length,eTag:'00000000000000000000000000000000'}),/STORAGE_ETAG_MISMATCH/);
 assert.throws(()=>assertInventory({files:1},{files:2}),/SOURCE_CHANGED_DURING_BACKUP/);
});

test('credential wrappers removed without printing or changing secret contents',()=>{
 assert.equal(normalizeCredential(' SUPABASE_SERVICE_ROLE_KEY="fixture.only" '),'fixture.only');
 assert.equal(normalizeCredential("'fixture.only'"),'fixture.only');
 assert.equal(normalizeCredential('sb_secret_fixture'),'sb_secret_fixture');
});
