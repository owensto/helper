/* Recorded engine textures carry the sound; restrained synthesis fills mechanical
 * transients only. Real outboard recording, not a claimed replica of this engine. */
(()=>{'use strict';const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function install(){if(!window.SEA08?.ready)return setTimeout(install,100);const A=BAYPLAY,B=A.audio,originalInit=B.init.bind(B),originalTick=B.tick.bind(B),originalInspect=B.inspect.bind(B);
 B.quality09={version:9,layers:0,lastContact:0,events:[],recordedDominant:true,acousticallyValidated:false};
 B.init=async()=>{await originalInit();const c=B.context;
  const buffers=await Promise.all(['low','mid','high'].map(async name=>{const r=await fetch('assets/audio/engine09_'+name+'.ogg');if(!r.ok)throw Error('Missing engine layer '+name);return c.decodeAudioData(await r.arrayBuffer());}));
  B.voices.forEach((v,i)=>{v.layers09=buffers.map((buffer,j)=>{const src=c.createBufferSource();src.buffer=buffer;src.loop=true;const gain=c.createGain();gain.gain.value=0;src.connect(gain);gain.connect(v.gain);src.start(0,(i*.37+j*.19)*buffer.duration);return {src,gain};});});
  B.quality09.layers=buffers.length;B.sampleStatus='Three recorded layers ready';
  // Fixed looping scrape voice avoids spawning sounds every physics sample.
  const ns=c.createBufferSource();ns.buffer=B.noise;ns.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=680;f.Q.value=.7;const gain=c.createGain();gain.gain.value=0;ns.connect(f);f.connect(gain);gain.connect(B.effectBus);ns.start();B.scrape09=gain;
 };
 B.event=(kind='latch')=>{if(!B.context||!B.enabled||B.held)return;const c=B.context,t=c.currentTime;let dur=kind==='start'?1.08:kind==='ground'?.70:kind==='splash'?.40:kind==='drawer'?.32:kind==='stop'?.4:kind==='horn'?.7:.10;
  const n=Math.ceil(c.sampleRate*dur),buffer=c.createBuffer(1,n,c.sampleRate),d=buffer.getChannelData(0);let seed=(t*1e5|0)+913,pink=0;
  for(let i=0;i<n;i++){const tt=i/c.sampleRate,u=tt/dur;seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>0)/2147483648-1;pink=.92*pink+.08*noise;
   if(kind==='start'){const phase=tt*(18+u*8)*2*Math.PI,pulse=Math.pow(Math.max(0,Math.sin(phase)),6);d[i]=(pink*.8+noise*.025+Math.sin(tt*2*Math.PI*(110+u*28))*.035)*(.12+.88*pulse)*Math.min(1,u*22)*(1-u*.5);}
   else if(kind==='ground'){d[i]=(Math.sin(tt*2*Math.PI*(57-u*20))*.45*Math.exp(-u*14)+pink*.9*Math.exp(-u*3)+noise*.025)*Math.min(1,u*130);}
   else if(kind==='horn')d[i]=(Math.sin(tt*2*Math.PI*330)+.4*Math.sin(tt*2*Math.PI*440))*.07*Math.min(1,u*20,((1-u)*15));
   else if(kind==='splash')d[i]=pink*.85*Math.pow(Math.sin(Math.PI*u),1.4);
   else if(kind==='stop')d[i]=(pink*.5+Math.sin(tt*2*Math.PI*(85-u*55))*.045)*Math.exp(-u*6);
   else d[i]=(noise*.13+Math.sin(tt*2*Math.PI*(kind==='shift'?160:950))*.045)*Math.exp(-u*(kind==='drawer'?4:12))*Math.min(1,u*150);
  }
  const src=c.createBufferSource();src.buffer=buffer;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='start'?2400:kind==='splash'?3200:kind==='ground'?1800:4200;src.connect(filter);filter.connect(B.effectBus);src.start();src.onended=()=>{src.disconnect();filter.disconnect();};
  B.quality09.events.push({kind,t});if(B.quality09.events.length>40)B.quality09.events.shift();
 };
 B.tick=s=>{originalTick(s);if(!B.context||!B.enabled||B.held)return;const t=B.context.currentTime,count=s.config?.count||1;
  for(const[i,v]of B.voices.entries()){if(!v.layers09)continue;const rpm=i?s.starboardRpm||s.rpm:s.portRpm||s.rpm,n=clamp((rpm-700)/5100,0,1),load=s.gear?clamp(s.throttle*(s.propWet??1),0,1):.02;
   const a=1-smooth(.08,.42,n),d=smooth(.48,.94,n),b=Math.max(0,1-a-d),weights=[a,b,d];
   // Slight texture pitch change, rather than stretching one recording 3x.
   v.layers09.forEach((v,j)=>{B.param(v.gain.gain,Math.sqrt(weights[j])*(.82+.18*load),t,.12);B.param(v.src.playbackRate,clamp([.88+n*.34,.86+n*.24,.87+n*.20][j]+i*.006,.84,1.2),t,.10);});
   if(v.recordGain)B.param(v.recordGain.gain,0,t,.03);B.param(v.tone.gain,.009+load*.013,t,.08);B.param(v.bodyGain.gain,.015+load*.025,t,.1);B.param(v.noiseGain.gain,.018+load*.025,t,.1);
   B.param(v.filter.frequency,1700+2200*n+1000*load,t,.12);B.param(v.gain.gain,i<count&&s.engine?(s.startTimer>0?.035:.48+.28*n+.21*load)/Math.sqrt(count):0,t,.1);
  }
  B.metrics.activeEngines=s.engine?count:0;
  const speed=Math.hypot(s.u||0,s.v||0);if(B.scrape09)B.param(B.scrape09.gain,B.enabled&&!B.held&&s.grounded?Math.min(.27,speed*.055):0,t,.08);
  if(s.bottomHitCount>B.quality09.lastContact){B.quality09.lastContact=s.bottomHitCount;B.event('ground');}
  if(s.bottomHitCount===0)B.quality09.lastContact=0;
  // A rolling engine can be silent; lap water stays audible at rest.
  if(B.waterRecording)B.param(B.waterRecording.gain.gain,B.settings.water*(.08+Math.min(.33,speed*.017))*(s.airborne?.14:1),t,.22);
  if(B.voices[0]?.layers09)B.sampleStatus='Three recorded layers ready';
 };
 B.inspect=()=>({...originalInspect(),version:'09',realism09:{...B.quality09}});window.SEA09_AUDIO={ready:true,inspect:()=>B.inspect()};
}install();})();
