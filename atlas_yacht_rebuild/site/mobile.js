/* ATLAS mobile presentation/input. No vessel integration step or physics coefficients. */
(function(G){'use strict';
function holdChannel(send){
 const points=new Map();let serial=0;
 function apply(){let latest=null;for(const p of points.values())if(!latest||p.serial>latest.serial)latest=p;send(latest?latest.value:0);}
 return {press(id,value){if(!Number.isInteger(id)||!Number.isFinite(value))return;points.set(id,{value,serial:++serial});apply();},release(id){if(points.delete(id))apply();},clear(){points.clear();send(0);},count:()=>points.size};
}
function bindHold(button,channel,value){
 const end=e=>{channel.release(e.pointerId);button.classList.remove('held');};
 button.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();try{button.setPointerCapture(e.pointerId);}catch(_){return;}channel.press(e.pointerId,value);button.classList.add('held');});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);
 button.addEventListener('contextmenu',e=>e.preventDefault());
 // Space/Enter hold support is independent of pointer lifetime.
 button.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)channel.press(value<0?-101:-102,value);}});
 button.addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();channel.release(value<0?-101:-102);}});
 button.addEventListener('blur',()=>{channel.release(value<0?-101:-102);});
}
function mount(B){
 const $=id=>document.getElementById(id),media=matchMedia('(max-width:680px), (max-height:600px) and (pointer:coarse)'),nav=document.querySelector('.camera-nav');let active=null,lastTrigger=null;
 function close(returnFocus=true){document.querySelectorAll('.panel').forEach(p=>p.hidden=true);nav.classList.remove('mobile-open');document.body.classList.remove('sheet-open');active=null;for(const id of ['views-toggle','settings-toggle','chart-toggle','docking-toggle','m-docking'])$(id)?.setAttribute('aria-expanded','false');if(returnFocus)lastTrigger?.focus({preventScroll:true});}
 function open(id,trigger){if(active===id){close();return;}close(false);B.clearInputs();active=id;lastTrigger=trigger;document.body.classList.add('sheet-open');if(id==='views')nav.classList.add('mobile-open');else $(id).hidden=false;trigger?.setAttribute('aria-expanded','true');(id==='views'?nav:$(id)).querySelector('button')?.focus({preventScroll:true});}
 $('views-toggle').onclick=()=>open('views',$('views-toggle'));$('views-close').onclick=()=>close();
 for(const [trigger,id]of [['settings-toggle','settings'],['chart-toggle','chart'],['docking-toggle','docking'],['m-docking','docking']])$(trigger).onclick=()=>open(id,$(trigger));
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>close());
 nav.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>{if(media.matches)close();}));
 $('m-less').onclick=()=>B.setPower(Math.max(0,Math.round((B.read().port+B.read().starboard)*100)/2-5)/100);
 $('m-more').onclick=()=>B.setPower(Math.min(100,Math.round((B.read().port+B.read().starboard)*100)/2+5)/100);
 $('m-idle').onclick=()=>$('idle').click();
 const collapse=on=>{B.clearInputs();document.body.classList.toggle('helm-collapsed',on);$('m-open-controls').hidden=!on;$('m-collapse').setAttribute('aria-expanded',String(!on));B.layout();};
 $('m-collapse').onclick=()=>collapse(true);$('m-open-controls').onclick=()=>collapse(false);
 $('mobile-backdrop').onclick=()=>close();
 document.addEventListener('keydown',e=>{if(e.code==='Escape')close(false);if(e.code==='Tab'&&active&&media.matches){const root=active==='views'?nav:$(active),nodes=[...root.querySelectorAll('button,select,input,a,summary')].filter(x=>!x.disabled&&x.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 function resized(){B.clearInputs();close(false);document.body.classList.toggle('mobile-layout',media.matches);if(!media.matches){document.body.classList.remove('helm-collapsed');$('m-open-controls').hidden=true;}B.layout();}
 media.addEventListener('change',resized);window.addEventListener('orientationchange',()=>B.clearInputs());window.addEventListener('resize',()=>{B.clearInputs();B.layout();});
 const ro=new ResizeObserver(()=>B.layout());ro.observe($('helm'));ro.observe($('mobile-readouts'));resized();
 function sync(s){$('m-speed').textContent=s.speedKnots.toFixed(1);$('m-heading').textContent=$('heading').textContent;$('m-depth').textContent=s.depthM===null?'NO DATA':s.depthM.toFixed(0)+' m';$('pause').setAttribute('aria-label',s.paused?'Resume simulation':'Pause simulation');$('m-open-controls').textContent='Controls · '+s.speedKnots.toFixed(1)+' kn';$('power').setAttribute('aria-valuetext',Math.round((s.port+s.starboard)*50)+' percent');$('helm-input').setAttribute('aria-valuetext',$('rudder-value').textContent);}
 G.ATLAS83_MOBILE=Object.freeze({inspect:()=>({version:'mobile-1',enabled:media.matches,sheet:active,collapsed:document.body.classList.contains('helm-collapsed'),touchTargets:true})});
 return {sync,close};
}
G.AtlasMobile={holdChannel,bindHold,mount};if(typeof module!=='undefined')module.exports=G.AtlasMobile;
})(typeof window!=='undefined'?window:globalThis);
