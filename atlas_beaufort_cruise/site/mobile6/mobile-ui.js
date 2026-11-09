/* Small receiver; native loop owns all input ticks. No polling/render loop. */
(()=>{'use strict';let retry,stopped=false;const until=performance.now()+90000;
function install(){if(stopped)return;if(!window.ATLAS_HARBOR4?.ready||!window.ATLAS_DEVICE_HELM?.ready){if(performance.now()<until)retry=setTimeout(install,120);return;}
 const C=AtlasMobile6,A=BAYPLAY,D=document,$=id=>D.getElementById(id),root=$('helm09'),touch=C.coarse(window),off=new AbortController();
 const local=()=>SEA09.bus.mode==='local',camera=ATLAS_HARBOR4.camera;
 let button=null,disposed=false;
 if(touch){
  // Mobile starts in stable chase. First person remains one tap away, not a second row.
  camera.select('chase');button=D.createElement('button');button.id='m6-compact-view';button.type='button';button.textContent='View';button.setAttribute('aria-label','Switch first and third person');
  button.addEventListener('click',()=>{if(!local())return;if(camera.isFree())camera.select('chase');else if(camera.inspect().mode==='first')camera.select('chase');else camera.select('first');$('scene').focus({preventScroll:true});},{signal:off.signal});$('d2-header').insertBefore(button,$('d2-menu'));
  if(SEA14.options.graphics==='auto')A.renderer.setPixelRatio(Math.min(A.renderer.getPixelRatio(),.8));
 }
 const old=SEA10.renderPanel;
 function panel(kind,body){const result=old.call(this,kind,body);if(kind==='g3-view'||kind==='g3-help'){
  const note=D.createElement('p');note.id='m6-assist-note';note.textContent='Touch driving: touch then drag to steer; turns are gentler at speed. Drag the power lever to adjust it without tap-jumps. Idle cuts power, not momentum. A long frame stall pauses the boat rather than jumping ahead.';body.append(note);
  if(touch){const b=D.createElement('button');b.type='button';b.textContent='Lock behind boat';b.addEventListener('click',()=>{if(!b.isConnected||!local())return;camera.select('chase');$('helm09-close').click();},{signal:off.signal});body.append(b);}
 }return result;}
 SEA10.renderPanel=panel;
 // A resize invalidates gesture anchors, including split-screen/orientation changes.
 const cancel=()=>ATLAS_DEVICE_HELM.cancelInput?.();addEventListener('resize',cancel,{signal:off.signal});
 const api={ready:true,version:6,touch,inspect:()=>({touch,frameHoldSeconds:.2,fullSpeedPreserved:true,browserVerified:false}),dispose(){if(disposed)return;disposed=true;stopped=true;cancel();off.abort();button?.remove();if(SEA10.renderPanel===panel)SEA10.renderPanel=old;}};
 window.ATLAS_MOBILE6=api;addEventListener('pagehide',()=>api.dispose(),{once:true});
 document.title='ATLAS · Beaufort Mobile Driving 6';
}
addEventListener('pagehide',()=>{stopped=true;clearTimeout(retry);},{once:true});install();})();
