/* Explicit receiver for Clean Helm 2; keyboard ticks only inside the native loop. */
(()=>{'use strict';let pending,stopped=false;const deadline=performance.now()+120000;
function install(){if(stopped)return;if(!window.ATLAS_DEVICE_HELM?.ready){if(performance.now()<deadline)pending=setTimeout(install,120);return;}
 if(window.ATLAS_HELM_KEYS)return;
 const A=BAYPLAY,S=A.state,D=document,$=id=>D.getElementById(id),root=$('helm09'),scene=$('scene');scene.tabIndex=0;
 const local=()=>!stopped&&SEA09.bus.mode==='local';
 const keys=AtlasHelmInput.install({window,document,local,focus:()=>D.activeElement,blocked:()=>!!window.ATLAS_HARBOR4?.camera.isFree()||D.hidden||A.isPaused()||A.mode()!=='drive'||!$('helm09-panel').hidden||root.classList.contains('photo14')||!!D.querySelector('dialog[open]'),read:()=>S,docking:()=>SEA11.options.docking,pointerHeld:()=>ATLAS_DEVICE_HELM.inspect().pointerHeld,dispatch:(k,v)=>SEA09.bus.dispatch(k,v)});
 window.ATLAS_HELM_KEYS=keys;
 const close=()=>{if(!$('helm09-panel').hidden)$('helm09-close').click();root.classList.remove('s14-tools-open','s11-panel-open','d2-panel-open');scene.focus({preventScroll:true});};
 const menu=installBeaufortMenu3({document:D,local,panels:SEA10,clearKeys:()=>keys.clear(),open:k=>SEA09.openPanel(k),close,map:()=>SEA09.toggleMap(),docking:()=>SEA11.options.docking,setDocking:v=>SEA11.setOption('docking',v),graphics:()=>SEA14.options.graphics,setGraphics:v=>SEA14.graphics(v),view:v=>SEA09.view(v)});
 const off=new AbortController();$('helm09-close').addEventListener('click',()=>scene.focus({preventScroll:true}),{signal:off.signal});$('eh-drive-music')?.addEventListener('click',()=>scene.focus({preventScroll:true}),{signal:off.signal});
 document.title='ATLAS · Beaufort Harbor Life Preview';
 window.ATLAS_GAME3={ready:true,version:3,inspect:()=>({version:3,keyboardKeys:[...keys.keys],countryQueues:ATLAS_BEAUFORT_CRUISE.music.presets.length,menu:'six-section-dashboard',land:'distance-filtered-material-detail',physics:'yaw-consistent-buoyancy-samples',browserVerified:false}),dispose(){if(stopped)return;stopped=true;keys.dispose();menu.dispose();off.abort();if(window.ATLAS_HELM_KEYS===keys)delete window.ATLAS_HELM_KEYS;}};
}
addEventListener('pagehide',()=>{clearTimeout(pending);window.ATLAS_GAME3?.dispose();stopped=true;},{once:true});install();})();
