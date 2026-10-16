/* Original ATLAS D vessel operation, version 1.
 * Authored game parameters only: NOT hydrostatic, pressure-hull or sea-trial data.
 * Pure SI-state module. No renderer, network, timer, or global simulator patches.
 */
(function (G) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const approach = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  const SPEC = Object.freeze({id:'atlas-d-original-r7', lengthM:82.9, beamM:14.2,
    maxSurfaceMps:7.2, maxSubmergedMps:3.0, maxScenarioDepthM:30,
    maxDiveRateMps:0.35, maxAscentRateMps:0.45, bottomMarginM:2,
    conversionSeconds:38.4, engineeringValidated:false, certifiedDepthM:null});
  const MODES = ['surface','securing','secured','diving','submerged','surfacing','deploying'];
  // The same fictional bottom function is supplied to host rendering and contact queries.
  function provingBed(x,z) {
    return -54 + 50*Math.exp(-(((x-310)/90)**2)-(((z-20)/150)**2))
      + 2*Math.sin(x*0.007)*Math.sin(z*0.006);
  }
  function provingSample(x,z) {
    if (!finite(x)||!finite(z)||Math.abs(x)>1600||Math.abs(z)>1600)
      return {known:false, bed:null, source:'Outside authored ATLAS D test area'};
    return {known:true, bed:provingBed(x,z), depth:-provingBed(x,z), land:false,
      source:'Authored ATLAS D deep-water test scenario; not Beaufort'};
  }
  class Vessel {
    constructor(options={}) {
      this.draftM = finite(options.draftM) ? clamp(options.draftM,0.5,12) : 4;
      this.reset();
    }
    reset() {
      Object.assign(this,{x:0,z:0,heading:0,speedMps:0,yawRate:0,depthM:0,
        verticalMps:0,targetDepthM:18,elapsed:0,sequence:0,engine:false,
        gear:0,throttle:0,rudder:0,bowThruster:0,conversion:0,mode:'surface',
        ballast:0,contact:false,paused:false,message:'Original ATLAS D. Start propulsion to get underway.',
        clearanceM:null,waterDepthM:null,depthKnown:false,heaveM:0,pitch:0,roll:0});
    }
    clearance(sample,x=this.x,z=this.z,depth=this.depthM,waterLevel=this.heaveM,heading=this.heading) {
      let min=Infinity,known=true,center=sample(x,z),c=Math.cos(heading),s=Math.sin(heading);
      // Conservative rectangular footprint: 13 stations, port/centre/starboard.
      // Uses geometry-derived deepest point everywhere, not a claimed hull hydrostatic model.
      for(let i=0;i<13;i++) for(const across of [-SPEC.beamM/2,0,SPEC.beamM/2]) {
        const along=(i/12-0.5)*SPEC.lengthM;
        const q=sample(x+c*along-s*across,z+s*along+c*across);
        if(!q||!q.known||!finite(q.bed)){known=false;continue;}
        min=Math.min(min,waterLevel-depth-this.draftM-q.bed);
      }
      return {known,clearanceM:known&&finite(min)?min:null,
        waterDepthM:center?.known&&finite(center.bed)?waterLevel-center.bed:null};
    }
    observe(sample,wave=()=>0) {
      const c=Math.cos(this.heading),s=Math.sin(this.heading),t=this.elapsed;
      const height=(a,b)=>{const h=wave(this.x+c*a-s*b,this.z+s*a+c*b,t);return finite(h)?h:0;};
      const bow=height(32,0),stern=height(-32,0),port=height(0,-6),starboard=height(0,6);
      const attenuation=Math.exp(-this.depthM/4);
      this.heaveM=(bow+stern+port+starboard)/4*attenuation;
      this.pitch=clamp((bow-stern)/64,-0.09,0.09)*attenuation;
      this.roll=clamp((port-starboard)/12,-0.12,0.12)*attenuation;
      const q=this.clearance(sample);
      this.depthKnown=q.known;this.clearanceM=q.clearanceM;this.waterDepthM=q.waterDepthM;
      return q;
    }
    command(name,value,sample=provingSample) {
      if(name==='pause'){this.paused=!this.paused;return true;}
      if(name==='neutral'){this.gear=0;this.throttle=0;return true;}
      if(name==='engine') {
        if(!this.engine&&(this.gear!==0||this.throttle>0.01))return this.reject('Select neutral and idle before starting propulsion.');
        this.engine=!this.engine;
        if(!this.engine){this.throttle=0;this.gear=0;}
        this.message=this.engine?'Propulsion ready. Select Forward or Reverse.':'Propulsion off. The yacht continues coasting.';return true;
      }
      if(name==='gear'&&[-1,0,1].includes(value)){this.gear=value;return true;}
      if(name==='throttle'&&finite(value)){this.throttle=clamp(value,0,1);return true;}
      if(name==='rudder'&&finite(value)){this.rudder=clamp(value,-1,1);return true;}
      if(name==='bowThruster'&&finite(value)){this.bowThruster=clamp(value,-1,1);return true;}
      if(name==='targetDepth'&&finite(value)) {
        if(!['surface','secured'].includes(this.mode))return this.reject('Set the dive target before beginning the dive.');
        this.targetDepthM=clamp(value,12,SPEC.maxScenarioDepthM);return true;
      }
      if(name==='secure') {
        if(this.mode!=='surface')return this.reject('Return to the surface yacht configuration first.');
        if(Math.abs(this.speedMps)>0.5||this.throttle>0.01||this.gear!==0)
          return this.reject('Idle, neutral and below 1 knot are required to recover tenders and secure the exterior.');
        this.mode='securing';this.message='Recovering both tenders, closing bays and nesting the original exterior shells.';return true;
      }
      if(name==='dive') {
        if(this.mode!=='secured'||this.conversion<0.999)
          return this.reject('Secure both tenders, bay doors and exterior shells before diving.');
        if(Math.abs(this.speedMps)>1.5||this.throttle>0.2)
          return this.reject('Reduce speed and power before the simulated dive.');
        const q=this.clearance(sample,this.x,this.z,this.targetDepthM);
        if(!q.known)return this.reject('Dive blocked: bottom coverage is unknown under part of the yacht.');
        if(q.clearanceM<SPEC.bottomMarginM)
          return this.reject('Dive blocked: the requested depth would leave insufficient modeled bottom clearance.');
        this.mode='diving';this.ballast=0.58;this.message='Controlled simulated descent. Depth is a game datum, not a certified rating.';return true;
      }
      if(name==='surface') {
        if(this.depthM<=0.02&&['surface','secured'].includes(this.mode))return this.reject('The yacht is already on the surface.');
        if(!['diving','submerged','surfacing'].includes(this.mode))return this.reject('Finish securing the yacht before this operation.');
        this.mode='surfacing';this.message='Surfacing. Exterior stays secured until the vessel reaches the surface.';return true;
      }
      if(name==='deploy') {
        if(this.depthM>0.02||this.mode!=='secured')return this.reject('Deployment is blocked while submerged or in transition.');
        if(Math.abs(this.speedMps)>0.5||this.gear!==0||this.throttle>0.01)
          return this.reject('Idle, neutral and below 1 knot are required to deploy the yacht exterior.');
        this.mode='deploying';this.message='Raising exterior sleeves and deploying the yacht arrangement.';return true;
      }
      return this.reject('Command unavailable in the current vessel state.');
    }
    reject(message){this.message=message;return false;}
    step(dt,sample=provingSample,wave=()=>0) {
      if(!finite(dt)||dt<0||dt>0.25)throw new RangeError('Use a finite fixed simulation step between 0 and 0.25 seconds.');
      if(this.paused||dt===0)return;
      this.elapsed+=dt;this.sequence++;this.contact=false;
      if(this.mode==='securing') {
        this.conversion=clamp(this.conversion+dt/SPEC.conversionSeconds,0,1);
        this.throttle=0;this.gear=0;
        if(this.conversion>=1){this.mode='secured';this.message='Tenders aboard; exterior secured. Select a target depth and Dive.';}
      } else if(this.mode==='deploying') {
        this.conversion=clamp(this.conversion-dt/SPEC.conversionSeconds,0,1);
        this.throttle=0;this.gear=0;
        if(this.conversion<=0){this.mode='surface';this.message='Surface yacht arrangement restored.';}
      }
      this.observe(sample,wave);
      const maxSpeed=this.depthM>1?SPEC.maxSubmergedMps:SPEC.maxSurfaceMps;
      const drive=this.engine?this.gear*this.throttle*maxSpeed*(this.gear<0?0.42:1):0;
      this.speedMps=approach(this.speedMps,drive,this.engine?0.055:0.025,dt);
      const turn=this.rudder*0.022*Math.min(1.3,Math.abs(this.speedMps)/4)*Math.sign(this.speedMps)
        +(this.engine?this.bowThruster*0.006*Math.max(0,1-Math.abs(this.speedMps)/2):0);
      this.yawRate=approach(this.yawRate,turn,0.3,dt);
      const h=(this.heading+this.yawRate*dt+Math.PI*2)%(Math.PI*2);
      const nx=this.x+Math.cos(h)*this.speedMps*dt,nz=this.z+Math.sin(h)*this.speedMps*dt;
      const q=this.clearance(sample,nx,nz,this.depthM,this.heaveM,h);
      if(!q.known&&this.depthM>0.1){this.speedMps=0;this.yawRate=0;this.message='Movement blocked: unknown bottom coverage while submerged. Surface to continue.';}
      else if(q.known&&q.clearanceM<0.05){this.speedMps=0;this.yawRate=0;this.contact=true;this.message='BOTTOM CONTACT — propulsion reduced to idle. Reverse or surface to move clear.';this.throttle=0;}
      else {this.x=nx;this.z=nz;this.heading=h;}
      let target=0;
      if(this.mode==='diving'||this.mode==='submerged')target=this.targetDepthM;
      else if(this.mode==='surfacing')target=0;
      else target=this.depthM;
      const requested=clamp((target-this.depthM)*0.22,-SPEC.maxAscentRateMps,SPEC.maxDiveRateMps);
      this.verticalMps=approach(this.verticalMps,requested,0.8,dt);
      let nextDepth=Math.max(0,this.depthM+this.verticalMps*dt);
      const vertical=this.clearance(sample,this.x,this.z,nextDepth);
      if(nextDepth>this.depthM&&(!vertical.known||vertical.clearanceM<SPEC.bottomMarginM)) {
        nextDepth=this.depthM;this.verticalMps=0;this.mode='surfacing';
        this.message='Descent stopped: bottom margin or chart coverage lost. Automatic simulated ascent engaged.';
      }
      this.depthM=nextDepth;
      if(this.mode==='diving'&&Math.abs(this.depthM-this.targetDepthM)<0.06&&Math.abs(this.verticalMps)<0.04){this.mode='submerged';this.message='Depth hold engaged. The original hull remains continuous.';}
      if(this.mode==='surfacing'&&this.depthM<0.03&&Math.abs(this.verticalMps)<0.03){this.depthM=0;this.verticalMps=0;this.mode='secured';this.message='Surface reached. Select neutral and Deploy yacht to reopen the exterior.';}
      this.ballast=this.depthM>0.03?clamp(0.5+(target-this.depthM)*0.015,0.42,0.58):this.mode==='diving'?0.58:0;
      this.observe(sample,wave);
    }
    snapshot() {
      return {version:1,vesselId:SPEC.id,sequence:this.sequence,elapsed:this.elapsed,
        x:this.x,z:this.z,heading:this.heading,speedMps:this.speedMps,yawRate:this.yawRate,
        depthM:this.depthM,verticalMps:this.verticalMps,targetDepthM:this.targetDepthM,
        engine:this.engine,gear:this.gear,throttle:this.throttle,rudder:this.rudder,
        bowThruster:this.bowThruster,conversion:this.conversion,mode:this.mode,
        ballast:this.ballast,paused:this.paused,contact:this.contact,draftM:this.draftM,
        depthKnown:this.depthKnown,waterDepthM:this.waterDepthM,clearanceM:this.clearanceM,
        heaveM:this.heaveM,pitch:this.pitch,roll:this.roll};
    }
  }
  const API={SPEC,MODES,Vessel,provingBed,provingSample};
  G.AtlasDCore=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
