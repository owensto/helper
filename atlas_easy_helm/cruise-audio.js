/* Persistent local music control. Routes the existing radio, not protected media.
 * Computer speakers = direct mix; boat speakers = inherited distance/pan/filter.
 * This never selects the OS audio device or starts music without a gesture.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasCruiseAudio=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const KEY='atlas-cruise-audio-v4';
function preferences(raw){let p={};try{p=typeof raw==='string'?JSON.parse(raw):raw;}catch(_){}if(!p||Array.isArray(p)||typeof p!=='object')p={};return{output:p.output==='boat'?'boat':'computer',keepMusic:p.keepMusic!==false};}
function install(host){
 const D=host.document,W=host.window,R=host.radio;
 if(!D||!W||!R||typeof host.isLocal!=='function'||host.isLocal()!==true)throw Error('An explicit local-radio host is required.');
 for(const k of ['inspect','setOutput','setVolume','play','pause','next'])if(typeof R[k]!=='function')throw Error('Missing radio method: '+k);
 const app=D.getElementById('helm09');if(!app||D.getElementById('eh-cruise-audio'))throw Error('Radio controls unavailable or already installed.');
 const prior={output:R.outputMode,follow:R.followPause};let disposed=false,pref=preferences(read()),generation=0,last='',applied={},pending=false;
 const handlers=[];function local(){try{return !disposed&&host.isLocal()===true;}catch(_){return false;}}
 function read(){try{return host.storage?.getItem(KEY);}catch(_){return null;}}
 function persist(){try{host.storage?.setItem(KEY,JSON.stringify(pref));return true;}catch(_){return false;}}
 function el(tag,text,cls){const n=D.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
 function on(n,t,fn){n.addEventListener(t,fn);handlers.push([n,t,fn]);}
 const strip=el('section','','eh-cruise-audio');strip.id='eh-cruise-audio';strip.setAttribute('aria-label','Music controls while driving');strip.hidden=true;
 const title=el('strong','Music'),label=el('span','Computer speakers'),now=el('div','','eh-audio-now');now.append(title,label);
 const play=el('button','Play'),next=el('button','Next'),more=el('button','Music');play.type=next.type=more.type='button';play.id='eh-cruise-play';next.id='eh-cruise-next';more.id='eh-cruise-more';
 const bar=el('div','','eh-audio-bar');bar.append(now,play,next,more);
 const details=el('details','','eh-audio-options'),summary=el('summary','Speakers & volume');details.append(summary);
 const output=el('select');output.id='eh-speaker-output';output.setAttribute('aria-label','Music speaker mode');
 for(const[v,t]of[['computer','Computer speakers'],['boat','Boat speakers']]){const o=el('option',t);o.value=v;output.append(o);}output.value=pref.output;
 const volume=el('input');volume.id='eh-music-volume';volume.type='range';volume.min='0';volume.max='100';volume.step='1';volume.value=String(Math.round((R.volume??.36)*100));volume.setAttribute('aria-label','Music volume');
 const keep=el('input');keep.type='checkbox';keep.id='eh-keep-music';keep.checked=pref.keepMusic;const keepRow=el('label','','eh-keep-music');keepRow.append(keep,el('span','Keep music playing when the boat pauses'));
 const note=el('p','Speaker modes apply to your files and included instrumentals. YouTube uses its own visible player.','eh-audio-note');
 const status=el('p','','eh-audio-note');status.id='eh-cruise-status';status.setAttribute('role','status');
 details.append(output,volume,keepRow,note);strip.append(bar,details,status);app.append(strip);
 function apply(){R.setOutput(pref.output==='boat'?'cockpit':'direct');R.followPause=!pref.keepMusic;applied={output:R.outputMode,follow:R.followPause};}
 function save(){if(!persist())status.textContent='Setting kept for this session; device storage is unavailable.';}
 function asyncAction(fn){if(!local()||pending)return;pending=true;const id=++generation;try{Promise.resolve(fn()).then(()=>{if(!disposed&&id===generation){pending=false;update();}},e=>{if(!disposed&&id===generation){pending=false;status.textContent=e?.message||'Music could not start. Press Play again.';update();}});}catch(e){pending=false;status.textContent=e.message;}}
 on(play,'click',()=>{if(!local())return;if(R.wanted){generation++;pending=false;R.pause();update();return;}asyncAction(()=>{host.closeProviders?.();apply();return R.play();});});
 on(next,'click',()=>{if(local())asyncAction(()=>R.next(1));});
 on(more,'click',()=>{if(local())host.panel('radio');});
 on(output,'change',()=>{if(!local())return;pref={...pref,output:output.value==='boat'?'boat':'computer'};apply();save();update();});
 on(volume,'input',()=>{if(local()){R.setVolume(Number(volume.value)/100);update();}});
 on(keep,'change',()=>{if(!local())return;pref={...pref,keepMusic:!!keep.checked};apply();save();update();});
 function update(){if(disposed)return;if(!local()){strip.hidden=true;app.classList.remove('eh-audio-active');return;}if(D.hidden)return;if(host.providersActive?.()){strip.hidden=true;app.classList.remove('eh-audio-active');return;}
  const s=R.inspect(),active=s.wanted||s.playing||s.error||s.sourceKind==='local';strip.hidden=!active;app.classList.toggle('eh-audio-active',!!active);
  const value=JSON.stringify([s.title,s.status,s.outputMode,s.wanted,s.held,s.error,s.volume]);if(value===last)return;last=value;
  title.textContent=s.title||'Music';label.textContent=(s.outputMode==='cockpit'?'Boat speakers':'Computer speakers')+(s.held?' · paused':'');
  play.textContent=s.wanted?'Pause':'Play';play.setAttribute('aria-label',s.wanted?'Pause music only':'Play music');play.disabled=false;
  output.value=s.outputMode==='cockpit'?'boat':'computer';if(D.activeElement!==volume)volume.value=String(Math.round(s.volume*100));keep.checked=!R.followPause;
  status.textContent=s.error|| (s.wanted&&!s.playing?s.status:'');
 }
 function dispose(){if(disposed)return;disposed=true;generation++;host.clearInterval(timer);handlers.forEach(([n,t,f])=>n.removeEventListener(t,f));strip.remove();app.classList.remove('eh-audio-active');
  // Restore only fields still owned by this installation; do not stop the user's track.
  if(R.outputMode===applied.output)R.setOutput(prior.output);if(R.followPause===applied.follow)R.followPause=prior.follow;
 }
 apply();on(W,'pagehide',dispose);const timer=host.setInterval(update,200);update();
 return Object.freeze({update,dispose,preferences:()=>({...pref}),inspect:()=>({installed:!disposed,output:pref.output,keepMusic:pref.keepMusic,OSDeviceSelected:false,protectedAudioRouted:false})});
}
return Object.freeze({preferences,install});
});
