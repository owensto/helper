'use strict';
// Independent post-browser evidence audit. Does not load or step any vessel.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const E=path.join(__dirname,'evidence'),r=JSON.parse(fs.readFileSync(path.join(E,'rotation.json'),'utf8'));
assert(r.passed&&r.sameSession&&r.pointerReleased&&!r.stillCaptured);assert.equal(r.cases.length,10);assert.equal(r.screenshots.length,14);
const sizes={portrait:[390,844],landscape:[844,390]};let previous=r.startOrientation;
for(const c of r.cases){
 assert(c.passed&&!c.oldFrameRejection.available);assert.equal(c.oldFrameRejection.reason,'STALE_OWNER_FRAME');
 assert.deepEqual([c.beforeSize.w,c.beforeSize.h],sizes[previous]);assert.notEqual(c.orientation,previous);previous=c.orientation;
 const [w,h]=sizes[c.orientation];assert.deepEqual([c.bounds.outer.width,c.bounds.outer.height],[w,h]);assert.equal(c.bounds.outer.angle,c.orientation==='portrait'?0:90);
 for(const key of ['instanceId','activationEpoch','simulationEpoch','hostSessionId','worldRevision'])assert.equal(c.before.frame[key],c.after.frame[key]);
 assert(c.after.frame.frameId>c.before.frame.frameId);assert.equal(c.before.state.paused,c.after.state.paused);
 if(c.before.state.paused)assert.equal(c.before.state.elapsed,c.after.state.elapsed);
 if(c.released){assert.equal(c.released.state.rudder,0);assert(c.released.state.engine);if(c.focusLossIdle){assert.equal(c.released.state.throttle,0);assert(c.focusEvents.some(e=>e.type==='blur'&&e.windowTarget&&e.trusted));}else assert.equal(c.released.state.throttle,c.before.state.throttle);}
 for(const row of [c.before,c.after,...(c.released?[c.released]:[])]){
  const f=row.frame;assert(row.sourceUnchanged&&row.physicalAvailable&&row.visible);assert.equal(row.rigAttachment,null);assert.equal(row.rigValid,false);
  assert.deepEqual(JSON.parse(row.frameToken),[f.vesselId,f.instanceId,f.activationEpoch,f.frameId,f.simTimeSeconds]);
  assert.deepEqual(JSON.parse(row.controlPoseToken),[f.vesselId,f.instanceId,f.activationEpoch,f.frameId,f.simTimeSeconds,'atlas-d-r7-aft-helm-y3/1.1.0','atlas-d-rudder-wheel/1',f.controls.rudder]);
  const id=row.mappedIdentity,epoch='c1h/1:'+crypto.createHash('sha256').update(JSON.stringify(['c1-humans-map/1',f.coreSourceSHA,f.hostSessionId,f.instanceId,'client-simulation',f.simulationEpoch])).digest('hex');
  assert.equal(id.vesselInstanceId,f.instanceId);assert.equal(id.attachmentActivationEpoch,f.activationEpoch);assert.equal(id.renderFrameId,f.frameId);assert.equal(id.ownerFrameToken,row.frameToken);assert.equal(id.simulationEpoch,epoch);assert.equal(row.mappedFrame.epoch,epoch);assert.equal(row.mappedFrame.time,f.simTimeSeconds);assert.equal(row.mappedFrame.dt,0);
  for(const key of ['entityId','playerId','characterId'])assert.equal(id[key],null);assert(id.identityAuthority.includes('fixture'));
  for(const ray of row.rays)assert(ray.hit&&ray.errorM<1e-5&&ray.normalError<1e-6);
 }
}
for(const s of r.screenshots){const png=fs.readFileSync(path.join(E,s.file));assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],sizes[s.orientation]);assert.deepEqual([s.width,s.height],sizes[s.orientation]);assert(s.currentBrowserSurface);}
assert.equal(previous,r.startOrientation);assert(r.motion.frames>0&&r.motion.distanceM>1&&!r.motion.testStep);assert.deepEqual(r.motion.controls,[-1,0,1]);assert(r.heldPointerIds.length>=3);assert(!r.errors.length&&!r.shaderErrors.length);
const out={passed:true,entry:r.entry,startOrientation:r.startOrientation,rotations:10,currentSizeScreenshots:14,unchangedRuntime:true,separateClockLifecycleAndFrameTokens:true,allHeldPointersReleased:true,physicalDevice:false,productionEnabled:false,ownerBlurIdles:r.cases.filter(c=>c.focusLossIdle).length,uninterruptedPowerAcrossOffscreenReleaseAccepted:false};fs.writeFileSync(path.join(E,'independent-audit.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
