/* Bounded three-animal encounter. Chart/pier aware; visible breathing starts
 * immediately, relative to encounter creation, not arbitrary application uptime.
 * No per-render-frame world checks; validated short movement segments at 10 Hz. */
(function(G,f){const a=f();if(typeof module==='object')module.exports=a;else G.AtlasWildlife5=a;})(globalThis,()=>{'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function smooth(a,b,x){const q=clamp((x-a)/(b-a),0,1);return q*q*(3-2*q);}
function water(x,z,env,radius=3){const q=env.sample(x,z,'beaufort');return !!q&&q.known===true&&!q.land&&Number.isFinite(q.depth)&&q.depth+env.tide>2.8&&!env.obstacles({x,z,heading:0,location:'beaufort'}).some(b=>x>b.x0-radius&&x<b.x1+radius&&z>b.z0-radius&&z<b.z1+radius);}
class Pod{
 constructor(env){this.env=env;this.animals=[];this.elapsed=0;this.nextSeed=-Infinity;this.location=null;this.pending=0;this.checks=0;this.encounters=0;this.status='searching';this.watching=false;}
 valid(x,z){this.checks++;return water(x,z,this.env);}
 seed(s){if(s.location!=='beaufort'){this.status='outside Beaufort';return;}if(this.location!==s.location||s.elapsed<this.elapsed-.2){this.animals.length=0;this.nextSeed=-Infinity;this.pending=0;}this.location=s.location;
  if(this.animals.length&&this.animals.some(d=>d.active&&Math.hypot(d.x-s.x,d.z-s.z)<520))return;
  if(this.watching||s.elapsed<this.nextSeed)return;this.nextSeed=s.elapsed+4;
  const found=[];for(let i=0;i<3;i++){let d=null;for(let j=0;j<56;j++){
   const a=s.heading+.65+j*.73,r=38+((j*13+i*8)%42),x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r,h=a+Math.PI/2;
   if(found.some(p=>Math.hypot(p.x-x,p.z-z)<5))continue;
   if(this.valid(x,z)&&this.valid(x+Math.cos(h)*7,z+Math.sin(h)*7)){d={id:i,x,z,heading:h,phase:i*3.6,born:s.elapsed,depth:.12,speed:2.0+i*.12,active:true,blocked:0,checkAt:s.elapsed,stroke:0,roll:0,pitch:0};break;}}
   if(d)found.push(d);
  }
  if(found.length){this.animals=found;this.encounters++;this.status='swimming';this.elapsed=s.elapsed;this.pose(s.elapsed);}else this.status='no known deep water nearby';
 }
 pose(t){this.elapsed=t;for(const d of this.animals){const age=Math.max(0,t-d.born),cycle=((age+d.phase)%10.8+10.8)%10.8;
   // One animal begins already at the surface; a group has staggered breaths.
   const breath=cycle<2.7?1:cycle<3.8?1-smooth(2.7,3.8,cycle):cycle>9.7?smooth(9.7,10.8,cycle):0;
   d.depth=Math.max(.12,1.15-1.03*breath);d.surface=d.depth<.50;
   d.pitch=cycle>2.7&&cycle<3.8?-.13*Math.sin((cycle-2.7)/1.1*Math.PI):cycle>9.7?.13*Math.sin((cycle-9.7)/1.1*Math.PI):0;
   d.roll=.025*Math.sin(age*.65+d.phase);d.stroke=age*(2.5+d.speed*.30)+d.phase;
  }}
 step(s,dt){if(!Number.isFinite(dt)||dt<=0||s.location!=='beaufort')return;this.seed(s);dt=Math.min(dt,.25);
  for(const d of this.animals){if(!d.active)continue;
   if(s.elapsed>=d.checkAt){const dist=Math.hypot(d.x-s.x,d.z-s.z),a=Math.atan2(d.z-s.z,d.x-s.x);let wanted=d.heading+Math.sin(s.elapsed*.13+d.phase)*.06;
    if(dist<26)wanted=a;else if(dist>170&&!this.watching)wanted=a+Math.PI;
    d.heading+=clamp(angle(wanted-d.heading),-.085,.085);
    const nx=d.x+Math.cos(d.heading)*d.speed*.16,nz=d.z+Math.sin(d.heading)*d.speed*.16;
    d.canMove=this.valid(nx,nz)&&this.valid(nx+Math.cos(d.heading)*6,nz+Math.sin(d.heading)*6);
    if(!d.canMove&&!this.valid(d.x,d.z)){d.active=false;continue;}
    if(!d.canMove){d.heading+=.22;d.blocked+=.12;}else d.blocked=0;
    d.checkAt=s.elapsed+.1;
   }
   if(d.canMove){d.x+=Math.cos(d.heading)*d.speed*dt;d.z+=Math.sin(d.heading)*d.speed*dt;}
  }this.pose(s.elapsed);
 }
 nearest(s){const a=this.animals.filter(d=>d.active&&Math.hypot(d.x-s.x,d.z-s.z)<600);return a.sort((a,b)=>Number(b.surface)-Number(a.surface)||Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z))[0]||null;}
 inspect(s){const d=this.nearest(s);return {count:this.animals.length,status:this.status,checks:this.checks,encounters:this.encounters,nearby:!!d,nearestMetres:d?Math.hypot(d.x-s.x,d.z-s.z):null,surfaceCount:this.animals.filter(d=>d.surface).length};}
}
return Object.freeze({Pod,water});});
