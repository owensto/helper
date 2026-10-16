/* CORE owner fitting-endstop contract. No RAF, vessel time or human solver. */
(function (G) {
  'use strict';
  const REVISION = 'core-bay-bolster-endstop/1';
  const SNAP = 1e-5, ANGLE = Math.PI * 85 / 180, NUMERIC = 1e-12;
  const PIVOTS = Object.freeze([
    Object.freeze({node:145,name:'PLAY_BOLSTER_1',position:Object.freeze([-1.4550000429153442,0.9100000262260437,-0.26499998569488525])}),
    Object.freeze({node:150,name:'PLAY_BOLSTER_2',position:Object.freeze([-1.4550000429153442,0.9100000262260437,0.26499998569488525])})
  ]);
  const bindings = new WeakMap();
  const snaps=[];
  const validValue = v => Number.isFinite(v) && v >= 0 && v <= 1;
  const validTarget = t => t === 0 || t === 1;
  function advance(value, target, fittingDt) {
    if (!validValue(value) || !validTarget(target) || !Number.isFinite(fittingDt) || fittingDt < 0)
      throw new TypeError('BOLSTER_ENDSTOP_INPUT_INVALID');
    // Preserve the old trajectory and rate. Only a nonzero owner fitting update
    // may seat the fitting at its exact mechanical stop; a read never snaps it.
    if (fittingDt === 0 || value === target) return value;
    const next = value + (target - value) * (1 - Math.exp(-4 * fittingDt));
    if (Math.abs(target-next)<=SNAP) {snaps.push(Object.freeze({previous:value,raw:next,next:target,target,fittingDt,remainingAngleRad:Math.abs(target-next)*ANGLE}));if(snaps.length>32)snaps.shift();return target;}
    return next;
  }
  function classify(value, target, angles) {
    if (!validValue(value) || !validTarget(target) || !Array.isArray(angles) ||
        angles.length !== 2 || ![0,1].every(i => Number.isFinite(angles[i])))
      return Object.freeze({revision:REVISION,phase:'invalid',settled:false,transitioning:null,downStable:false,reason:'BOLSTER_STATE_INVALID'});
    const coherent = angles.every(a => Math.abs(a - value * ANGLE) <= NUMERIC);
    if (!coherent)
      return Object.freeze({revision:REVISION,phase:'invalid',settled:false,transitioning:null,downStable:false,reason:'BOLSTER_EVALUATED_POSE_MISMATCH'});
    const settled = value === target && angles.every(a => a === target * ANGLE);
    return Object.freeze({revision:REVISION,phase:settled?(target===0?'down-settled':'up-settled'):'transition',
      settled,transitioning:!settled,downStable:settled&&target===0,reason:settled&&target===0?null:'BOLSTER_TRANSITION_UNAVAILABLE',
      value,target,residual:target-value,remainingAngleRad:Math.abs(target-value)*ANGLE,
      snapThreshold:SNAP,exactEndpointRequired:true});
  }
  function read(T, A) {
    try {
      let b = bindings.get(A);
      if (!b) {
        const nodes = PIVOTS.map(p => {
          const found=[];A.model.traverse(o=>{if(o.name===p.name)found.push(o);});
          if(found.length!==1)throw Error('BOLSTER_SOURCE_NOT_UNIQUE');
          return {object:found[0],parent:found[0].parent,source:p};
        });
        b={model:A.model,nodes};bindings.set(A,b);
      }
      if(A.model!==b.model)throw Error('BOLSTER_MODEL_CHANGED');
      const aggregate=A.inspect().bolsters,angles=[],poses=[];
      for(const {object:n,parent,source} of b.nodes){
        if(n.parent!==parent||A.model.getObjectByName(source.name)!==n)throw Error('BOLSTER_PARENT_OR_INSTANCE_CHANGED');
        if(!n.position.toArray().every((v,i)=>v===source.position[i])||
           !n.scale.toArray().every(v=>v===1)||n.rotation.x!==0||n.rotation.y!==0)
          throw Error('BOLSTER_SOURCE_TRANSFORM_CHANGED');
        // Evaluate current render caches before any support decision/telemetry.
        // This writes neither controls nor fitting values, and advances no clock.
        n.updateWorldMatrix(true,true);angles.push(n.rotation.z);
        const expected=new T.Matrix4().compose(n.position,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),n.rotation.z),n.scale);
        if(n.matrix.elements.some((v,i)=>!Number.isFinite(v)||Math.abs(v-expected.elements[i])>NUMERIC))throw Error('BOLSTER_LOCAL_MATRIX_MISMATCH');
        poses.push(Object.freeze({originalNodeIndex:source.node,uuid:n.uuid,parentUUID:parent.uuid,
          angleZRad:n.rotation.z,local:Object.freeze(n.matrix.toArray()),world:Object.freeze(n.matrixWorld.toArray())}));
      }
      return Object.freeze({...classify(aggregate.value,aggregate.target,angles),pivots:Object.freeze(poses)});
    } catch(e) {return Object.freeze({revision:REVISION,phase:'invalid',settled:false,transitioning:null,downStable:false,reason:e.message});}
  }
  const api=Object.freeze({revision:REVISION,snapThreshold:SNAP,angleRad:ANGLE,numericTolerance:NUMERIC,pivots:PIVOTS,advance,classify,read,snapEvents:()=>Object.freeze(snaps.slice())});
  G.CoreBayBolsterState=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
