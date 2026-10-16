/* CORE-owned Sea Lab 12 boundary. No renderer, character, transport or physics loop. */
(function (G) {
'use strict';
const REV = 'sealab12-core-integration/1.0.0';
const PUBLIC = 'a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff';
const BAY = 'atlas-bay-25-sealab12';
const sessions = new WeakMap();
function canonical(v) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw Error('NON_FINITE_VALUE'); return JSON.stringify(v); }
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (!v || typeof v !== 'object') throw Error('UNSUPPORTED_VALUE');
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}
function freeze(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); }
  return v;
}
const copy = v => freeze(JSON.parse(canonical(v)));
const no = reason => freeze({ available: false, reason });
async function sha(bytes) {
  const digest = await G.crypto.subtle.digest('SHA-256', typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
async function attach(input) {
  const D = copy(input);
  if (await sha(canonical(D)) !== '6b2a27d9a7164d5983007299552559d6ae023d2f6059ce195a2659160b114719') throw Error('DESCRIPTOR_MISMATCH');
  if (D.revision !== REV || D.baseline.publicSHA !== PUBLIC) throw Error('UNAPPROVED_BASELINE');
  const A = G.BAYPLAY, T = G.ATLASRuntime, S = A?.state;
  if (!G.SEA12?.ready || !G.SEA12_WATER?.ready || !G.SEA12_GEO?.ready || !G.Sea09World || !T || !S) throw Error('HOST_NOT_READY');
  if (sessions.has(A)) throw Error('ALREADY_ATTACHED');
  // The descriptor's approved manifest cannot be weakened by its caller.
  if (await sha(canonical(D.hostFiles)) !== D.baseline.hostFilesCanonicalSHA256 ||
      D.baseline.hostFilesCanonicalSHA256 !== '2e9dec1629b89e1f799e5b9120e05954a80f78f71c5a04a30c2815c0f82be034') throw Error('MANIFEST_MISMATCH');
  for (const [path, expected] of Object.entries(D.hostFiles)) {
    if (!/^[\w./-]+$/.test(path) || path.includes('..')) throw Error('INVALID_ASSET_PATH');
    const r = await fetch(new URL(path, document.baseURI), {cache: 'no-store'});
    if (!r.ok || await sha(await r.arrayBuffer()) !== expected) throw Error('HOST_ASSET_MISMATCH:' + path);
  }
  const originalStep = S.step, originalReset = S.reset, captain = A.boat.getObjectByName('SEA12_CAPTAIN');
  if (!captain || !A.model.getObjectByName('PLAY_STEERING') || !A.model.getObjectByName('PLAY_THROTTLE')) throw Error('HOST_ANCHOR_MISSING');
  let disposed = false, epoch = 0, descriptor = null, descriptorKey = '', checkpointCounter = 0;
  const checkpoints = new Map();
  function resetHook(...args) {
    const result = originalReset.apply(this, args);
    if (this === S) { epoch++; checkpoints.clear(); }
    return result;
  }
  S.reset = resetHook;
  function checkHost() {
    if (disposed) throw Error('DISPOSED');
    if (A.state !== S || S.step !== originalStep || S.reset !== resetHook) throw Error('HOST_OWNERSHIP_CHANGED');
  }
  function world() {
    const op = G.SEA10.inspect(), weather = op.weather;
    const colliders = S.location === 'beaufort' ? G.SEA12_GEO.colliders : A.coast.obstacles;
    return {
      revision: REV, baseline: PUBLIC, scene: S.location,
      sceneOrigin: S.location === 'beaufort' ? G.BayGeo.data.origin : null,
      configuration: {...S.config}, performanceMode: S.performanceMode,
      environmentKey: S.environment,
      weather: {name: weather.name, target: weather.target},
      water: {revision: 'Sea12Waves', referenceDepthM: 8, tideM: S.location === 'beaufort' ? S.config.tide : 0,
        clarity: G.SEA09_WATER.inspect().turbidity, hostFilesSHA256: D.baseline.hostFilesCanonicalSHA256},
      rules: {damage: op.options.damage, ejection: op.options.ejection, explosions: op.options.explosions,
        killSwitch: op.options.killSwitch, light: op.options.light},
      staticColliders: (colliders || []).map(o => ({x0:o.x0,x1:o.x1,z0:o.z0,z1:o.z1}))
    };
  }
  function guard(vesselId, rev) {
    checkHost();
    if (vesselId !== BAY) throw Error(vesselId === 'atlas-d-original-r7' ? 'YACHT_ADAPTER_UNAVAILABLE' : 'UNKNOWN_VESSEL');
    if (!descriptor || rev !== descriptor.worldRevision || canonical(world()) !== descriptorKey) throw Error('STALE_WORLD_REVISION');
  }
  async function describe() {
    checkHost(); const w = world(), key = canonical(w), rev = 'sl12-c1-sha256:' + await sha(key);
    checkHost(); if (key !== canonical(world())) throw Error('WORLD_CHANGED_DURING_DESCRIPTOR');
    descriptorKey = key;
    descriptor = copy({revision: REV, worldRevision: rev, baseline:D.baseline, world:w,
      units:D.units, coordinates:D.coordinates, authority:D.authority, vessels:D.vessels,
      sceneSupported:['basin','beaufort'].includes(S.location),
      combinedAcceptance:false, receiverAcks:{yacht:false,humans:false,multiplayer:false},
      synchronizedRoomPhysics:false, remotePhysics:false, sharedCollisions:false, crews:false});
    return descriptor;
  }
  function clock() {
    return {domain:'client-simulation', epoch, seconds:S.elapsed, fixedStepSeconds:1/60,
      derivedStepIndex:A.mode()==='drive'?Math.round(S.elapsed*60):null,
      paused:A.inspect().paused, mode:A.mode(), resettable:true, roomOrigin:null};
  }
  function transform(node) {
    node.updateWorldMatrix(true, false);
    const m = node.matrixWorld.clone();
    if (!Number.isFinite(m.determinant()) || Math.abs(m.determinant()) < 1e-10) throw Error('SINGULAR_TRANSFORM');
    const p=new T.Vector3(), q=new T.Quaternion(), scale=new T.Vector3(); m.decompose(p,q,scale);
    return {localToWorld:m.toArray(), worldToLocal:m.clone().invert().toArray(),
      position:p.toArray(), quaternionXYZW:q.normalize().toArray(), scale:scale.toArray()};
  }
  function readPose(vesselId, rev) {
    guard(vesselId,rev);
    return copy({revision:REV, worldRevision:rev, vesselId, entityId:null, authority:'local-client',
      clock:clock(), poseStage:'render-committed', transform:transform(A.boat),
      motion:{headingRad:S.heading, renderEulerYXZ:[S.roll,-S.heading,S.pitch],
        velocityWorld:[S.vx,S.verticalVel||0,S.vz], yawRateRadS:S.yaw},
      controls:{engine:S.engine,gear:S.gear,throttle:S.throttle,steering:S.steer,rudder:S.rudder,trim:S.trimActual},
      condition:{grounded:!!S.grounded,airborne:!!S.airborne,destroyed:!!S.destroyed10,ejected:G.SEA10.inspect().ejected}});
  }
  function sampleWater(vesselId, rev, x, z) {
    guard(vesselId,rev); if (!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1e7||Math.abs(z)>1e7) throw Error('INVALID_POINT');
    const bottom=G.Sea09World.sample(x,z,S.location), tide=S.location==='beaufort'?S.config.tide:0;
    const height=G.BayMotion.surface(x,z,S.elapsed,S.environment)+tide;
    return copy({revision:REV,worldRevision:rev,clock:clock(),positionXZ:[x,z],surfaceYM:height,
      known:!!bottom.known,bed:bottom.known?bottom.bed:null,depth:bottom.known?height-bottom.bed:null,
      land:bottom.known?!!bottom.land:null,source:bottom.source,
      weather:G.SEA10.inspect().weather, wakeRevision:'host-local-only', unknownIsNotZero:true});
  }
  function anchors(vesselId, rev) {
    guard(vesselId,rev); const op=G.SEA10.inspect();
    if (op.ejected||S.destroyed10||captain.parent!==A.boat) return no('CAPTAIN_NOT_SEATED');
    const parentInverse=new T.Matrix4().fromArray(transform(A.boat).worldToLocal);
    function one(node) {
      const t=transform(node), local=parentInverse.clone().multiply(new T.Matrix4().fromArray(t.localToWorld));
      return {available:true,semantic:node.name,uuid:node.uuid,localToVessel:local.toArray(),...t};
    }
    return copy({revision:'bay-captain12-pivots/1',vesselId,worldRevision:rev,clock:clock(),
      captainRoot:one(captain),steeringPivot:one(A.model.getObjectByName('PLAY_STEERING')),
      throttlePivot:one(A.model.getObjectByName('PLAY_THROTTLE')),
      seatContact:no('NO_OWNER_CONTACT_PATCH'),leftGrip:no('PIVOT_IS_NOT_GRIP_TARGET'),rightGrip:no('PIVOT_IS_NOT_GRIP_TARGET'),
      leftSole:no('NO_OWNER_SOLE_TARGET'),rightSole:no('NO_OWNER_SOLE_TARGET'),transitionOccupancy:no('NOT_ESTABLISHED')});
  }
  function safe(x,z,heading,occupied) {
    if (S.location!=='basin'||S.config.physics!=='seamanship') return no('NO_APPROVED_SPAWN_PROFILE');
    if (![x,z,heading].every(Number.isFinite)||Math.abs(x)>800||Math.abs(z)>800) return no('OUTSIDE_APPROVED_BASIN');
    if (!Array.isArray(occupied)) return no('OCCUPANCY_REQUIRED');
    // Conservative broadphase excludes the full 9.2 x 3.2 m envelope plus margin.
    for (const o of occupied) {
      if (!o || ![o.x,o.z,o.radiusM].every(Number.isFinite)||o.radiusM<=0) return no('INVALID_OCCUPANCY');
      if (Math.hypot(x-o.x,z-o.z)<5.4+o.radiusM) return no('SPAWN_OCCUPIED');
    }
    for(const o of A.coast.obstacles) {
      const qx=Math.max(o.x0,Math.min(o.x1,x)),qz=Math.max(o.z0,Math.min(o.z1,z));
      if(Math.hypot(x-qx,z-qz)<5.4) return no('SOLID_OBSTACLE');
    }
    const c=Math.cos(heading),s=Math.sin(heading); let minDepth=Infinity;
    // Authored-terrain sampling only; no promise for another hull, unknown chart or future scenery.
    for(let a=-4.6;a<=4.61;a+=.46) for(let b=-1.6;b<=1.61;b+=.4) {
      const q=G.Sea09World.sample(x+c*a-s*b,z+s*a+c*b,S.location);
      if(!q.known||!Number.isFinite(q.bed)) return no('UNKNOWN_DEPTH');
      minDepth=Math.min(minDepth,-q.bed);
      if(q.land||-q.bed<2.5) return no('INSUFFICIENT_STATIC_DEPTH');
    }
    if(G.SEA10.inspect().weather.current.amp>.22||G.SEA10.inspect().weather.target.amp>.22) return no('SEA_STATE_OUTSIDE_SPAWN_ENVELOPE');
    return copy({available:true,minStaticDepthM:minDepth,envelope:D.vessels[BAY].spawn.envelope});
  }
  function validatePlacement(vesselId,rev,p,occupied) {
    guard(vesselId,rev);
    if(!p || !Array.isArray(p.positionXZ))return no('INVALID_PLACEMENT');
    return safe(p.positionXZ[0],p.positionXZ[1],p.headingRad,occupied);
  }
  function prepareSpawn(vesselId,rev,slot,occupied) {
    guard(vesselId,rev);
    if(!Number.isInteger(slot)||slot<0||slot>7) return no('INVALID_SLOT');
    const p={positionXZ:[-240+slot*30,-300],headingRad:0}; const checked=validatePlacement(vesselId,rev,p,occupied);
    return checked.available?copy({...checked,revision:REV,worldRevision:rev,vesselId,slot,...p,engine:false,gear:0,throttle:0}):checked;
  }
  function stoppedPlacement(p) {
    // Host-owned narrow write. Time, configuration, weather, damage and fuel are NOT restored.
    A.setPaused(true);
    Object.assign(S,{x:p.positionXZ[0],z:p.positionXZ[1],heading:p.headingRad,vx:0,vz:0,u:0,v:0,yaw:0,
      verticalVel:0,pitchVel:0,rollVel:0,pitch:0,roll:0,engine:false,rpm:0,portRpm:0,starboardRpm:0,
      gear:0,throttle:0,steer:0,rudder:0,startTimer:0,speedOverGround:0,airborne:false,contact:false,grounded:false});
    G.Sea12Waves.reset();
    S.heave=G.BayMotion.surface(S.x,S.z,S.elapsed,S.environment);
    A.refresh(); return {available:true,status:'restored-stopped',timePreserved:true,paused:true};
  }
  function localWriteGate(vesselId,rev) {
    guard(vesselId,rev);
    if(A.mode()!=='drive')throw Error('DRIVE_MODE_REQUIRED');
    if(S.destroyed10||S.engineDisabled10||G.SEA10.inspect().ejected)throw Error('RECOVERY_REQUIRED');
  }
  function spawnLocal(vesselId,rev,slot,occupied) {
    localWriteGate(vesselId,rev); const p=prepareSpawn(vesselId,rev,slot,occupied);
    if(!p.available)return p;
    const result=stoppedPlacement(p);epoch++;checkpoints.clear();
    return copy({...result,vesselId,worldRevision:rev,clock:clock()});
  }
  function captureRestorePoint(vesselId,rev) {
    guard(vesselId,rev);const token=freeze({id:++checkpointCounter,revision:REV,vesselId,worldRevision:rev,epoch});
    checkpoints.set(token,{positionXZ:[S.x,S.z],headingRad:S.heading,epoch});
    if(checkpoints.size>16)checkpoints.delete(checkpoints.keys().next().value);
    return token;
  }
  function restoreLocal(token,occupied) {
    checkHost();const p=checkpoints.get(token);if(!p)return no('NOT_A_LOCAL_RESTORE_TOKEN');
    localWriteGate(token.vesselId,token.worldRevision);if(p.epoch!==epoch)return no('STALE_CLOCK_EPOCH');
    const check=validatePlacement(token.vesselId,token.worldRevision,p,occupied);if(!check.available)return check;
    const result=stoppedPlacement(p);checkpoints.delete(token);epoch++;
    return copy({...result,clock:clock()});
  }
  function capabilities(vesselId) {checkHost();return D.vessels[vesselId]||no('UNKNOWN_VESSEL');}
  function dispose() {if(!disposed){if(S.reset===resetHook)S.reset=originalReset;checkpoints.clear();disposed=true;sessions.delete(A);}}
  const reader=freeze({describe,readPose,sampleWater,readAnchors:anchors,capabilities});
  const local=freeze({prepareSpawn,validatePlacement,spawnLocal,captureRestorePoint,restoreLocal});
  const api=freeze({revision:REV,reader,local,dispose});sessions.set(A,api);
  try { await describe(); return api; } catch(error) { dispose(); throw error; }
}
G.SeaLab12HostHooks=Object.freeze({revision:REV,attach,canonical,freeze});
if(typeof module!=='undefined')module.exports=G.SeaLab12HostHooks;
})(typeof window!=='undefined'?window:globalThis);
