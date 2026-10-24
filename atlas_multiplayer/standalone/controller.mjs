import {WORLD,VESSEL_ID} from './world.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function isClear(p){
  return Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Math.hypot(p[0],p[2])<=WORLD.bounds.radiusM-WORLD.bounds.boatRadiusM&&
    WORLD.islands.every(i=>Math.hypot(p[0]-i.x,p[2]-i.z)>i.radius+WORLD.bounds.boatRadiusM);
}
/** Authored casual-game dynamics, not SeaLab or measured naval engineering. */
export class BoatController {
  constructor(){this.epoch=0;this.seconds=0;this.x=-180;this.z=280;this.heading=0;this.speed=0;this.yaw=0;this.throttle=0;this.steer=0;this.engine=false;this.contacts=0;}
  save(){return {x:this.x,z:this.z,heading:this.heading,speed:this.speed,yaw:this.yaw,throttle:this.throttle,engine:this.engine};}
  restore(s){if(!s||!isClear([s.x,0,s.z])||!Number.isFinite(s.heading))throw Error('INVALID_SAVED_BOAT');Object.assign(this,s);this.steer=0;this.epoch++;}
  place(pose){
    if(!pose||!isClear(pose.p)||!Array.isArray(pose.q)||pose.q.length!==4||!pose.q.every(Number.isFinite))throw Error('UNSAFE_STANDALONE_PLACEMENT');
    // Recover heading from the projected local +X axis, not quaternion yaw with opposite sign.
    const [x,y,z,w]=pose.q;
    this.x=pose.p[0];this.z=pose.p[2];this.heading=Math.atan2(2*(x*z-w*y),1-2*(y*y+z*z));
    this.speed=0;this.yaw=0;this.throttle=0;this.steer=0;this.engine=false;this.epoch++;
  }
  input({throttle=0,steer=0}={}){if(![throttle,steer].every(Number.isFinite))throw Error('BAD_INPUT');this.throttle=clamp(throttle,-1,1);this.steer=clamp(steer,-1,1);}
  step(dt){
    if(!Number.isFinite(dt)||dt<0||dt>1/60+1e-9)throw Error('FIXED_STEP_REQUIRED');
    this.seconds+=dt;
    const drive=this.engine?this.throttle:0,thrust=drive>=0?3.4*drive:1.9*drive;
    const drag=.09*this.speed+.021*this.speed*Math.abs(this.speed);
    this.speed=clamp(this.speed+(thrust-drag)*dt,-5,13);
    const turn=this.steer*clamp(this.speed/12,-.38,1)*.43;
    this.yaw+=(turn-this.yaw)*(1-Math.exp(-dt*3.5));
    const h=this.heading+this.yaw*dt,x=this.x+Math.cos(h)*this.speed*dt,z=this.z+Math.sin(h)*this.speed*dt;
    if(isClear([x,0,z])){this.x=x;this.z=z;this.heading=Math.atan2(Math.sin(h),Math.cos(h));}
    else{this.speed=0;this.yaw=0;this.throttle=0;this.contacts++;}
  }
  pose(){
    const y=.065*Math.sin(this.seconds*1.5+this.x*.014)+.025*Math.sin(this.seconds*2.1+this.z*.02);
    return {p:[this.x,y,this.z],q:[0,-Math.sin(this.heading/2),0,Math.cos(this.heading/2)],
      engine:this.engine,rpm:this.engine?700+Math.abs(this.throttle)*4800:0,gear:this.throttle>.01?1:this.throttle<-.01?-1:0};
  }
  sample(){return {vesselId:VESSEL_ID,pose:this.pose(),clock:{domain:'client-simulation',epoch:this.epoch,seconds:this.seconds}};}
}
/** One explicit render-owned accumulator. No second simulation interval. Long gaps coast/pause. */
export class FixedStepper {
  constructor(controller){this.controller=controller;this.accumulator=0;this.droppedGaps=0;}
  advance(dt){
    if(!Number.isFinite(dt)||dt<0)throw Error('BAD_FRAME_DELTA');
    if(dt>.25){this.accumulator=0;this.controller.input();this.droppedGaps++;return 0;}
    this.accumulator+=dt;let n=0;
    while(this.accumulator+1e-12>=1/60){this.controller.step(1/60);this.accumulator-=1/60;n++;}
    return n;
  }
  clear(){this.accumulator=0;}
}
