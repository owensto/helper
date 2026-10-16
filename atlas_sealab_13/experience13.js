/* Beaufort-first product pass. No experimental human/station/network integration. */
(()=>{'use strict';const $=id=>document.getElementById(id);let done=false;
function install(){if(!window.SEA12?.ready||!BayGeo.ready||!SEA12_GEO.inspect().ready)return setTimeout(install,100);if(done)return;done=true;
 const A=BAYPLAY,S=A.state;const forced=new URL(location.href).searchParams.get('area');
 if(forced==='basin')SEA09.relocate('basin');else{const[x,z]=BayGeo.spawn('waterfront');const q=Sea09World.sample(x,z,'beaufort');if(!q.known||q.land||q.depth<1.2)throw Error('Default launch is not in known navigable-depth water');SEA09.relocate('beaufort',x,z,.25);}
 A.setPaused(false);SEA09.view('follow');document.title='ATLAS Sea Lab 13 · Beaufort River';document.querySelector('.h09-brand').innerHTML='ATLAS<span>BEAUFORT RIVER · 13</span>';
 const old=SEA10.renderPanel.bind(SEA10);SEA10.renderPanel=(kind,body)=>{const result=old(kind,body);if(kind==='settings'){const note=document.createElement('p');note.className='h09-note';note.textContent='Beaufort is the default launch. Shoreline and footprints are mapped; vegetation, facades and heights are illustrative. Seabed and depth-chart textures prepare in the background.';body.prepend(note);const b=document.createElement('button');b.id='s13-return-beaufort';b.textContent='Return to Beaufort waterfront';b.onclick=()=>{SEA09.relocate('beaufort',...BayGeo.spawn('waterfront'),.25);$('helm09-close').click();A.setPaused(false);SEA09.view('follow');};body.prepend(b);}return result;};
 $('s11-notice').textContent='Beaufort waterfront · Turn the key, select Forward, then add power.';
 const prev=SEA06.beforeRender.bind(SEA06);SEA06.beforeRender=()=>{prev();const w=SEA09_WATER.inspect();const el=$('sea13-loading');if(el&&(w.terrainRebuilds>0&&!w.visualTilePending||forced==='basin'))el.hidden=true;};
 window.SEA13={ready:true,inspect:()=>({version:13,ready:true,location:S.location,defaultLocation:'beaufort',stream:SEA13_STREAM.inspect(),scenery:{...Sea13Scenery.status},hullMask:SEA06.inspect().hullWaterline13,water:SEA09_WATER.inspect(),multiplayer:false,experimentalHuman:false})};
 setTimeout(()=>{const e=$('sea13-loading');if(e&&!e.hidden){e.hidden=true;$('s11-notice').textContent='Beaufort is ready; seabed detail is still preparing. Depth instruments remain available.';}},12000);
}
install();})();
