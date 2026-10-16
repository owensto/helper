/** M6 INPUT READINESS ONLY. No browser, socket, host physics, download or substitute hash.
 * Successful end-to-end receiver execution requires all original C1 host assets.
 * This command deliberately exits 2 while any are missing, and never reports an M6 pass.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createC1PoseReceiver} from '../../../client/c1-reader.mjs';
const root = fileURLToPath(new URL('.',import.meta.url));
const sourceSHA='36903985f2182c902427fed77d4e28c61a7639ca';
const pin={
  'descriptor.json':{gitBlob:'30affbbcc2b04d8b8e78a07206cb9eab9c2af2f7',sha256:'851b0932720fcfbec786778cc71a9c76fecd4b1a96e322872b3574c6c7f41db3'},
  'host-hooks.cjs':{gitBlob:'458a40ffb79be48c43a1190f2e5722112f8bfb99',sha256:'ad928f37dbfde0de2455a52744377a417a117c71c1a04f483283482d5728d9a1'}
};
const sha256=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const inputs={};
for(const [name,expected] of Object.entries(pin)){
  const bytes=readFileSync(resolve(root,name));
  assert.equal(blob(bytes),expected.gitBlob,`Unmodified C1 Git blob: ${name}`);
  assert.equal(sha256(bytes),expected.sha256,`Unmodified C1 SHA256: ${name}`);
  inputs[name]=bytes;
}
const descriptor=JSON.parse(inputs['descriptor.json']);
const hostCode=inputs['host-hooks.cjs'].toString('utf8');
// No artificial success response from crypto: native Node WebCrypto hashes actual input bytes.
const originalReset=function(){throw Error('UNEXPECTED_HOST_RESET');};
const originalStep=function(){throw Error('UNEXPECTED_HOST_STEP');};
const state={reset:originalReset,step:originalStep};
const requests=[];
const context=vm.createContext({crypto:webcrypto,TextEncoder,URL,
  document:{baseURI:'https://m6-input-probe.invalid/'},
  // Deliberately incomplete NONBROWSER readiness fixture, not a Sea Lab host.
  BAYPLAY:{state},ATLASRuntime:{},SEA12:{ready:true},SEA12_WATER:{ready:true},SEA12_GEO:{ready:true},Sea09World:{},
  fetch:async url=>{requests.push(url.pathname.slice(1));return {ok:false};}
});
vm.runInContext(hostCode,context,{filename:'unmodified-final-C1-host-hooks.cjs'});
const hooks=context.SeaLab12HostHooks;
// Challenge 1: descriptor tampering must reject BEFORE reading host assets.
const tampered=structuredClone(descriptor);tampered.combinedAcceptance=true;
await assert.rejects(hooks.attach(tampered),/DESCRIPTOR_MISMATCH/);
assert.equal(requests.length,0);
// Challenge 2: genuine descriptor/manifest hashes pass, but missing assets must NOT attach.
await assert.rejects(hooks.attach(descriptor),/HOST_ASSET_MISMATCH:access11\.js/);
assert.deepEqual(requests,['access11.js']);
assert.equal(state.reset,originalReset);assert.equal(state.step,originalStep);
// The real MP receiver cannot be constructed from the hook factory or a missing reader.
// This is ONLY a prerequisite rejection, not successful C1 -> MP execution.
await assert.rejects(createC1PoseReceiver({reader:hooks}),/READ_ONLY_READER_REQUIRED/);
await assert.rejects(createC1PoseReceiver({reader:undefined}),/READ_ONLY_READER_REQUIRED/);
const assetRoot=process.env.C1_HOST_ASSETS;
const assets=Object.entries(descriptor.hostFiles).map(([path,expected])=>{
  if(!assetRoot)return {path,expectedSHA256:expected,status:'MISSING_NOT_MOUNTED'};
  try{
    const bytes=readFileSync(resolve(assetRoot,path)),actual=sha256(bytes);
    return {path,expectedSHA256:expected,actualSHA256:actual,status:actual===expected?'MATCH':'HASH_MISMATCH'};
  }catch(e){return {path,expectedSHA256:expected,status:e.code==='ENOENT'?'MISSING':'READ_FAILED'};}
});
const complete=assets.every(a=>a.status==='MATCH');
console.log(JSON.stringify({
  iteration:'M6',status:complete?'INPUTS_READY_RECEIVER_SUITE_NOT_EXECUTED':'BLOCKED_ORIGINAL_INTEGRITY_INPUTS',
  mpSourceSHA:'46c81ebfff13f83645f6b5091b63e845bc422871',ownerSourceSHA:sourceSHA,
  ownerRevision:descriptor.revision,node:process.version,sourcePins:pin,
  executionScope:'Unmodified C1 attach rejection before successful integrity-checked host binding. Actual MP constructor prerequisite rejection only.',
  observations:{descriptorTamperRejected:true,missingAssetRejected:true,hostStepUnchanged:true,hostResetUnchanged:true,MPMissingReaderRejected:true},
  assetRoot:assetRoot||null,originalAssetsMatched:assets.filter(a=>a.status==='MATCH').length,originalAssetsRequired:assets.length,assets,
  successfulC1Attach:false,successfulReceiverClientCoupling:false,positiveM6Checks:0,
  unexecuted:['actual read/reset/dispose through MP client','unknown RPM=null through real hook','epoch/world/identity transition coupling','ejection/detachment receiving behavior','local restore capability separation after successful attach','non-stepping proof after successful attach'],
  productionFilesChanged:[],defectDisposition:'NO_MP_DEFECT_ESTABLISHED; missing prerequisites are not a product defect',
  externalGates:{exactWsPinLockAudit:'UNCHANGED_UNPASSED',browserMotion:'UNCHANGED_BLOCKED',integratedSeaLabRegression:'NOT_RUN',liveMultiplayer:false}
},null,2));
process.exitCode=complete?3:2;
