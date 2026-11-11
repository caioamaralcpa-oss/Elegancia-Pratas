import test from 'node:test';
import assert from 'node:assert/strict';
import {storageHeaders,verifySupabaseCa} from './worker.mjs';
test('secret keys use the apikey header without invalid Bearer JWT',()=>{
 assert.deepEqual(storageHeaders('sb_secret_synthetic'),{apikey:'sb_secret_synthetic'});
});
test('legacy service credentials keep the existing two headers',()=>{
 const key='synthetic.jwt.fixture';assert.deepEqual(storageHeaders(key),{apikey:key,Authorization:'Bearer '+key});
});
test('recognized copied wrappers are normalized without altering contents',()=>{
 assert.deepEqual(storageHeaders(' SUPABASE_SECRET_KEY="sb_secret_synthetic" '),{apikey:'sb_secret_synthetic'});
 assert.deepEqual(storageHeaders("'synthetic.jwt.fixture'"),{apikey:'synthetic.jwt.fixture',Authorization:'Bearer synthetic.jwt.fixture'});
 assert.throws(()=>storageHeaders(' '),/MISSING_STORAGE_CREDENTIAL/);
});

test('official public CA accepted; malformed, wrong or expired trust anchors rejected',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {rootCertificates}=await import('node:tls');
 const pem=await readFile(new URL('./supabase-ca.crt',import.meta.url),'utf8');
 assert.equal(verifySupabaseCa(pem),pem);
 assert.throws(()=>verifySupabaseCa('invalid'),/INVALID_SUPABASE_CA/);
 assert.throws(()=>verifySupabaseCa(rootCertificates[0]),/INVALID_SUPABASE_CA/);
 assert.throws(()=>verifySupabaseCa(pem,Date.parse('2032-01-01T00:00:00Z')),/INVALID_SUPABASE_CA/);
});
