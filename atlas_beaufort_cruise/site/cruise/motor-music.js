/* Additive motor controls and built-in country queues. No new physics clock.
   Video links are verified against the artists' own sites (2026-10-18), not
   downloaded audio. The official visible player controls playback and ads. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasMotorMusic=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const tracks=Object.freeze({
 burn:Object.freeze({id:'6KNwRDEeC9Q',artist:'Zach Bryan',title:'Burn, Burn, Burn'}),
 nine:Object.freeze({id:'3EQ_45laK4M',artist:'Zach Bryan',title:'Nine Ball'}),
 oklahoma:Object.freeze({id:'FJqd58_WgGo',artist:'Zach Bryan',title:'Oklahoma Smokeshow'}),
 twentyEight:Object.freeze({id:'XN39ZM0Ip1I',artist:'Zach Bryan',title:'28'}),
 purple:Object.freeze({id:'mZj4TQtixO0',artist:'Zach Bryan with Noeline Hofmann',title:'Purple Gas'}),
 better:Object.freeze({id:'HF9ZFCr7KrU',artist:'Zach Bryan featuring John Mayer',title:'Better Days'}),
 saddle:Object.freeze({id:'BCQYxoEdmdI',artist:'Luke Combs',title:'Back in the Saddle'}),
 days:Object.freeze({id:'uGsmAZCwrG8',artist:'Luke Combs',title:'Days Like These'}),
 saturday:Object.freeze({id:'NiLJXwtIKhY',artist:'Luke Combs',title:'My Kinda Saturday Night'})
});
const presets=Object.freeze([
 Object.freeze({id:'zach-bryan',name:'Zach Bryan Favorites',description:'Six songs · ready to load, no pasted link needed',tracks:Object.freeze([tracks.burn,tracks.nine,tracks.oklahoma,tracks.twentyEight,tracks.purple,tracks.better])}),
 Object.freeze({id:'country-cruise',name:'Country Cruise',description:'Zach Bryan + Luke Combs · six-song boat queue',tracks:Object.freeze([tracks.saddle,tracks.nine,tracks.days,tracks.twentyEight,tracks.saturday,tracks.better])})
]);
function selectQueue(id,index=0){const p=presets.find(p=>p.id===id);if(!p)throw Error('Unknown built-in playlist.');if(!Number.isInteger(index)||index<0||index>=p.tracks.length)throw Error('Invalid track selection.');return{...p,tracks:p.tracks.slice(index).concat(p.tracks.slice(0,index))};}
function embedURL(id,index=0){const q=selectQueue(id,index),u=new URL('https://www.youtube.com/embed/'+q.tracks[0].id);u.searchParams.set('playlist',q.tracks.slice(1).map(t=>t.id).join(','));u.searchParams.set('playsinline','1');u.searchParams.set('controls','1');u.searchParams.set('autoplay','0');u.searchParams.set('rel','0');return u.href;}
function trimState(s){
 if(!s||!Number.isFinite(s.trim)||!Number.isFinite(s.trimActual))return {available:false,label:'Trim unavailable',moving:false};
 if(s.performanceMode==='reference')return {available:false,label:'Trim fixed in reference mode',moving:false};
 if(s.destroyed10)return {available:false,label:'Boat requires recovery',moving:false};
 const target=Math.max(0,Math.min(1,s.trim)),actual=Math.max(0,Math.min(1,s.trimActual)),moving=Math.abs(target-actual)>.005;
 return{available:true,target,actual,moving,label:'Trim '+Math.round(actual*100)+'%'+(moving?' → '+Math.round(target*100)+'%':''),high:target>=.7};
}
function trimTarget(s,direction){if(![1,-1].includes(direction))throw Error('Invalid trim direction.');const t=trimState(s);if(!t.available)throw Error(t.label);return Math.max(0,Math.min(1,Math.round((t.target+direction*.05)*100)/100));}
function install(host){
 const D=host.document,W=host.window;
 for(const key of ['isLocal','read','dispatch','setInterval','clearInterval','stopOtherMusic'])if(typeof host[key]!=='function')throw Error('Missing explicit host method '+key);
 if(!D||!W||host.isLocal()!==true)throw Error('Local boat host required.');
 const app=D.getElementById('helm09'),dock=app?.querySelector('.h09-dock');if(!dock)throw Error('Helm controls unavailable.');
 if(D.getElementById('eh-trim-controls'))throw Error('Motor controls already installed.');
 const handlers=[],owned=[];let disposed=false,queue=null,video=null,last='';
 function on(n,t,f,capture=false){n.addEventListener(t,f,capture);handlers.push([n,t,f,capture]);}
 function el(tag,text,cls){const n=D.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
 function own(n,p){p.append(n);owned.push(n);return n;}
 function local(){try{return !disposed&&host.isLocal()===true;}catch(_){return false;}}
 const trim=el('section','','eh-trim-controls');trim.id='eh-trim-controls';trim.setAttribute('aria-label','Engine trim');
 const label=el('strong','Engine trim'),readout=el('output','Trim unavailable');readout.id='eh-trim-value';
 const row=el('div','','eh-trim-buttons'),down=el('button','↓ Down'),up=el('button','Up ↑');down.type=up.type='button';down.id='eh-trim-down';up.id='eh-trim-up';
 down.setAttribute('aria-label','Trim engine down five percent');up.setAttribute('aria-label','Trim engine up five percent');
 row.append(down,up);trim.append(label,readout,row);own(trim,dock);
 const notice=own(el('div','','eh-motor-notice'),app);notice.id='eh-motor-notice';notice.setAttribute('role','status');
 function move(d){if(!local())return;try{const n=trimTarget(host.read(),d);host.dispatch('trim',n);update();notice.textContent='Trim target '+Math.round(n*100)+'%. '+(host.paused?.()?'Paused: press Resume for motor movement.':n>=.7?'High trim can reduce propeller grip in this model.':'Motor follows the selected target.');}catch(e){notice.textContent=e.message;}}
 on(down,'click',()=>move(-1));on(up,'click',()=>move(1));
 const panel=el('section','','eh-queue-player');panel.id='eh-queue-player';panel.hidden=true;panel.setAttribute('aria-label','Visible YouTube country playlist');
 const heading=el('div','','eh-queue-heading'),title=el('strong'),closeButton=el('button','Close music');closeButton.type='button';closeButton.id='eh-close-queue';
 heading.append(title,closeButton);const mount=el('div','','eh-queue-frame'),message=el('p','','eh-queue-status');message.setAttribute('role','status');
 const fallback=el('a','Open selected song on YouTube ↗');fallback.target='_blank';fallback.rel='noopener noreferrer';
 const tools=el('div','','eh-queue-tools'),drive=el('button','Drive with music'),full=el('button','Larger player');drive.type=full.type='button';drive.id='eh-drive-music';full.id='eh-expand-music';tools.append(drive,full);
 panel.append(heading,mount,message,tools,fallback);own(panel,app);
 function dockPlayer(){if(!queue||!local())return;panel.classList.add?panel.classList.add('eh-player-docked'):panel.classList.toggle('eh-player-docked',true);host.closePanel?.();}
 on(drive,'click',dockPlayer);on(full,'click',()=>{if(local())panel.classList.toggle('eh-player-docked',false);});
 function close(reason=''){if(video){video.remove();video=null;}mount.replaceChildren();queue=null;panel.hidden=true;app.classList.remove('eh-music-open');if(reason)notice.textContent=reason;}
 function openQueue(id,index=0){if(!local())throw Error('This preview supports the local boat only.');const q=selectQueue(id,index),src=embedURL(id,index);
  host.stopOtherMusic();close();queue=q;title.textContent=q.name;fallback.href='https://www.youtube.com/watch?v='+q.tracks[0].id;
  video=el('iframe');video.title=q.name+' · YouTube player';video.src=src;video.width='480';video.height='270';video.allow='autoplay; encrypted-media; fullscreen';video.allowFullscreen=true;video.referrerPolicy='strict-origin-when-cross-origin';
  mount.append(video);panel.hidden=false;app.classList.toggle('eh-music-open',true);
  message.textContent='Queue loaded: '+q.tracks[0].title+'. Press Play in YouTube. Video stays visible; ads, sign-in and availability are controlled by YouTube.';
  notice.textContent='';closeButton.focus();return q;
 }
 on(closeButton,'click',()=>close());on(W,'pagehide',dispose);
 on(D,'visibilitychange',()=>{if(D.hidden)close('Music stopped while the app was hidden. Open Music to start it again.');});
 // A separate native player/local source must not continue underneath this one.
 const nativeMusicIds=new Set(['helm09-addmedia','helm09-localplay','helm09-next','helm09-prev','helm09-localfiles','s12-reopenmusic','s12-samplemusic']);
 const toolIds=new Set(['helm09-map','helm09-radio','helm09-boat','helm09-settings','helm10-weather','eh-help']);
 on(D,'click',e=>{let n=e.target;while(n&&n!==D){if(nativeMusicIds.has(n.id)){close();break;}if(toolIds.has(n.id)&&queue){panel.classList.toggle('eh-player-docked',true);break;}n=n.parentNode;}},true);
 on(W,'keydown',e=>{if(e.code==='Escape'&&queue){close();}});
 function update(){if(disposed)return;if(!local()){close();down.disabled=up.disabled=true;readout.textContent='Trim unavailable';return;}if(D.hidden)return;let s;try{s=host.read();}catch(_){s=null;}const t=trimState(s);down.disabled=!t.available||t.target<=0;up.disabled=!t.available||t.target>=1;const text=t.label;if(text!==last){readout.textContent=text;last=text;}trim.dataset.high=String(!!t.high);}
 const timer=host.setInterval(update,200);update();
 function dispose(){if(disposed)return;close();disposed=true;host.clearInterval(timer);handlers.forEach(([n,t,f,c])=>n.removeEventListener(t,f,c));handlers.length=0;owned.forEach(n=>n.remove());}
 return Object.freeze({presets,openQueue,close,dockPlayer,dispose,inspect:()=>({installed:!disposed,queue:queue?.id||null,iframeCount:video?1:0,tracks:queue?.tracks.length||0,automaticPlayback:false,spatialYouTube:false,physicsChanged:false,continuesDuringDriving:true,keepsVisibleDuringMenus:true})});
}
return Object.freeze({presets,selectQueue,embedURL,trimState,trimTarget,install});
});
