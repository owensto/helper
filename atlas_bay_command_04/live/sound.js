/* Original synthesized low-volume motor / water / latch sounds. Opt in only.
   This is not a recording of a specific outboard. */
(()=>{'use strict';class BaySound{
 constructor(){this.enabled=false;this.context=null;this.voices=[];}
 async toggle(){if(!this.context){const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;this.context=new A();const c=this.context;this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);this.motor=c.createGain();this.motor.gain.value=0;const filt=c.createBiquadFilter();filt.type='lowpass';filt.frequency.value=330;this.motor.connect(filt);filt.connect(this.master);for(const [f,g] of [[1,.43],[2,.22],[3,.10]]){const o=c.createOscillator(),gain=c.createGain();o.type='triangle';gain.gain.value=g;o.connect(gain);gain.connect(this.motor);o.start();this.voices.push({o,f});}
 const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),a=buffer.getChannelData(0);let v=0;for(let i=0;i<a.length;i++){v=.90*v+.1*(Math.random()*2-1);a[i]=v;}const n=c.createBufferSource();n.buffer=buffer;n.loop=true;const nf=c.createBiquadFilter();nf.type='highpass';nf.frequency.value=400;this.water=c.createGain();this.water.gain.value=0;n.connect(nf);nf.connect(this.water);this.water.connect(this.master);n.start();}
 this.enabled=!this.enabled;await this.context.resume();this.master.gain.setTargetAtTime(this.enabled?.14:0,this.context.currentTime,.08);return this.enabled;
 }
 tick(s){if(!this.context||!this.enabled)return;const c=this.context,t=c.currentTime;for(const {o,f}of this.voices)o.frequency.setTargetAtTime(Math.max(18,s.rpm/60*3)*f,t,.12);this.motor.gain.setTargetAtTime(s.engine?.18+.20*s.throttle:0,t,.12);this.water.gain.setTargetAtTime(Math.min(.24,.007+s.speedOverGround*.018),t,.15);}
 click(){if(!this.context||!this.enabled)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(350,c.currentTime);o.frequency.exponentialRampToValueAtTime(70,c.currentTime+.10);g.gain.setValueAtTime(.11,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.11);o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+.12);}
 suspend(v){if(this.context&&this.enabled)this.master.gain.setTargetAtTime(v?0:.14,this.context.currentTime,.05)}
}window.BaySound=BaySound;})();
