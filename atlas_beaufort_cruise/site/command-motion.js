/* Original simulation model. Reference mode preserves the published F300 curve.
 * Custom rigs, forces, fuel and mass are editable assumptions, NOT sea trials. */
(function(G){'use strict';
if(!G.Sea11Waves&&typeof require==='function')G.Sea11Waves=require('./waves11.js');
const Base=G.BayMotion||(typeof require==='function'?require('./physics.js'):null);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0)), smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a),0,1);return v*v*(3-2*v)};
const presets={...Base.PRESETS,swell:{label:'Open-water swell',amp:.45,current:[.2,.12],wind:[2,4]}};
const defaults={count:1,hp:300,engineKg:277,dryKg:1550,loadKg:200,fuelGal:35,physics:'seamanship',split:0,location:'basin',tide:0,finish:'blue',conditions:'breeze',spawn:'waterfront',light:'day'};
// Reference-informed resistance scaffold: source equilibrium speeds and an assumed
// propulsion efficiency define resistance, not measured hull force data.
const REF_MASS=Base.REFERENCE.data.testWeightLb*.45359237;
const RESISTANCE=[[0,0],...Base.REFERENCE.data.rows.map(r=>{
 const v=r.mph*.44704,d=(r.rpm-700)/5100;
 return [v,Math.min(8100*Math.pow(d,.92)+100,300*745.7*Math.pow(d,1.48)*.56/Math.max(3.8,v+3.6))];
})];
function resistance(u){const v=Math.abs(u);let r;
 if(v>=RESISTANCE.at(-1)[0])r=RESISTANCE.at(-1)[1]*Math.pow(v/RESISTANCE.at(-1)[0],2);
 else{let i=1;while(RESISTANCE[i][0]<v)i++;const a=RESISTANCE[i-1],b=RESISTANCE[i];r=a[1]+(b[1]-a[1])*(v-a[0])/(b[0]-a[0]);}
 // Calm-air resistance is already represented by the source curve.
 // Subtract its modeled baseline here: the dynamic air term below adds it once.
 return Math.sign(u)*Math.max(0,r-1.8*v*v);
}
class CommandMotion extends Base{
 constructor(){super();this.config={...defaults};this.reset();}
 reset(){super.reset();this.location=this.config?.location||'basin';this.verticalVel=0;this.pitchVel=0;this.rollVel=0;this.airborne=false;this.airtime=0;this.peakAir=0;this.lastImpact=0;this.fuelUsedGal=0;this.propWet=1;this.portRpm=0;this.starboardRpm=0;this.lastFuelRate=0;this.depthSource=null;this.bottomClearance=null;this.bottomPart=null;this.bottomHitCount=0;this.bottomHitAt=-99;this.bottomHitSpeed=0;this.bottomImpact=0;this.wasBottomContact=false;this.groundForce=0;this.hullHealth10=100;this.engineDisabled10=false;this.destroyed10=false;this.clutch14=0;this.impactSeq10=0;this.lastHardImpact10=-99;}
 configure(values){const next={...defaults,...this.config,...values};next.count=clamp(Math.round(next.count),1,2);next.hp=clamp(next.hp,90,600);next.engineKg=clamp(next.engineKg,100,800);next.dryKg=clamp(next.dryKg,800,5000);next.loadKg=clamp(next.loadKg,0,1500);next.fuelGal=clamp(next.fuelGal,0,100);next.split=clamp(next.split,-1,1);next.tide=clamp(next.tide,-2,3);if(!['basin','beaufort'].includes(next.location))throw Error('Unknown location');if(!['seamanship','sport','reference'].includes(next.physics))throw Error('Unknown physics profile');if(next.physics==='reference'){next.count=1;next.hp=300;next.location='basin';}this.config=next;this.performanceMode=next.physics==='reference'?'reference':'experimental';this.reset();return {...next};}
 totalMassKg(){if(this.performanceMode==='reference')return Base.REFERENCE.data.testWeightLb*.45359237;return this.config.dryKg+this.config.loadKg+this.config.count*this.config.engineKg+Math.max(0,this.config.fuelGal-this.fuelUsedGal)*3.785411784*.745;}
 start(){if(this.destroyed10||this.engineDisabled10||this.fuelUsedGal>=this.config.fuelGal)return false;return super.start();}
 setEnvironment(key){if(presets[key]&&this.performanceMode!=='reference')this.environment=key;}
 setPerformanceMode(v){this.configure({physics:v==='reference'?'reference':'seamanship'});return v;}
 jump(){if(this.config.physics!=='sport'||this.airborne||Math.abs(this.u)<2)return false;this.verticalVel=4.2;this.heave+=.2;return true;}
 step(dt,obstacles=[]){
 if(this.performanceMode==='reference'){super.step(dt,obstacles);this.portRpm=this.rpm;this.starboardRpm=0;this.airborne=false;return;}
 dt=clamp(dt,0,.04);if(!dt)return;if(G.Sea10Runtime)G.Sea10Runtime.beforeStep(this,dt);if(G.Sea14Physics)G.Sea14Physics.beforeStep(this,dt);if(G.Sea12Waves)G.Sea12Waves.advance(this,dt);this.elapsed+=dt;this.contact=false;this.grounded=false;this.lastImpact*=Math.exp(-dt*3);
 const p=presets[this.environment]||presets.calm, cfg=this.config, sport=cfg.physics==='sport', M=this.totalMassKg(), IY=M*5.8;
 const c=Math.cos(this.heading),s=Math.sin(this.heading);this.u=(this.vx-p.current[0])*c+(this.vz-p.current[1])*s;this.v=-(this.vx-p.current[0])*s+(this.vz-p.current[1])*c;
 this.rudder+=(clamp(this.steer,-1,1)-this.rudder)*(1-Math.exp(-(sport?7:3.6)*dt));this.trimActual+=(clamp(this.trim,0,1)-this.trimActual)*(1-Math.exp(-2.2*dt));this.startTimer=Math.max(0,this.startTimer-dt);
 const trpm=this.engine?(this.startTimer?280:this.gear===0?700+this.throttle*1100:700+this.throttle*5100):0;this.rpm+=(trpm-this.rpm)*(1-Math.exp(-dt/(sport?.38:.7)));
 this.planing=smooth(4,11,Math.max(0,this.u));let fx=0,fz=0,moment=0;
 const boatSea=CommandMotion.surface(this.x-3.9*c,this.z-3.9*s,this.elapsed,this.environment);
 const wetTarget=clamp((boatSea-(this.heave-3.9*this.pitch-.69+this.trimActual*.20))/.38,0,1);this.propWet+=(wetTarget-this.propWet)*(1-Math.exp(-dt/.10));
 const clutch=G.Sea14Physics?G.Sea14Physics.clutch(this,dt):this.gear;const delta=this.rudder*(.5/(1+Math.max(0,this.u)*.018)),power=this.engine&&this.startTimer===0&&Math.abs(clutch)>1e-8;
 for(let i=0;i<cfg.count;i++){
  const side=cfg.count===1?0:(i===0?-.53:.53), split=cfg.count===1?0:cfg.split*(i===0?1:-1),d=clamp((this.rpm-700)/5100+split,0,1);
  const rpm=this.engine?(this.gear===0||this.startTimer>0?this.rpm:700+5100*d):0;if(i===0)this.portRpm=rpm;else this.starboardRpm=rpm;
  // Power-limited thrust envelope; tuned propulsive efficiency, not an engine torque map.
  const powerWatts=cfg.hp*745.7*Math.pow(d,1.48);
  const idle=(clutch<0?225:145)*(1-d);let thrust=power?Math.min(cfg.hp*27*Math.pow(d,.92)+100,powerWatts*.56/Math.max(3.8,Math.abs(this.u)+3.6))+idle:0;
  thrust*=this.propWet*(1-.15*Math.abs(this.trimActual-.3))*(1-.4*smooth(.7,1,this.trimActual))*(sport?1.23:1)*(clutch<0?.4:1)*clutch;
  const ex=thrust*Math.cos(delta),ez=-thrust*Math.sin(delta);fx+=ex;fz+=ez;moment+=-3.65*ez-side*ex;
 }
 const hump=1+.7*Math.exp(-Math.pow((Math.abs(this.u)-5.4)/2.2,2));const wetted=this.airborne?.015:1;
 const massResistance=Math.pow(M/REF_MASS,.60);
 fx-=resistance(this.u)*massResistance*(1+(cfg.count-1)*.035)*wetted;
 for(const x of [-2.65,0,2.65]){const vv=this.v+this.yaw*x;const force=(-(sport?520:310)-90*Math.abs(this.u))*vv-230*vv*Math.abs(vv);fz+=force*wetted;moment+=x*force*wetted;}
 moment-=(1800*this.yaw+7200*this.yaw*Math.abs(this.yaw))*wetted;
 const ax=p.wind[0]-this.vx,az=p.wind[1]-this.vz,aw=ax*c+az*s,bw=-ax*s+az*c;fx+=1.8*aw*Math.abs(aw);fz+=11*bw*Math.abs(bw);
 // Forward transient response is tuned separately; not additional measured inertia.
 
 const surgeM=M*(1+.10*(1-this.planing)+.03*this.planing),swayM=M*1.55;this.acceleration12=fx/surgeM;this.vx+=(fx*c/surgeM-fz*s/swayM)*dt;this.vz+=(fx*s/surgeM+fz*c/swayM)*dt;this.yaw=clamp(this.yaw+moment/(IY*1.20)*dt,-1.1,1.1);this.heading+=this.yaw*dt;
 const px=this.x,pz=this.z;this.bottomImpact*=Math.exp(-dt*4);this.x+=this.vx*dt;this.z+=this.vz*dt;
 if(this.location==='beaufort'){
  const hit=G.Sea10Dynamics?.resolveObstacles(this,px,pz,G.Sea14Physics?.nearbyObstacles(this)||G.SEA12_GEO?.colliders||[]);if(hit)G.Sea10Runtime?.onImpact(this,hit);
 }else{const hit=G.Sea10Dynamics?.resolveObstacles(this,px,pz,obstacles);if(hit)G.Sea10Runtime?.onImpact(this,hit);}
 const shore=G.Sea12Shore?.resolve(this,px,pz);if(shore)G.Sea10Runtime?.onImpact(this,shore);
 // Contact uses the very same seabed field as the visible bottom. No hidden
 // 0.7m hard stop, no throttle cancellation. A finite impulse opposes motion
 // up the bank; reverse thrust and downslope motion remain possible.
 const world=G.Sea09World;
 if(world){const q=world.sample(this.x,this.z,this.location);this.depth=q.depth;this.depthSource=q.source;
  const hit=world.contact(this);this.bottomClearance=hit?.clearance??null;this.bottomPart=hit?.part??null;
  const touching=!!hit&&hit.clearance<=0;
  if(touching){const speed=Math.hypot(this.vx,this.vz),eps=.65;
   const bx0=world.sample(hit.x-eps,hit.z,this.location).bed,bx1=world.sample(hit.x+eps,hit.z,this.location).bed;
   const bz0=world.sample(hit.x,hit.z-eps,this.location).bed,bz1=world.sample(hit.x,hit.z+eps,this.location).bed;
   const gx=Number.isFinite(bx0)&&Number.isFinite(bx1)?(bx1-bx0)/(2*eps):0,gz=Number.isFinite(bz0)&&Number.isFinite(bz1)?(bz1-bz0)/(2*eps):0;
   const gl=Math.hypot(gx,gz),nx=gl>.005?gx/gl:0,nz=gl>.005?gz/gl:0,into=this.vx*nx+this.vz*nz;
   if(into>0){const dv=Math.min(into,dt*(4+Math.min(.7,-hit.clearance)*45));this.vx-=nx*dv;this.vz-=nz*dv;}
   // Static contact friction is deliberately bounded, so the hull can back out.
   const drag=Math.exp(-dt*(.25+Math.min(.5,-hit.clearance)*5));this.vx*=drag;this.vz*=drag;
   this.grounded=true;this.contact=true;this.groundForce=Math.min(M*9.81*2,Math.max(0,-(hit.hullClearance??0))*M*34);
   if(!this.wasBottomContact){this.bottomHitCount++;this.bottomHitAt=this.elapsed;this.bottomHitSpeed=speed;this.bottomImpact=Math.min(1,.15+speed*.065);G.Sea10Runtime?.onImpact(this,{kind:"bottom",time:this.elapsed,x:hit.x,z:hit.z,closing:Math.max(0,into),deltaV:0,forwardSpeed:this.u,vx:this.vx,vz:this.vz,mass:M});}
  }else this.groundForce=0;
  this.wasBottomContact=touching;
 }
 // Four unilateral buoyancy/support samples. When support vanishes, gravity remains.
 const omega=sport?3.5:2.75, spring=M*omega*omega/6, damping=M*(sport?1.0:2.05)/6;
 let up=0,pm=0,rm=0,support=0;const targetPitch=.05*this.planing+.032*this.trimActual+this.planing*this.trimActual*.035,targetRoll=this.yaw*this.u*(sport?.022:.012);
 for(const [xx,zz] of [[2.6,-.75],[2.6,.75],[0,-.95],[0,.95],[-2.6,-.85],[-2.6,.85]]){
  const wx=this.x+c*xx-s*zz,wz=this.z+s*xx+c*zz,sea=CommandMotion.surface(wx,wz,this.elapsed,this.environment);
  const seaPrev=CommandMotion.surface(wx-this.vx*dt,wz-this.vz*dt,this.elapsed-dt,this.environment),vs=(sea-seaPrev)/dt;
  const gap=sea+.04*this.planing+targetPitch*xx-targetRoll*zz-(this.heave+this.pitch*xx-this.roll*zz);
  const vel=this.verticalVel+this.pitchVel*xx-this.rollVel*zz-vs;
  let force=clamp(M*9.81/6+spring*gap-damping*vel,0,M*9.81*2.2);
  if(gap < -M*9.81/6/spring)force=0;
  up+=force;pm+=xx*force;rm-=zz*force;if(force>5)support++;
 }
 const wasAir=this.airborne;this.airborne=support===0;const azz=up/M-9.81+(this.groundForce||0)/M;
 if(wasAir&&!this.airborne)this.lastImpact=Math.abs(this.verticalVel);
 this.verticalVel=clamp(this.verticalVel+azz*dt,-18,18);this.heave+=this.verticalVel*dt;
 this.pitchVel+=(pm/(M*4.1)-2.25*this.pitchVel)*dt;this.rollVel+=(rm/(M*.7)-3.0*this.rollVel)*dt;
 this.pitch=clamp(this.pitch+this.pitchVel*dt,-.55,.55);this.roll=clamp(this.roll+this.rollVel*dt,-.6,.6);
 if(Math.abs(this.pitch)>=.55&&Math.sign(this.pitchVel)===Math.sign(this.pitch))this.pitchVel=0;if(Math.abs(this.roll)>=.6&&Math.sign(this.rollVel)===Math.sign(this.roll))this.rollVel=0;if(this.airborne)this.airtime+=dt;this.peakAir=Math.max(this.peakAir,this.heave-boatSea);
 this.speedOverGround=Math.hypot(this.vx,this.vz);this.distance+=Math.hypot(this.x-px,this.z-pz);const hc=Math.cos(this.heading),hs=Math.sin(this.heading);this.u=(this.vx-p.current[0])*hc+(this.vz-p.current[1])*hs;this.v=-(this.vx-p.current[0])*hs+(this.vz-p.current[1])*hc;
 this.lastFuelRate=this.engine?[this.portRpm,...(cfg.count===2?[this.starboardRpm]:[])].reduce((sum,rpm)=>sum+.85+cfg.hp*.087*Math.pow(clamp((rpm-700)/5100,0,1),1.8),0):0;this.fuelUsedGal+=this.lastFuelRate*dt/3600;
 if(this.fuelUsedGal>=cfg.fuelGal){this.engine=false;this.neutral();}
 }
 snapshot(){return {...super.snapshot(),configuration:{...this.config},totalMassKg:this.config?this.totalMassKg():null,airborne:this.airborne,airtime:this.airtime,verticalVelocity:this.verticalVel,peakAir:this.peakAir,propWet:this.propWet,fuelUsedGal:this.fuelUsedGal,fuelRateModeled:this.lastFuelRate,portRpm:this.portRpm,starboardRpm:this.starboardRpm,depthSource:this.depthSource,location:this.location,bottomClearance:this.bottomClearance,bottomPart:this.bottomPart,bottomHitCount:this.bottomHitCount,bottomHitSpeed:this.bottomHitSpeed};}
}
CommandMotion.RESISTANCE=RESISTANCE;CommandMotion.PRESETS=presets;CommandMotion.DEFAULTS=defaults;CommandMotion.surface=(x,z,t,p='calm')=>G.Sea11Waves.sample(x,z,t,(presets[p]||presets.calm).amp).height+(G.Sea12Waves?.wakeSample(x,z,t).height||0);
G.BayMotion=CommandMotion;if(typeof module!=='undefined')module.exports=CommandMotion;
})(typeof window!=='undefined'?window:globalThis);
