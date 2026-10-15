/* Sea Lab 05 hybrid sound. CC0 nomadas outboard texture + original synthesis.
 * Not an acoustic reproduction of a particular 300/450 hp engine.
 * Two independent voices; source locations follow the actual configured rig.
 * Opt-in, click-free envelopes, bounded output, pause/background muting. */
(()=>{'use strict';
const cap=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
class BaySound{
 constructor(){this.enabled=false;this.context=null;this.voices=[];this.held=false;this.sampleStatus='Not loaded';this.last=null;this.lastImpactAt=-10;this.settings={master:.60,engine:.85,water:.55,wind:.35,effects:.60};try{const m=JSON.parse(localStorage.getItem('atlas-audio05-mix')||'{}');for(const k of Object.keys(this.settings))if(Number.isFinite(m[k]))this.settings[k]=cap(m[k],0,1);}catch{}this.metrics={rms:0,engineLoads:[],activeEngines:0};}
 param(p,v,t=this.context.currentTime,tau=.08){if(!p||!Number.isFinite(v))return;p.setTargetAtTime(v,t,tau);}
 async init(){
  const A=window.AudioContext||window.webkitAudioContext;if(!A)throw Error('Web Audio is unavailable');const c=this.context=new A();
  this.master=c.createGain();this.master.gain.value=0;this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-12;this.compressor.knee.value=12;this.compressor.ratio.value=5;this.compressor.attack.value=.005;this.compressor.release.value=.20;
  this.analyser=c.createAnalyser();this.analyser.fftSize=1024;this.samples=new Float32Array(1024);this.compressor.connect(this.master);this.master.connect(this.analyser);this.analyser.connect(c.destination);
  this.recordOutput=c.createMediaStreamDestination();this.master.connect(this.recordOutput);
  this.engineBus=c.createGain();this.engineBus.connect(this.compressor);this.effectBus=c.createGain();this.effectBus.connect(this.compressor);
  const b=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=b.getChannelData(0);let seed=835171,pink=0;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;const n=(seed>>>0)/2147483648-1;pink=.96*pink+.04*n;data[i]=pink*2.6+n*.07;}this.noise=b;
  const real=new Float32Array(15),imag=new Float32Array(15);for(let i=1;i<15;i++)imag[i]=Math.exp(-i*.24)/i*(i%3===0?.6:1);this.periodic=c.createPeriodicWave(real,imag);
  for(let i=0;i<2;i++){
   const gain=c.createGain();gain.gain.value=0;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=950;filter.Q.value=.3;gain.connect(filter);
   const pan=c.createPanner();pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=3.5;pan.maxDistance=120;pan.rolloffFactor=.75;filter.connect(pan);pan.connect(this.engineBus);
   const osc=c.createOscillator();osc.setPeriodicWave(this.periodic);osc.frequency.value=35;const tone=c.createGain();tone.gain.value=.19;osc.connect(tone);tone.connect(gain);osc.start();
   const n=c.createBufferSource();n.buffer=this.noise;n.loop=true;const band=c.createBiquadFilter();band.type='bandpass';band.frequency.value=450;band.Q.value=.8;const ng=c.createGain();ng.gain.value=.08;n.connect(band);band.connect(ng);ng.connect(gain);n.start(0,i*1.5);
   const body=c.createOscillator();body.type='sine';body.frequency.value=35;const bodyGain=c.createGain();bodyGain.gain.value=.08;body.connect(bodyGain);bodyGain.connect(gain);body.start();
   this.voices.push({gain,filter,pan,osc,tone,body,bodyGain,noiseGain:ng,band,record:null,recordGain:null});
  }
  for(const name of ['water','wind']){const n=c.createBufferSource();n.buffer=this.noise;n.loop=true;const filt=c.createBiquadFilter();filt.type=name==='water'?'lowpass':'highpass';filt.frequency.value=name==='water'?1800:650;const gain=c.createGain();gain.gain.value=0;n.connect(filt);filt.connect(gain);gain.connect(this.compressor);n.start(0,name==='water'?0:1.2);this[name]=gain;this[name+'Filter']=filt;}
  await c.resume();this.sampleStatus='Loading recorded texture';
  try{const r=await fetch('assets/audio/outboard_body.ogg');if(!r.ok)throw Error('Recording unavailable');const b=await c.decodeAudioData(await r.arrayBuffer());this.buffer=b;
   this.voices.forEach((v,i)=>{const n=c.createBufferSource();n.buffer=b;n.loop=true;const g=c.createGain();g.gain.value=.65;n.connect(g);g.connect(v.gain);n.start(0,i*b.duration*.37);v.record=n;v.recordGain=g;});this.sampleStatus='Recorded texture ready';
  }catch(e){this.sampleStatus='Synthesis fallback — recording unavailable';console.warn(this.sampleStatus);}
  this.applyMix();
 }
 async toggle(){this.enabled=!this.enabled;if(!this._ready)this._ready=this.init();try{await this._ready;await this.context.resume();this.applyMix();return this.enabled;}catch(e){this.enabled=false;throw e;}}
 applyMix(){if(!this.context)return;this.param(this.master.gain,this.enabled&&!this.held?this.settings.master*.9:0);this.param(this.engineBus.gain,this.settings.engine);this.param(this.effectBus.gain,this.settings.effects);}
 setMix(key,v){if(!(key in this.settings))return;this.settings[key]=cap(v,0,1);try{localStorage.setItem('atlas-audio05-mix',JSON.stringify(this.settings));}catch{}this.applyMix();}
 spatial(){const A=window.BAYPLAY,T=window.ATLASRuntime;if(!A?.boat||!T||!this.context)return;const c=this.context,L=c.listener,t=c.currentTime,cam=A.camera;const pos=cam.getWorldPosition(new T.Vector3()),dir=cam.getWorldDirection(new T.Vector3()),up=new T.Vector3(0,1,0).applyQuaternion(cam.quaternion);
  if(L.positionX){for(const[k,v]of[['positionX',pos.x],['positionY',pos.y],['positionZ',pos.z],['forwardX',dir.x],['forwardY',dir.y],['forwardZ',dir.z],['upX',up.x],['upY',up.y],['upZ',up.z]])this.param(L[k],v,t,.045);}else{L.setPosition(pos.x,pos.y,pos.z);L.setOrientation(dir.x,dir.y,dir.z,up.x,up.y,up.z);}
  const count=A.state.config?.count||1;this.voices.forEach((v,i)=>{const p=A.boat.localToWorld(new T.Vector3(-4.2,.25,count===1?0:(i===0?-.61:.61)));if(v.pan.positionX){this.param(v.pan.positionX,p.x,t,.045);this.param(v.pan.positionY,p.y,t,.045);this.param(v.pan.positionZ,p.z,t,.045);}else v.pan.setPosition(p.x,p.y,p.z);});
 }
 tick(s){if(!this.context)return;const c=this.context,t=c.currentTime,count=s.config?.count||1;
  if(!this.enabled||this.held){this.last={engine:s.engine,gear:s.gear};return;}
  if(this.last){if(s.engine&&!this.last.engine)this.event('start');if(!s.engine&&this.last.engine)this.event('stop');if(s.gear!==this.last.gear&&s.engine)this.event('shift');}
  if((s.lastImpact||0)>2.3&&t-this.lastImpactAt>1){this.event('splash');this.lastImpactAt=t;}
  this.last={engine:s.engine,gear:s.gear};this.metrics.activeEngines=count;this.metrics.engineLoads=[];
  this.voices.forEach((v,i)=>{const active=i<count&&s.engine,rpm=i===0?(s.portRpm||s.rpm):(s.starboardRpm||s.rpm),n=cap((rpm-700)/5100,0,1),load=s.gear===0?.03:cap(s.throttle,0,1)*(s.propWet??1),start=s.startTimer>0;
   const amplitude=active?(start?.05:(.30+.32*n+.33*load))/Math.sqrt(count):0;
   this.param(v.gain.gain,amplitude,t,.075);this.param(v.osc.frequency,Math.max(15,rpm/20),t,.06);this.param(v.osc.detune,Math.sin(t*(i?1.13:.83)+i*3)*3,t,.1);
   this.param(v.body.frequency,Math.max(14,rpm/40),t,.06);this.param(v.bodyGain.gain,.08+.10*load,t,.10);
   this.param(v.filter.frequency,450+1100*n+900*load+(s.airborne?750:0),t,.08);this.param(v.tone.gain,.14+.06*load,t,.1);this.param(v.noiseGain.gain,.06+.25*load+.1*n,t,.1);this.param(v.band.frequency,200+1400*n,t,.1);
   if(v.record){this.param(v.record.playbackRate,.55+n*.95,t,.10);this.param(v.recordGain.gain,.55+.25*load,t,.12);}
   this.metrics.engineLoads.push({rpm:Math.round(rpm),load,gain:amplitude,recorded:!!v.record});
  });
  const speed=Math.hypot(s.u||0,s.v||0),rough={calm:.02,breeze:.06,chop:.13,swell:.2}[s.environment]||.02;
  this.param(this.water.gain,this.settings.water*(.025+Math.min(.55,speed*.020)+rough)*(s.airborne?.2:1),t,.18);
  this.param(this.waterFilter.frequency,750+speed*90,t,.2);this.param(this.wind.gain,this.settings.wind*Math.min(.36,Math.pow(speed/30,1.7)*.3+rough*.30),t,.25);
  this.spatial();this.analyser.getFloatTimeDomainData(this.samples);let sq=0;for(const x of this.samples)sq+=x*x;this.metrics.rms=Math.sqrt(sq/this.samples.length);
 }
 event(kind='latch'){
  if(!this.context||!this.enabled||this.held)return;const c=this.context,t=c.currentTime,start=kind==='start',splash=kind==='splash',drawer=kind==='drawer';
  const dur=start?1.1:splash?.55:drawer?.45:kind==='stop'?.35:.16;const noise=c.createBufferSource();noise.buffer=this.noise;const f=c.createBiquadFilter();f.type=splash||start?'lowpass':'bandpass';f.frequency.value=splash?1200:start?720:drawer?1100:1800;f.Q.value=.8;
  const g=c.createGain();g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(start?.4:splash?.6:drawer?.26:.20,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+dur);noise.connect(f);f.connect(g);g.connect(this.effectBus);noise.start(t,Math.random());noise.stop(t+dur+.02);
  const o=c.createOscillator(),og=c.createGain();o.type='sine';o.frequency.setValueAtTime(start?65:splash?70:kind==='shift'?140:340,t);o.frequency.exponentialRampToValueAtTime(start?130:45,t+dur);og.gain.setValueAtTime(start?.12:.14,t);og.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(og);og.connect(this.effectBus);o.start(t);o.stop(t+dur+.02);
  o.onended=()=>{o.disconnect();og.disconnect();noise.disconnect();f.disconnect();g.disconnect();};
 }
 click(kind='latch'){this.event(kind);}
 suspend(v){const held=!!v;if(held===this.held)return;this.held=held;this.applyMix();}
 inspect(){return {version:'05.1',enabled:this.enabled,contextState:this.context?.state||'not-created',sampleStatus:this.sampleStatus,held:this.held,settings:{...this.settings},metrics:JSON.parse(JSON.stringify(this.metrics)),specificEngineRecording:false};}
}
window.BaySound=BaySound;})();
