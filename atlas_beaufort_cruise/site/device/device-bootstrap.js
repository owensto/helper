/* Explicit standalone Beaufort Cruise adapter. Does not activate a shared room. */
(()=>{'use strict';let wait=null,stopped=false;const deadline=performance.now()+120000;
function install(){if(stopped)return;if(!window.ATLAS_BEAUFORT_CRUISE?.ready){if(performance.now()<deadline)wait=setTimeout(install,150);return;}
 const A=BAYPLAY,S=A.state,$=id=>document.getElementById(id),root=$('helm09');
 try{installAtlasDeviceHelm({document,window,isLocal:()=>!stopped&&SEA09.bus.mode==='local',read:()=>S,paused:()=>A.isPaused(),held:v=>window.ATLAS_TOUCH_STEERING=v,dispatch:(k,v)=>SEA09.bus.dispatch(k,v),now:()=>performance.now(),setInterval:(f,ms)=>setInterval(f,ms),clearInterval:n=>clearInterval(n),
  docking:()=>SEA11.options.docking,setDocking:v=>SEA11.setOption('docking',v),feet:()=>SEA11.options.feet,
  syncRig:()=>{CMD.syncRig();CMD.fill(S.config);A.refresh();},rigLabel:()=>S.config.count+' × '+S.config.hp+' hp · modeled',
  openPanel:k=>SEA09.openPanel(k),closePanel:()=>{if(!$('helm09-panel').hidden)$('helm09-close').click();root.classList.remove('s11-panel-open','s14-tools-open');},toggleMap:()=>SEA09.toggleMap(),panels:SEA10,
  view:k=>SEA09.view(k),photo:()=>root.classList.contains('photo14'),graphics:()=>SEA14.options.graphics,setGraphics:v=>SEA14.graphics(v),
  musicPrefs:()=>({output:ATLAS_RADIO.outputMode==='cockpit'?'boat':'computer',keep:!ATLAS_RADIO.followPause}),
  setMusicOutput:v=>{const e=$('eh-speaker-output');e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));},setMusicKeep:v=>{const e=$('eh-keep-music');e.checked=v;e.dispatchEvent(new Event('change',{bubbles:true}));},
  radio:()=>ATLAS_RADIO.inspect(),providerActive:()=>!!ATLAS_BEAUFORT_CRUISE.music.inspect().queue||!!SEA09.providerVisible(),
  telemetry:()=>({fps:window.SEA_TIMING?.emaFrameMs>0?1000/SEA_TIMING.emaFrameMs:null})
 });document.title='ATLAS · Beaufort Clean Helm';}catch(e){console.error('Clean Helm could not install; original controls retained.',e);}
}
addEventListener('pagehide',()=>{stopped=true;clearTimeout(wait);});install();})();
