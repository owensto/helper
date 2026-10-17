/** NONBROWSER TEST HARNESS. Real unmodified C1 and real baseline Three.js exports;
 * synthetic scene nodes, state and water samples. No browser, render/physics loop,
 * production spawn approval, room clock or invented committed-frame API.
 * C1 hashes all original host assets. No digest substitutions are permitted.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
export const OWNER_SHA='36903985f2182c902427fed77d4e28c61a7639ca';
export const BAY='atlas-bay-25-sealab12';
const root=fileURLToPath(new URL('.',import.meta.url));
const pinned=JSON.parse(readFileSync(resolve(root,'provenance.json'),'utf8'));
const sha256=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const exact={};
for(const [name,pin] of Object.entries(pinned.files)){
  const b=readFileSync(resolve(root,name));
  assert.equal(b.length,pin.bytes,`owner source length ${name}`);
  assert.equal(sha256(b),pin.sha256,`owner source SHA256 ${name}`);
  assert.equal(gitBlob(b),pin.gitBlob,`owner source Git blob ${name}`);
  exact[name]=b;
}
export const descriptor=JSON.parse(exact['descriptor.json']);
const assetRoot=resolve(process.env.C1_HOST_ASSETS||resolve(root,'site'));
const assets=new Map();
for(const [path,expected] of Object.entries(descriptor.hostFiles)){
  let b;try{b=readFileSync(resolve(assetRoot,path));}catch{throw Error(`ORIGINAL_C1_INPUT_REQUIRED:${path}`);}
  assert.equal(sha256(b),expected,`original C1 host input ${path}`);assets.set(path,b);
}
export const inputEvidence=Object.freeze({ownerSourceSHA:OWNER_SHA,baselinePublicSHA:descriptor.baseline.publicSHA,
  originalAssetsVerified:assets.size,assetRoot,runtimeSHA256:sha256(assets.get('runtime.js')),
  descriptorSHA256:sha256(exact['descriptor.json']),hookSHA256:sha256(exact['host-hooks.cjs'])});

export function createHarness({x=0,seconds=10}={}){
  const counts={steps:0,resets:0,refresh:0,pauseWrites:0,surface:0,bottom:0};
  const assetReads=[];
  const ctx=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,URL,console,AbortController,
    document:{baseURI:'https://c1-nonbrowser-fixture.invalid/'},
    // Local immutable input provider, not a network fetch or permissive hash oracle.
    fetch:async url=>{
      if(url.origin!=='https://c1-nonbrowser-fixture.invalid')throw Error('UNEXPECTED_ASSET_ORIGIN');
      const path=url.pathname.slice(1),original=assets.get(path);assetReads.push(path);
      const b=original?Buffer.from(original):null;
      return {ok:!!b,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
    }
  });
  ctx.window=ctx;ctx.self=ctx;
  vm.runInContext(assets.get('runtime.js').toString('utf8'),ctx,{filename:'original-baseline-runtime.js'});
  const T=ctx.ATLASRuntime;
  assert.ok(T?.Group&&T?.Matrix4&&T?.Quaternion,'Original runtime exports present');
  const scene=new T.Group(),boat=new T.Group(),model=new T.Group(),captain=new T.Group();
  scene.name='NONBROWSER_FIXTURE_SCENE';scene.add(boat);boat.add(model,captain);
  captain.name='SEA12_CAPTAIN';captain.position.set(-1.6,1.06,.18);
  for(const name of ['PLAY_STEERING','PLAY_THROTTLE']){const node=new T.Group();node.name=name;model.add(node);}
  const state={elapsed:seconds,location:'basin',config:{physics:'seamanship',tide:0},
    performanceMode:'nonbrowser-fixture',environment:'calm',x,z:0,heading:0,roll:0,pitch:0,
    vx:0,vz:0,yaw:0,engine:true,gear:1,throttle:.2,steer:0,rudder:0,trimActual:0,
    // Nonzero private RPM proves unknown transport RPM is not a fabricated reading.
    rpm:1731,grounded:false,airborne:false,destroyed10:false,
    step(){counts.steps++;throw Error('UNAUTHORIZED_HOST_STEP');},
    reset(){counts.resets++;this.elapsed=0;this.heading=0;return 'fixture-original-reset';}
  };
  let paused=false,ejected=false,mode='drive';
  const weather={name:'calm',current:{amp:.1},target:{amp:.1}};
  const options={damage:false,ejection:false,explosions:false,killSwitch:false,light:'day'};
  const A={boat,model,state,coast:{obstacles:[]},mode:()=>mode,inspect:()=>({paused}),
    setPaused(){counts.pauseWrites++;throw Error('UNAUTHORIZED_LOCAL_WRITE');},
    refresh(){counts.refresh++;throw Error('UNAUTHORIZED_LOCAL_WRITE');}};
  Object.assign(ctx,{BAYPLAY:A,SEA12:{ready:true},SEA12_WATER:{ready:true},SEA12_GEO:{ready:true,colliders:[]},
    BayGeo:{data:{origin:{lat:0,lon:0}}},SEA09_WATER:{inspect:()=>({turbidity:.1})},
    Sea09World:{sample(){counts.bottom++;return {known:false,source:'NONBROWSER_FIXTURE_UNKNOWN'};}},
    BayMotion:{surface(){counts.surface++;return 0;}},SEA10:{inspect:()=>({weather,options,ejected})}});
  const originalStep=state.step,originalReset=state.reset;
  vm.runInContext(exact['host-hooks.cjs'].toString('utf8'),ctx,{filename:'unmodified-final-C1-host-hooks.cjs'});
  function pose({p=[x,0,0],heading=0,roll=0,pitch=0,time=state.elapsed}={}){
    // Explicit test input authoring, NEVER called by MP. This is not a physics step.
    Object.assign(state,{x:p[0],z:p[2],heading,roll,pitch,elapsed:time});
    boat.position.fromArray(p);boat.rotation.set(roll,-heading,pitch,'YXZ');scene.updateMatrixWorld(true);
  }
  pose();
  let api=null;
  return {ctx,T,scene,boat,model,captain,A,state,weather,options,counts,assetReads,originalStep,originalReset,pose,
    setPaused:v=>{paused=v;},setEjected:v=>{ejected=v;},setMode:v=>{mode=v;},
    get api(){return api;},
    attach:async()=>{api=await ctx.SeaLab12HostHooks.attach(descriptor);return api;},
    dispose:()=>api?.dispose(),
    ownershipUntouched:()=>assert.equal(state.step,originalStep),
    noWrites:()=>{assert.equal(counts.steps,0);assert.equal(counts.refresh,0);assert.equal(counts.pauseWrites,0);}
  };
}
