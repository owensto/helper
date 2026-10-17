/** Authored OPEN WATER game, deliberately NOT a SeaLab/C1 world. */
export const VESSEL_ID='atlas-open-water-bay';
export const WORLD={
  schema:'atlas-world-1',kind:'standalone',applicationId:'atlas-d-open-water',
  worldId:'atlas-open-water',worldRevision:'open-water-1',sceneRevision:'open-water-1',
  spawnValidationRef:'open-water-clear-water-slots-1',capacity:8,
  units:'metres-seconds-radians',axes:'RH:X-forward:Y-up:Z-starboard:quat-XYZW',
  clock:{physics:'host-per-client-resettable',transport:'server-arrival-monotonic',waterPhaseSynchronized:false},
  water:{revision:'open-water-visual-waves-1',unknownDepth:'unknown'},
  weather:{presetId:'clear-afternoon',mutable:false,windMps:3,windDirectionRad:0.4},
  bounds:{radiusM:900,boatRadiusM:6},
  islands:[{x:120,z:130,radius:45},{x:-180,z:-110,radius:65},{x:340,z:-250,radius:95}],
  route:[{x:80,z:-20},{x:230,z:20},{x:260,z:160},{x:60,z:230},{x:-90,z:80}],
  vessels:{[VESSEL_ID]:{controllerRevision:'open-water-authored-1',footprintRevision:'open-water-radius-6m',
    spawns:Array.from({length:8},(_,i)=>({id:'harbor-slot-'+i,p:[-240+i*30,0,280],q:[0,0,0,1]}))}}
};
