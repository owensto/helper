// TEST FIXTURE ONLY. This is not Beaufort, Sea Lab 11/12 or yacht physics.
export const FIXTURE_WORLD = {
  schema:'atlas-world-1',kind:'fixture',worldId:'transport-fixture-flat-plane',
  worldRevision:'fixture-flat-plane-v1',sceneRevision:'fixture-flat-plane-v1',
  spawnValidationRef:'fixture-only-separated-slots',capacity:8,
  units:'metres-seconds-radians',axes:'RH:X-forward:Y-up:Z-starboard:quat-XYZW',
  clock:{physics:'host-per-client-resettable',transport:'server-arrival-monotonic',waterPhaseSynchronized:false},
  water:{revision:'fixture-no-bottom',unknownDepth:'unknown'},
  weather:{presetId:'fixture-calm',mutable:false,windMps:0,windDirectionRad:0},
  vessels:{'fixture-craft':{
    controllerRevision:'fixture-linear-motion-v1',footprintRevision:'fixture-only-v1',
    spawns:Array.from({length:8},(_,i)=>({id:'fixture-slot-'+i,p:[i*40,0,i*20],q:[0,0,0,1]}))
  }}
};
export const FIXTURE_VESSEL='fixture-craft';
