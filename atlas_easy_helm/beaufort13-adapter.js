/* Explicit standalone review adapter; no automatic CORE14/shared-room adoption. */
(()=>{'use strict';let retry=null,stopped=false;const deadline=performance.now()+60000;
function install(){if(stopped)return;if(!window.SEA13?.ready){if(performance.now()<deadline)retry=setTimeout(install,150);else console.warn('Easy Helm: compatible Beaufort13 did not become ready.');return;}
try{const A=BAYPLAY;window.installAtlasEasyHelm({document,storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},
 mobile:()=>matchMedia('(max-width:900px)').matches,isLocal:()=>SEA13.inspect().multiplayer===false&&SEA12.inspect().multiplayer===false,
 read:()=>A.state,depth:()=>Sea09World.inspect(A.state),options:()=>SEA11.options,
 dispatch:(kind,value)=>SEA09.bus.dispatch(kind,value),pause:value=>A.setPaused(value),panel:kind=>SEA09.openPanel(kind),
 weather:name=>SEA10.chooseWeather(name),option:(name,value)=>SEA11.setOption(name,value),view:name=>SEA09.view(name),panelOwner:SEA10,
 setInterval:(fn,ms)=>setInterval(fn,ms),clearInterval:id=>clearInterval(id)});
}catch(e){console.error('Easy Helm was not installed: '+e.message);}}
addEventListener('pagehide',()=>{stopped=true;if(retry!==null)clearTimeout(retry);});install();})();
