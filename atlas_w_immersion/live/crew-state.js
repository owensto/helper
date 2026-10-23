/* Presentation-only crew behavior. No weapon procedures or calibration. */
(function(G){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
class CrewState {
 constructor(){this.reset();}
 reset(epoch=null){this.epoch=epoch;this.time=null;this.bearing=0;this.elevation=18;this.engine=false;this.shotAt=-100;this.touchAt=-100;this.action='';this.output=null;this.failed=false;this.pitch=0;this.roll=0;this.yawRate=0;this.forward=0;this.velocity=0;this.slew=0;}
 interact(action){if(this.time===null||this.failed)return;this.touchAt=this.time;this.action=String(action);}
 shot(time){if(Number.isFinite(time)&&time>=0&&!this.failed)this.shotAt=time;}
 observe(s,bearing,elevation){
  if(!s||![s.time,s.epoch,s.roll??0,s.pitch??0,s.yawRate??0,s.forwardMps??0,bearing,elevation].every(Number.isFinite)||s.time<0||!Number.isSafeInteger(s.epoch)){this.failed=true;return null;}
  if(this.epoch!==s.epoch)this.reset(s.epoch);
  if(this.failed||this.time!==null&&s.time<this.time-1e-8){this.failed=true;return null;}
  if(this.time!==null&&Math.abs(s.time-this.time)<1e-8)return this.output;
  const dt=this.time===null?0:s.time-this.time;if(dt>.15){this.failed=true;return null;}
  if(this.time!==null&&s.engine!==this.engine){this.touchAt=s.time;this.action=s.engine?'ENGINE START':'ENGINE STOP';}
  const slew=dt?clamp((bearing-this.bearing)/dt,-40,40):0,pitchRate=dt?clamp((elevation-this.elevation)/dt,-25,25):0;
  const a=dt?1-Math.exp(-7*dt):1;this.slew+=(slew-this.slew)*a;
  const accel=dt?clamp(((s.forwardMps||0)-this.velocity)/dt,-2,2):0;
  this.pitch+=(clamp(-(s.pitch||0)*.35-accel*.018,-.045,.045)-this.pitch)*a;
  this.roll+=(clamp(-(s.roll||0)*.4-(s.yawRate||0)*.04,-.04,.04)-this.roll)*a;
  const age=s.time-this.shotAt,touch=s.time-this.touchAt;
  const press=age>=0&&age<.26?Math.sin(Math.PI*clamp(age/.26,0,1)):0;
  const reaction=age>=0&&age<1.2?Math.exp(-age*7)*Math.sin(age*15):0;
  const reach=touch>=0&&touch<.85?smooth(touch/.24)*(1-smooth((touch-.42)/.43)):0;
  const activity=age>=0&&age<.26?'FIRING':age<1.2?'RECOVERING':reach>.1?'CHECKING CONSOLE':Math.abs(this.slew)>2||Math.abs(pitchRate)>2?'TRACKING':'READY';
  this.time=s.time;this.bearing=bearing;this.elevation=elevation;this.engine=s.engine;this.velocity=s.forwardMps||0;
  return this.output=Object.freeze({time:s.time,epoch:s.epoch,activity,consoleAction:this.action,trigger:press,reach,handSupport:[reach<.02,true],
   gripYaw:clamp(this.slew/40,-1,1)*.09,gripPitch:clamp(pitchRate/25,-1,1)*.08,
   lean:[this.roll,0],torsoPitch:.07+this.pitch-reaction*.028,breath:.0022*Math.sin(s.time*1.65),
   headYaw:clamp(this.slew/40,-1,1)*.12,headPitch:reach*.17-reaction*.02,headMotion:reaction*.006,
   recoilReaction:reaction,steady:Math.abs(this.slew)<2});
 }
 inspect(){return {epoch:this.epoch,time:this.time,failed:this.failed,behavior:this.output};}
}
G.AtlasCrewState={CrewState};if(typeof module!=='undefined')module.exports=G.AtlasCrewState;
})(globalThis);
