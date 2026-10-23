/* Original synthesized game sound. No recordings or real-weapon measurements. */
(function(G){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
const durations={diesel:4,wind:4,water:4,servo:2,shot:2.4,impact:3.8,splash:2.7,clack:.32,cycle:.8};
function samples(kind,sr=44100,seed=1){
 if(!durations[kind]||!Number.isFinite(sr)||sr<8000||sr>192000)throw Error('SOUND_SAMPLE_INPUT');
 let n=(seed>>>0)||1,low=0,bass=0,previous=0,hp=0;const out=new Float32Array(Math.ceil(durations[kind]*sr)),duration=out.length/sr;
 for(let i=0;i<out.length;i++){
  n^=n<<13;n^=n>>>17;n^=n<<5;const noise=(n>>>0)/2147483648-1,t=i/sr;
  low+=.045*(noise-low);bass+=.004*(noise-bass);let v=0;
  if(kind==='diesel'){const throb=.63+.37*Math.pow(.5+.5*Math.sin(TAU*23*t),5);v=throb*(.26*Math.sin(TAU*46*t)+.18*Math.sin(TAU*92*t)+.1*Math.sin(TAU*138*t))+.28*low+.12*noise;}
  if(kind==='wind')v=low*(.6+.18*Math.sin(TAU*.25*t))+.05*noise;
  if(kind==='water')v=(noise-low)*(.13+.1*Math.pow(.5+.5*Math.sin(TAU*.5*t),3))+.55*low;
  if(kind==='servo')v=.18*Math.sin(TAU*130*t)+.09*Math.sin(TAU*261*t)+.08*low+.04*noise;
  if(kind==='shot')v=.85*noise*Math.exp(-t*36)+2.4*low*Math.exp(-t*6)+1.8*bass*Math.exp(-t*1.8)+.42*Math.sin(TAU*(49*t+2.5*(1-Math.exp(-t*8))))*Math.exp(-t*4.5);
  if(kind==='impact')v=.55*noise*Math.exp(-t*18)+2.5*low*Math.exp(-t*3)+2.2*bass*Math.exp(-t*1.5)+.32*Math.sin(TAU*37*t)*Math.exp(-t*3);
  if(kind==='splash')v=(.6*low+.22*noise)*(1-Math.exp(-t*30))*Math.exp(-t*2)+.1*Math.sin(TAU*(160*t-15*t*t))*Math.exp(-t*6);
  if(kind==='clack')v=(.48*noise+.25*Math.sin(TAU*720*t)+.12*Math.sin(TAU*1370*t))*Math.exp(-t*28);
  if(kind==='cycle'){const env=Math.exp(-Math.abs(t-.09)*38)+.6*Math.exp(-Math.abs(t-.49)*40);v=(.55*low+.22*noise+.1*Math.sin(TAU*90*t))*env;}
  // Stable zero-ended buffers allow overlapped loops, and remove DC before playback.
  const edge=Math.min(1,t/.012,(duration-t)/.035),dc=v-previous+Math.exp(-TAU*15/sr)*hp;previous=v;hp=dc;
  out[i]=Math.tanh(dc*1.3)*Math.max(0,edge);
 }
 out[0]=0;out[out.length-1]=0;return out;
}
function makeBuffer(ctx,kind,seed){const data=samples(kind,ctx.sampleRate,seed),b=ctx.createBuffer(1,data.length,ctx.sampleRate);b.getChannelData(0).set(data);return b;}
function point(p){return p&&[p.x,p.y,p.z].every(Number.isFinite);}
function position(node,p,t){if(node.positionX){for(const k of ['x','y','z'])node['position'+k.toUpperCase()].setValueAtTime(p[k],t);}else node.setPosition(p.x,p.y,p.z);}
function create(T,{root,camera,contextFactory}={}){
 let ctx=null,bus=null,master=null,filter=null,compressor=null,enabled=false,disposed=false,error=null,lastEpoch=null,lastTime=null,serial=0,volume=.35,night=true,requested=false,toggleVersion=0;
 const buffers=new Map(),loops=new Map(),voices=new Set(),pending=[],events=[];let paused=true,stats={played:0,dropped:0,peakVoices:0,loopCount:0};
 function record(kind,details={}){events.push({kind,...details});if(events.length>24)events.shift();}
 function param(p,value){if(!ctx||!p)return;p.cancelScheduledValues(ctx.currentTime);p.setTargetAtTime(value,ctx.currentTime,.06);}
 function getBuffer(kind){if(!buffers.has(kind))buffers.set(kind,makeBuffer(ctx,kind,17+buffers.size*97));return buffers.get(kind);}
 function spatial(p){const pan=ctx.createPanner();pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=14;pan.maxDistance=1800;pan.rolloffFactor=.7;position(pan,p,ctx.currentTime);return pan;}
 function init(){
  if(ctx)return;if(disposed)throw Error('AUDIO_DISPOSED');
  const Factory=contextFactory||(()=>new (G.AudioContext||G.webkitAudioContext)({latencyHint:'interactive'}));ctx=Factory();
  bus=ctx.createGain();filter=ctx.createBiquadFilter();filter.type='highpass';filter.frequency.value=25;
  compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-20;compressor.knee.value=20;compressor.ratio.value=6;compressor.attack.value=.004;compressor.release.value=.22;
  master=ctx.createGain();master.gain.value=volume;bus.connect(filter);filter.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
  for(const [id,kind,p,gain]of [['port','diesel',[-30,2,-4],.0],['starboard','diesel',[-30,2,4],.0],['wind','wind',[0,0,0],.0],['water','water',[0,0,0],.0],['turret','servo',[39,10,0],.0]]){
   const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=getBuffer(kind);src.loop=true;g.gain.value=gain;
   const world=root.localToWorld(new T.Vector3(...p)),pan=spatial(world);src.connect(g);g.connect(pan);pan.connect(bus);src.start(0,id==='starboard'?.7:0);loops.set(id,{src,g,pan,local:p});
  }stats.loopCount=loops.size;
 }
 async function toggle(){
  if(disposed)return false;requested=!requested;const version=++toggleVersion;
  if(!requested){enabled=false;pending.length=0;stopVoices();await ctx?.suspend().catch(()=>{});return false;}
  try{init();await ctx.resume();if(disposed||version!==toggleVersion||!requested){if(!requested)await ctx?.suspend().catch(()=>{});return enabled;}
   enabled=ctx.state==='running';error=enabled?null:'Audio is suspended — tap Sound again';record('enabled');if(paused)await ctx.suspend();return enabled;
  }catch(e){if(version===toggleVersion){error=String(e.message||e);enabled=false;requested=false;}return false;}
 }
 function stopVoices(){for(const v of [...voices]){try{v.src.stop();}catch(_){}v.clean();}}
 function silence(){pending.length=0;stopVoices();if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{});}
 function reset(epoch,time){error=null;lastEpoch=epoch;lastTime=time;pending.length=0;stopVoices();record('reset',{epoch});}
 function event(kind,p,time,{delay=true}={}){
  if(!enabled||disposed||!point(p)||!Number.isFinite(time)||paused||!durations[kind])return false;
  if(pending.length>=24){stats.dropped++;return false;}
  const distance=camera.position.distanceTo(p),due=time+(delay?Math.min(3,distance/343):0);
  pending.push({id:++serial,kind,p:{x:p.x,y:p.y,z:p.z},due,epoch:lastEpoch});return true;
 }
 function play(e){
  if(voices.size>=16){stats.dropped++;return;}const src=ctx.createBufferSource(),g=ctx.createGain(),lp=ctx.createBiquadFilter(),pan=spatial(e.p);
  src.buffer=getBuffer(e.kind);src.playbackRate.value=1+((e.id%5)-2)*.018;lp.type='lowpass';const d=camera.position.distanceTo(new T.Vector3(e.p.x,e.p.y,e.p.z));lp.frequency.value=800+15000*Math.exp(-d/450);
  g.gain.value=['shot','impact'].includes(e.kind)?.85:e.kind==='splash'?.7:.26;
  src.connect(lp);lp.connect(g);g.connect(pan);pan.connect(bus);let cleaned=false;
  const voice={src,clean(){if(cleaned)return;cleaned=true;src.disconnect();lp.disconnect();g.disconnect();pan.disconnect();voices.delete(voice);}};
  src.onended=voice.clean;voices.add(voice);src.start();stats.played++;stats.peakVoices=Math.max(stats.peakVoices,voices.size);record(e.kind,{distance:d,at:lastTime,due:e.due});
 }
 function update(s,{slew=0,firstPerson=false}={}){
  if(disposed)return;
  if(!s||![s.time,s.epoch,s.port,s.starboard,s.speedKnots,s.roll,s.pitch].every(Number.isFinite)||s.time<0){paused=true;silence();return;}
  if(lastEpoch!==s.epoch)reset(s.epoch,s.time);
  if(lastTime!==null&&s.time<lastTime-1e-8){paused=true;silence();error='Clock discontinuity';return;}
  lastTime=s.time;const shouldPause=!!s.paused||!!G.document?.hidden;
  paused=shouldPause;
  if(!enabled||!ctx)return;
  if(shouldPause){if(ctx.state==='running')ctx.suspend().catch(()=>{});return;}
  if(ctx.state==='suspended'){ctx.resume().catch(e=>{error=String(e.message||e);});if(ctx.state!=='running')return;}
  root.updateWorldMatrix(true,false);camera.updateMatrixWorld(true);const at=ctx.currentTime,listener=ctx.listener,p=camera.position;
  const f=new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion),u=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  position(listener,p,at);if(listener.forwardX){for(const[k,v]of [['forwardX',f.x],['forwardY',f.y],['forwardZ',f.z],['upX',u.x],['upY',u.y],['upZ',u.z]])listener[k].setValueAtTime(v,at);}else listener.setOrientation(f.x,f.y,f.z,u.x,u.y,u.z);
  for(const[id,q]of loops){const pos=(id==='wind'||id==='water')?p:root.localToWorld(new T.Vector3(...q.local));position(q.pan,pos,at);
   if(id==='port'||id==='starboard'){const thrust=id==='port'?s.thrustP:s.thrustS,power=Number.isFinite(thrust)?clamp(Math.abs(thrust)/250000,0,1):(id==='port'?s.port:s.starboard);param(q.g.gain,s.engine?.12+.2*power:0);param(q.src.playbackRate,.65+power*.85);}
   else if(id==='wind')param(q.g.gain,.08+Math.min(.16,s.speedKnots*.008)+(firstPerson?-.02:0));
   else if(id==='water')param(q.g.gain,.07+Math.min(.22,s.speedKnots*.018)+Math.min(.12,Math.abs(s.roll)*.5));
   else{param(q.g.gain,Math.min(.3,Math.abs(slew)*.007));param(q.src.playbackRate,.8+Math.min(.7,Math.abs(slew)*.02));}
  }
  for(let i=0;i<pending.length;){const e=pending[i];if(e.epoch!==lastEpoch){pending.splice(i,1);continue;}if(e.due<=s.time+1e-8){pending.splice(i,1);if(s.time-e.due<1)play(e);else stats.dropped++;}else i++;}
 }
 function setVolume(v){if(!Number.isFinite(v))return;volume=clamp(v,0,.8);if(master)param(master.gain,volume);}
 function setNight(v){night=!!v;if(compressor){param(compressor.threshold,night?-20:-12);param(compressor.ratio,night?6:3);}}
 function dispose(){if(disposed)return;disposed=true;enabled=false;requested=false;toggleVersion++;silence();for(const q of loops.values()){try{q.src.stop();}catch(_){}q.src.disconnect();q.g.disconnect();q.pan.disconnect();}loops.clear();buffers.clear();for(const n of[bus,filter,compressor,master])n?.disconnect();ctx?.close().catch(()=>{});}
 function inspect(){return {enabled,state:ctx?.state||'off',error,volume,night,paused,epoch:lastEpoch,time:lastTime,pending:pending.length,activeVoices:voices.size,loops:loops.size,stats:{...stats},recent:[...events]};}
 return {toggle,event,update,reset,silence,setVolume,setNight,dispose,inspect};
}
G.AtlasSoundscape={samples,durations,create};if(typeof module!=='undefined')module.exports=G.AtlasSoundscape;
})(globalThis);
