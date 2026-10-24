/* Reuse the published sailing host unchanged; supply its one gunnery install with the verified avatar. */
(function(G){'use strict';
async function start(env){
 const {document,AtlasFleet,AtlasOperator,AtlasGunnery,ATLASRuntime}=env;
 const origin=new URL('.',document.currentScript?.src||env.location.href);
 let operatorAssets=null,operatorError=null;
 if(AtlasFleet.config.id==='warship'){
  document.getElementById('loading').querySelector('p').textContent='Loading your gunner and controls…';
  try{operatorAssets=await AtlasOperator.load(ATLASRuntime);}catch(e){operatorError=String(e.message||e);env.console.warn('Gunner unavailable:',operatorError);}
 }
 const install=AtlasGunnery.install;
 AtlasGunnery.install=(T,H)=>install(T,{...H,operatorAssets,operatorError});
 const host=document.createElement('script');host.src=new URL('host.js',origin).href;
 host.onerror=()=>{const loading=document.getElementById('loading');loading.hidden=false;loading.querySelector('p').textContent='The sailing host did not load. Reload to retry.';document.getElementById('retry').hidden=false;};
 document.body.append(host);
 return {operatorReady:!!operatorAssets,operatorError,hostURL:host.src};
}
if(typeof module!=='undefined')module.exports={start};else start(G).catch(e=>{console.error(e);const p=document.getElementById('loading');p.hidden=false;p.querySelector('p').textContent='Could not prepare the gunner view: '+String(e.message||e);document.getElementById('retry').hidden=false;});
})(globalThis);
